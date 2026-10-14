#!/usr/bin/env node
/**
 * build-demo.js — inject public/styles.css into demo/index.html.
 *
 * Why this exists: the demo is a single self-contained file, so the app's
 * stylesheet has to be *copied* into it. That copy used to be maintained by
 * hand, and the two drifted (20187 bytes in the demo vs 16906 in public/).
 * Now that the stylesheet embeds a base64 webfont, hand-syncing is hopeless.
 *
 * Only the FIRST <style> block is touched. The demo contains two more <style>
 * blocks that belong to the embedded *sample artifacts* (a dark landing page
 * and a Georgia report) — those are demo content, not app chrome, and
 * rewriting them would corrupt the samples the classifier is demonstrating.
 *
 * It also guarantees the standalone-document wrapper. A bare <style> at the
 * top of a file leaves it a fragment: the browser infers <head>, the viewport
 * meta is never parsed, and the mobile layout silently never engages.
 *
 * Usage: node scripts/build-demo.js [--check]
 *   --check  verify the demo is in sync; exit 1 if not (no writes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = path.join(root, 'public', 'styles.css');
const DEMO = path.join(root, 'demo', 'index.html');
const check = process.argv.includes('--check');

const TITLE = 'Van-Chopped — Prompt &amp; HTML Artifact Repo';
const HEAD = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${TITLE}</title>
</head>
<body>
`;

const css = fs.readFileSync(CSS, 'utf8');
let html = fs.readFileSync(DEMO, 'utf8');
const before = html;

// A stylesheet can't contain "</style>" and a <script> body can't contain an
// unescaped "</script>" — either one ends the block early and silently breaks
// the page. Fail loudly rather than emit a corrupt demo.
if (/<\/style>/i.test(css)) {
  console.error('ERROR: public/styles.css contains "</style>" — cannot inline.');
  process.exit(1);
}

// 1. normalise the standalone-document wrapper
const openTag = html.indexOf('<style>');
if (openTag === -1) {
  console.error('ERROR: no <style> block found in demo/index.html.');
  process.exit(1);
}
let head = html.slice(0, openTag);
let rest = html.slice(openTag);
if (!/^\s*<!doctype/i.test(head)) {
  head = HEAD;                                   // was a bare fragment
} else if (!/name="viewport"/i.test(head)) {
  head = head.replace(/<\/head>/i,
    '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n</head>');
}
html = head + rest;

// 2. replace ONLY the first <style> block
const first = html.indexOf('<style>');
const end = html.indexOf('</style>', first);
if (end === -1) {
  console.error('ERROR: unterminated first <style> block.');
  process.exit(1);
}
html = html.slice(0, first) + '<style>\n' + css.trim() + '\n' + html.slice(end);

// 3. make sure the document is closed
if (!/<\/html>\s*$/i.test(html)) {
  html = html.replace(/\s*$/, '\n</body>\n</html>\n');
}

const styleBlocks = (html.match(/<style>/g) || []).length;
const viewports = (html.match(/name="viewport"/g) || []).length;

if (check) {
  if (html !== before) {
    console.error('demo/index.html is OUT OF SYNC with public/styles.css — run: node scripts/build-demo.js');
    process.exit(1);
  }
  console.log(`demo/index.html in sync (${styleBlocks} style blocks, ${viewports} viewport meta)`);
  process.exit(0);
}

fs.writeFileSync(DEMO, html);
console.log(`built demo/index.html  ${(html.length / 1024).toFixed(1)} KB`);
console.log(`  inlined public/styles.css (${(css.length / 1024).toFixed(1)} KB)`);
console.log(`  style blocks: ${styleBlocks} (1 app chrome + 2 sample artifacts)`);
console.log(`  viewport meta: ${viewports}`);
