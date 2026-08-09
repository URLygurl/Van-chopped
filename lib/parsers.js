// Stage 3 (dispatch): turn a file's path + contents into a uniform record.
// All parsers return { name, description, content, frontmatter, tags, ... }.

import path from 'node:path';
import { parseFrontmatter, firstHeading } from './frontmatter.js';
import { classifyHtml } from './classify-html.js';

const IGNORED_MD = new Set([
  'readme.md', 'readme', 'license.md', 'license', 'changelog.md',
  'contributing.md', 'code_of_conduct.md', 'security.md',
]);
// Names that indicate a config/meta file rather than a prompt (Chops-style).
const CONFIG_MD = new Set(['claude.md', 'agents.md', 'global_rules.md']);

/** Parse frontmatter `tags`/`keywords` into a clean string array. */
export function extractTags(frontmatter) {
  const raw = frontmatter.tags ?? frontmatter.keywords ?? frontmatter.tag ?? '';
  if (!raw) return [];
  return String(raw)
    .replace(/^\[|\]$/g, '')
    .split(/[,;]/)
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

/** Decide whether a loose markdown/text file counts as a prompt. */
export function isPromptCandidate(filePath, { requireFrontmatter = false, hasFrontmatter = false } = {}) {
  const base = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();
  if (IGNORED_MD.has(base) || CONFIG_MD.has(base)) return false;
  if (ext === '.prompt') return true;
  if (base.endsWith('.prompt.md')) return true;
  if (!['.md', '.mdc', '.markdown', '.txt'].includes(ext)) return false;
  if (/(^|[\/\\._-])prompts?([\/\\._-]|$)/i.test(filePath)) return true;
  if (requireFrontmatter) return hasFrontmatter;
  return true;
}

/** Prompts, and (via kind) skills / agents / rules — all frontmatter-based. */
export function parseMarkdown(filePath, content, { type = 'prompt' } = {}) {
  const parsed = parseFrontmatter(content);
  let name = parsed.name || firstHeading(content) ||
    path.basename(filePath).replace(/\.(prompt\.md|prompt|mdc|md|markdown|txt)$/i, '');
  // For directory skills/agents named SKILL.md/AGENTS.md, prefer the folder name.
  const base = path.basename(filePath).toLowerCase();
  if ((base === 'skill.md' || base === 'agents.md') && !parsed.name) {
    name = path.basename(path.dirname(filePath));
  }
  return {
    type,
    subtype: parsed.hasFrontmatter ? 'frontmatter' : 'plain',
    name,
    description: parsed.description,
    content,
    frontmatter: parsed.frontmatter,
    tags: extractTags(parsed.frontmatter),
    editableFields: true,               // frontmatter can be rewritten
    classification: null,
    readOnly: false,
  };
}

/** JSX / TSX React components. */
export function parseComponent(filePath, content) {
  const fileName = path.basename(filePath).replace(/\.(jsx|tsx)$/i, '');
  const name =
    match(content, /export\s+default\s+function\s+([A-Za-z0-9_]+)/) ||
    match(content, /export\s+function\s+([A-Za-z0-9_]+)/) ||
    match(content, /export\s+default\s+class\s+([A-Za-z0-9_]+)/) ||
    match(content, /(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]+)\s*[:=]/) ||
    fileName;

  // description ← leading JSDoc / line comment
  let description = '';
  const jsdoc = content.match(/\/\*\*([\s\S]*?)\*\//);
  if (jsdoc) {
    description = jsdoc[1].split('\n').map((l) => l.replace(/^\s*\*?\s?/, '').trim())
      .filter(Boolean).find((l) => !l.startsWith('@')) || '';
  }
  if (!description) description = match(content, /^\s*\/\/\s?(.+)$/m) || '';

  // lightweight "frontmatter": exported prop names, hooks used, import count
  const hooks = [...content.matchAll(/\buse[A-Z][A-Za-z0-9]+/g)].map((m) => m[0]);
  const frontmatter = {
    ext: path.extname(filePath).slice(1),
    hooks: [...new Set(hooks)].join(', '),
    imports: String((content.match(/^\s*import\s/gm) || []).length),
    lines: String(content.split('\n').length),
  };

  return {
    type: 'component',
    subtype: path.extname(filePath).slice(1).toLowerCase(), // jsx | tsx
    name,
    description,
    content,
    frontmatter,
    tags: [],
    editableFields: false,
    classification: null,
    readOnly: false,
  };
}

export function parseHtml(filePath, content, { hasManifest } = {}) {
  const title = matchOne(content, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = matchOne(content, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const metaDesc =
    matchAttr(content, /<meta[^>]+name=["']description["'][^>]*>/i, 'content') ||
    matchAttr(content, /<meta[^>]+property=["']og:description["'][^>]*>/i, 'content');
  const ogTitle = matchAttr(content, /<meta[^>]+property=["']og:title["'][^>]*>/i, 'content');

  const frontmatter = {};
  const metaRe = /<meta\b[^>]*>/gi;
  let m;
  while ((m = metaRe.exec(content))) {
    const key = attr(m[0], 'name') || attr(m[0], 'property') || attr(m[0], 'http-equiv');
    const val = attr(m[0], 'content');
    if (key && val != null) frontmatter[key] = val;
  }
  const lang = matchAttr(content, /<html[^>]*>/i, 'lang');
  if (lang) frontmatter.lang = lang;

  const fileName = path.basename(filePath).replace(/\.html?$/i, '');
  const name = firstClean([title, ogTitle, h1].map(clean)) || fileName;
  const description = clean(metaDesc) || firstTextSnippet(content);
  const classification = classifyHtml({ filePath, content, hasManifest });
  const keywords = frontmatter.keywords ? extractTags({ tags: frontmatter.keywords }) : [];

  return {
    type: 'html',
    subtype: classification.class, // 'document' | 'embedded'
    name,
    description,
    content,
    frontmatter,
    tags: keywords,
    editableFields: false,
    classification,
    readOnly: classification.class === 'embedded',
  };
}

// --- tiny helpers (no dependency) --------------------------------------------
function match(text, re) { const m = text.match(re); return m ? m[1] : ''; }
function matchOne(text, re) { const m = text.match(re); return m ? m[1] : ''; }
function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', 'i'));
  return m ? m[1] : null;
}
function matchAttr(text, tagRe, name) { const m = text.match(tagRe); return m ? attr(m[0], name) : null; }
function clean(s) { return s ? s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : ''; }
function firstClean(list) {
  const tpl = (s) => /\{\{|\}\}|\{%|%\}|<%|%>/.test(s);
  return list.find((s) => s && !tpl(s)) || '';
}
function firstTextSnippet(html) {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const src = body ? body[1] : html;
  return src.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}
