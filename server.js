#!/usr/bin/env node
// Stage 6 (backend): zero-dependency HTTP server wiring the pipeline together.
//   scan -> serve list/detail -> edit writes back to disk -> watcher re-scans.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, saveConfig } from './lib/sources.js';
import { scan, idFor } from './lib/scanner.js';
import { Watcher } from './lib/watcher.js';
import { Collections } from './lib/collections.js';
import { parseFrontmatter, serializeWithFrontmatter } from './lib/frontmatter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 4600;

let config = loadConfig();
let state = { artifacts: [], scanned: 0, roots: [], errors: [], scannedAt: 0 };
const sseClients = new Set();

function rescan() {
  const t = Date.now();
  const res = scan(config.scanPaths, config.options);
  state = { ...res, scannedAt: Date.now(), tookMs: Date.now() - t };
  broadcast({ type: 'rescan', count: state.artifacts.length, scannedAt: state.scannedAt });
  return state;
}
function broadcast(obj) {
  const line = `data: ${JSON.stringify(obj)}\n\n`;
  for (const c of sseClients) { try { c.write(line); } catch {} }
}
const watcher = new Watcher(() => rescan(), { debounceMs: 500 });

// --- helpers -----------------------------------------------------------------
const send = (res, code, body, headers = {}) => {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(data);
};
const readBody = (req) => new Promise((resolve) => {
  let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => resolve(d));
});
const findById = (id) => state.artifacts.find((a) => a.id === id);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) return send(res, 404, { error: 'not found' });
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

// --- routes ------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    // ---- collections ----
    if (p === '/api/collections' && req.method === 'GET') return send(res, 200, { collections: Collections.all() });
    if (p === '/api/collections' && req.method === 'POST') {
      const { name } = JSON.parse((await readBody(req)) || '{}');
      return send(res, 200, Collections.create(name));
    }
    if (p.startsWith('/api/collections/') && p.endsWith('/toggle') && req.method === 'POST') {
      const id = p.split('/')[3];
      const { artifactId } = JSON.parse((await readBody(req)) || '{}');
      return send(res, 200, Collections.toggle(id, artifactId) || { error: 'not found' });
    }
    if (p.startsWith('/api/collections/') && req.method === 'PUT') {
      const id = p.split('/')[3];
      const { name } = JSON.parse((await readBody(req)) || '{}');
      return send(res, 200, Collections.rename(id, name) || { error: 'not found' });
    }
    if (p.startsWith('/api/collections/') && req.method === 'DELETE') {
      Collections.remove(p.split('/')[3]); return send(res, 200, { ok: true });
    }

    // ---- artifacts ----
    if (p === '/api/artifacts' && req.method === 'GET') {
      const type = url.searchParams.get('type');
      const cls = url.searchParams.get('class');
      const tag = url.searchParams.get('tag');
      const coll = url.searchParams.get('collection');
      const q = (url.searchParams.get('q') || '').toLowerCase();
      let items = state.artifacts.map(stripContent);
      if (type) items = items.filter((a) => a.type === type);
      if (cls) items = items.filter((a) => a.subtype === cls);
      if (tag) items = items.filter((a) => (a.tags || []).includes(tag));
      if (coll) {
        const c = Collections.all().find((x) => x.id === coll);
        const set = new Set(c ? c.memberIds : []);
        items = items.filter((a) => set.has(a.id));
      }
      if (q) items = items.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        a.path.toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q)));
      return send(res, 200, {
        items,
        meta: { total: state.artifacts.length, scanned: state.scanned, roots: state.roots,
                errors: state.errors, scannedAt: state.scannedAt, tookMs: state.tookMs,
                counts: counts(), tags: allTags(), collections: Collections.all() },
      });
    }

    if (p.startsWith('/api/artifacts/') && req.method === 'GET') {
      const a = findById(decodeURIComponent(p.split('/').pop()));
      if (!a) return send(res, 404, { error: 'not found' });
      return send(res, 200, a);
    }

    if (p.startsWith('/api/artifacts/') && req.method === 'PUT') {
      const a = findById(decodeURIComponent(p.split('/').pop()));
      if (!a) return send(res, 404, { error: 'not found' });
      if (a.readOnly) return send(res, 403, { error: 'artifact is read-only (embedded in software)' });
      const body = JSON.parse((await readBody(req)) || '{}');

      if (body.frontmatter && typeof body.frontmatter === 'object') {
        // Editable fields/tags: rewrite frontmatter, keep the body.
        if (!a.editableFields) return send(res, 400, { error: 'this type has no editable frontmatter' });
        const current = fs.readFileSync(a.path, 'utf8');
        const parsed = parseFrontmatter(current);
        const next = serializeWithFrontmatter(body.frontmatter, parsed.content);
        fs.writeFileSync(a.path, next, 'utf8');
        rescan();
        return send(res, 200, { ok: true });
      }
      if (typeof body.content === 'string') {
        fs.writeFileSync(a.path, body.content, 'utf8'); // write back to source
        rescan();
        return send(res, 200, { ok: true });
      }
      return send(res, 400, { error: 'content or frontmatter required' });
    }

    if (p === '/api/raw' && req.method === 'GET') {
      const a = findById(url.searchParams.get('id'));
      if (!a) return send(res, 404, { error: 'not found' });
      res.writeHead(200, { 'Content-Type': a.type === 'html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8' });
      return res.end(a.content);
    }

    if (p === '/api/config' && req.method === 'GET') return send(res, 200, config);
    if (p === '/api/config' && req.method === 'PUT') {
      const body = JSON.parse((await readBody(req)) || '{}');
      config = saveConfig({
        scanPaths: body.scanPaths ?? config.scanPaths,
        options: { ...config.options, ...(body.options || {}) },
      });
      watcher.watch(config.scanPaths);
      rescan();
      return send(res, 200, config);
    }

    if (p === '/api/rescan' && req.method === 'POST') { rescan(); return send(res, 200, { ok: true, count: state.artifacts.length }); }

    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'hello', count: state.artifacts.length })}\n\n`);
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    return serveStatic(res, p);
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
});

function stripContent(a) { const { content, ...rest } = a; return { ...rest, contentLength: content.length }; }
function counts() {
  const c = { prompt: 0, htmlDocument: 0, htmlEmbedded: 0, component: 0, skill: 0, agent: 0, rule: 0 };
  for (const a of state.artifacts) {
    if (a.type === 'html') c[a.subtype === 'document' ? 'htmlDocument' : 'htmlEmbedded']++;
    else if (c[a.type] !== undefined) c[a.type]++;
  }
  return c;
}
function allTags() {
  const m = new Map();
  for (const a of state.artifacts) for (const t of a.tags || []) m.set(t, (m.get(t) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({ tag, n }));
}

rescan();
watcher.watch(config.scanPaths);
server.listen(PORT, () => {
  console.log(`\n  Artifact Repo running →  http://localhost:${PORT}`);
  console.log(`  Scanning: ${config.scanPaths.join(', ')}`);
  console.log(`  Found ${state.artifacts.length} artifacts (${state.tookMs}ms)\n`);
});
