// Stage 2: WALK the directories + Stage 4: dedup into records.
// Discovers skills, agents, rules (Chops-style), prompts, html, and jsx/tsx
// components across global tool dirs, configured folders, and project probes.

import fs from 'node:fs';
import path from 'node:path';
import { isPromptCandidate, parseMarkdown, parseComponent, parseHtml } from './parsers.js';
import { _internals } from './classify-html.js';
import { expandHome } from './sources.js';
import { GLOBAL_SOURCES, PROJECT_PROBES, toolFromPath, kindFromPath } from './tool-sources.js';

const HTML_EXT = new Set(['.html', '.htm']);
const COMPONENT_EXT = new Set(['.jsx', '.tsx']);
const MD_EXT = new Set(['.md', '.mdc', '.markdown', '.txt', '.prompt']);

export function idFor(realPath) { return Buffer.from(realPath).toString('base64url'); }

export function scan(scanPaths, options) {
  const opts = options || {};
  const skip = new Set(opts.skipDirs || []);
  const maxDepth = opts.maxDepth ?? 8;
  const maxBytes = opts.maxFileBytes ?? 2_000_000;
  const on = (k, d = true) => (opts[k] === undefined ? d : opts[k]);

  const byRealPath = new Map();
  const manifestCache = new Map();
  const errors = [];
  let scanned = 0;

  const hasManifest = (dir) => {
    if (manifestCache.has(dir)) return manifestCache.get(dir);
    let found = false;
    for (const mf of _internals.PROJECT_MANIFESTS) {
      if (fs.existsSync(path.join(dir, mf))) { found = true; break; }
    }
    manifestCache.set(dir, found);
    return found;
  };

  const add = (record, fullPath) => {
    let realPath, stat;
    try { realPath = fs.realpathSync(fullPath); stat = fs.statSync(fullPath); }
    catch { return; }
    const meta = {
      id: idFor(realPath), path: fullPath, realPath,
      ext: path.extname(fullPath).toLowerCase(), size: stat.size, mtime: stat.mtimeMs,
    };
    const tool = toolFromPath(fullPath);
    const existing = byRealPath.get(realPath);
    if (existing) {
      if (!existing.installedPaths.includes(fullPath)) existing.installedPaths.push(fullPath);
      if (tool && !existing.toolSources.includes(tool)) existing.toolSources.push(tool);
      return;
    }
    byRealPath.set(realPath, {
      ...record, ...meta,
      installedPaths: [fullPath],
      toolSources: tool ? [tool] : [],
    });
  };

  // Read a file, guard size, return content or null.
  const read = (full) => {
    try {
      const stat = fs.statSync(full);
      if (stat.size > maxBytes) return null;
      return fs.readFileSync(full, 'utf8');
    } catch (e) { errors.push(`${full}: ${e.code || e.message}`); return null; }
  };

  // Classify a single directory: is it a skill/agent folder? returns true if consumed.
  const tryDirArtifact = (dir, forcedKind) => {
    const skillFile = path.join(dir, 'SKILL.md');
    const agentsFile = path.join(dir, 'AGENTS.md');
    if (fs.existsSync(skillFile)) {
      const c = read(skillFile); if (c == null) return true;
      add(parseMarkdown(skillFile, c, { type: 'skill' }), skillFile); return true;
    }
    if (fs.existsSync(agentsFile)) {
      const c = read(agentsFile); if (c == null) return true;
      add(parseMarkdown(agentsFile, c, { type: forcedKind === 'skill' ? 'skill' : 'agent' }), agentsFile);
      return true;
    }
    return false;
  };

  // Classify a single file by extension + path context.
  const classifyFile = (full, ctxKind) => {
    const ext = path.extname(full).toLowerCase();
    const base = path.basename(full).toLowerCase();
    if (base === 'skill.md' || base === 'agents.md') return; // handled at dir level

    if (HTML_EXT.has(ext)) {
      if (!on('includeHtml')) return;
      const c = read(full); if (c == null) return;
      scanned++; add(parseHtml(full, c, { hasManifest }), full); return;
    }
    if (COMPONENT_EXT.has(ext)) {
      if (!on('includeComponents')) return;
      const c = read(full); if (c == null) return;
      scanned++; add(parseComponent(full, c), full); return;
    }
    if (MD_EXT.has(ext) || full.toLowerCase().endsWith('.prompt.md')) {
      const c = read(full); if (c == null) return;
      const hasFm = c.trimStart().startsWith('---');
      // decide kind: explicit context (from a tool dir) wins, else infer from path
      const kind = ctxKind || kindFromPath(full);
      if (kind === 'skill' || kind === 'agent' || kind === 'rule') {
        if (kind === 'skill' && !on('includeSkills')) return;
        if (kind === 'agent' && !on('includeAgents')) return;
        if (kind === 'rule' && !on('includeRules')) return;
        scanned++; add(parseMarkdown(full, c, { type: kind }), full); return;
      }
      if (!on('includePrompts')) return;
      if (!isPromptCandidate(full, { requireFrontmatter: opts.requirePromptFrontmatter, hasFrontmatter: hasFm })) return;
      scanned++; add(parseMarkdown(full, c, { type: 'prompt' }), full);
    }
  };

  // Generic recursive walk of an arbitrary directory.
  const walk = (dir, depth, ctxKind) => {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (e) { errors.push(`${dir}: ${e.code || e.message}`); return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      let isDir = entry.isDirectory(), isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try { const st = fs.statSync(full); isDir = st.isDirectory(); isFile = st.isFile(); }
        catch { continue; }
      }
      if (isDir) {
        if (skip.has(entry.name)) continue;
        // a SKILL.md/AGENTS.md folder is an artifact; don't descend into it
        if (tryDirArtifact(full, ctxKind)) continue;
        walk(full, depth + 1, ctxKind);
      } else if (isFile) {
        classifyFile(full, ctxKind);
      }
    }
  };

  // 1) Global tool source dirs (skills / agents / rules).
  for (const src of GLOBAL_SOURCES) {
    if (src.kind === 'skill' && !on('includeSkills')) continue;
    if (src.kind === 'agent' && !on('includeAgents')) continue;
    if (src.kind === 'rule'  && !on('includeRules'))  continue;
    if (fs.existsSync(src.dir)) walk(src.dir, 0, src.kind);
  }

  // 2) Configured scan roots (generic) + 3) project probes inside them.
  const roots = [...new Set(scanPaths.map(expandHome))];
  for (const root of roots) {
    let st; try { st = fs.statSync(root); } catch (e) { errors.push(`${root}: ${e.code || e.message}`); continue; }
    if (st.isFile()) { classifyFile(root, null); continue; }
    if (!st.isDirectory()) continue;

    // project probes: for each immediate subdir, look for .claude/skills etc.
    let subs = [];
    try { subs = fs.readdirSync(root, { withFileTypes: true }); } catch {}
    for (const sub of subs) {
      if (!sub.isDirectory() || skip.has(sub.name)) continue;
      for (const probe of PROJECT_PROBES) {
        if (probe.kind === 'skill' && !on('includeSkills')) continue;
        if (probe.kind === 'agent' && !on('includeAgents')) continue;
        if (probe.kind === 'rule'  && !on('includeRules'))  continue;
        const probeDir = path.join(root, sub.name, probe.subpath);
        if (fs.existsSync(probeDir)) walk(probeDir, 0, probe.kind);
      }
    }
    walk(root, 0, null);
  }

  return {
    artifacts: [...byRealPath.values()].sort((a, b) => a.name.localeCompare(b.name)),
    scanned, roots, errors,
  };
}
