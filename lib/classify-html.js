// Stage 3 (part 2): the HTML qualifier.
//
// Every discovered .html/.htm file is classified as either:
//   - "document" : a standalone HTML deliverable (report, landing page, artifact)
//   - "embedded" : HTML that lives *within other software* (framework templates,
//                  build output, vendored libs, component fragments)
//
// We score path signals + content signals, then classify with reasons so the
// verdict is transparent and tunable.

import path from 'node:path';

// Directory names that almost always mean "generated / vendored / inside software".
const EMBEDDED_DIR_SEGMENTS = new Set([
  'node_modules', 'bower_components', 'vendor', 'vendors',
  'dist', 'build', 'out', 'output', 'public/build',
  '.next', '.nuxt', '.output', '.svelte-kit', '.astro', '.cache', '.parcel-cache',
  'coverage', 'storybook-static', 'elm-stuff',
  '__pycache__', 'site-packages', '.venv', 'venv', 'env',
  'target', 'bin', 'obj', '.git', 'deps', '_site', '.docusaurus',
]);

// Ancestor manifest files that indicate "this tree is a software project".
const PROJECT_MANIFESTS = [
  'package.json', 'tsconfig.json', 'pyproject.toml', 'requirements.txt',
  'Cargo.toml', 'go.mod', 'composer.json', 'Gemfile', 'pom.xml',
  'build.gradle', 'build.gradle.kts', 'Makefile', 'CMakeLists.txt',
];

// Directory names that usually hold app-embedded HTML (templates/partials/views).
const TEMPLATE_DIR_SEGMENTS = new Set([
  'templates', 'template', 'partials', 'partial', 'views', 'view',
  'components', 'layouts', 'includes', 'fragments', 'emails', 'mail',
]);

// Server/framework templating markers that a plain document would never contain.
const TEMPLATE_SYNTAX = [
  /\{\{[^}]*\}\}/,          // handlebars / mustache / jinja / vue / angular
  /\{%[^%]*%\}/,            // jinja / nunjucks / twig / liquid
  /<%[-=]?[\s\S]*?%>/,      // ejs / erb / asp
  /@(if|for|foreach|section|extends|include|yield|csrf)\b/, // blade / razor / laravel
  /\bng-[a-z]+=/,           // angular.js
  /\s(v-if|v-for|v-bind|v-model|:class|:style|@click)=/, // vue
  /\bx-data=/,              // alpine
  /\bth:[a-z]+=/,           // thymeleaf
  /\{#[\s\S]*?#\}/,         // svelte / jinja comments
];

/**
 * @param {object} opts
 * @param {string} opts.filePath absolute path
 * @param {string} opts.content  raw html
 * @param {(dir:string)=>boolean} [opts.hasManifest] test whether a dir holds a project manifest (injected so scanner can cache)
 * @returns {{ class:'document'|'embedded', confidence:number, reasons:string[] }}
 */
export function classifyHtml({ filePath, content, hasManifest }) {
  const reasons = [];
  let score = 0; // positive => embedded, negative => document

  const segments = filePath.split(path.sep);
  const lower = content.toLowerCase();

  // --- Path signals -------------------------------------------------------
  const hitDir = segments.find((s) => EMBEDDED_DIR_SEGMENTS.has(s));
  if (hitDir) {
    score += 5;
    reasons.push(`inside "${hitDir}/" (generated/vendored directory)`);
  }

  const templateDir = segments.find((s) => TEMPLATE_DIR_SEGMENTS.has(s.toLowerCase()));
  if (templateDir) {
    score += 2;
    reasons.push(`inside "${templateDir}/" (app template/view directory)`);
  }

  if (typeof hasManifest === 'function') {
    const projectDir = nearestManifestDir(filePath, hasManifest);
    if (projectDir) {
      score += 2;
      reasons.push(`within a software project (manifest in "${path.basename(projectDir)}/")`);
    }
  }

  const base = path.basename(filePath).toLowerCase();
  if (base.startsWith('_') || /\.(partial|template|tmpl|fragment|component)\.html?$/.test(base)) {
    score += 2;
    reasons.push('filename marks it as a partial/template');
  }

  // --- Content signals ----------------------------------------------------
  const hasDoctype = /<!doctype\s+html/i.test(content);
  const hasHtmlTag = /<html[\s>]/i.test(lower);
  const hasHead = /<head[\s>]/i.test(lower);
  const hasBody = /<body[\s>]/i.test(lower);

  if (!hasHtmlTag && !hasDoctype) {
    score += 4;
    reasons.push('no <html>/<!doctype> — looks like a fragment/partial');
  } else if (hasDoctype && hasHtmlTag && hasHead && hasBody) {
    score -= 4;
    reasons.push('complete standalone document (<!doctype>+<html>+<head>+<body>)');
  }

  const templateHit = TEMPLATE_SYNTAX.find((re) => re.test(content));
  if (templateHit) {
    score += 4;
    reasons.push('contains server/framework templating syntax');
  }

  // SPA mount point + hashed asset bundle => build output / app shell.
  if (/<div\s+id=["'](root|app|__next|___gatsby)["']/i.test(content) &&
      /<script[^>]+src=["'][^"']*\.(?:[a-f0-9]{6,}|chunk|bundle)[^"']*\.js/i.test(content)) {
    score += 3;
    reasons.push('SPA mount point + hashed JS bundle (app shell)');
  }

  const hasTitle = /<title[\s>]/i.test(lower);
  const hasMetaDesc = /<meta[^>]+name=["']description["']/i.test(content);
  if (hasTitle) { score -= 1; reasons.push('has <title>'); }
  if (hasMetaDesc) { score -= 1; reasons.push('has meta description'); }

  // Self-contained (inline styles/scripts, no external app bundle) reads as a document.
  if ((hasDoctype || hasHtmlTag) && !/<script[^>]+src=/i.test(content) && /<style[\s>]/i.test(lower)) {
    score -= 1;
    reasons.push('self-contained (inline styles, no external scripts)');
  }

  const cls = score >= 2 ? 'embedded' : 'document';
  // Map the distance from the threshold to a rough confidence.
  const confidence = Math.min(1, 0.5 + Math.abs(score - 1.5) / 8);
  return { class: cls, confidence: Math.round(confidence * 100) / 100, reasons };
}

/** Walk up from a file looking for a directory that holds a project manifest. */
function nearestManifestDir(filePath, hasManifest) {
  let dir = path.dirname(filePath);
  let prev = null;
  let hops = 0;
  while (dir && dir !== prev && hops < 25) {
    if (hasManifest(dir)) return dir;
    prev = dir;
    dir = path.dirname(dir);
    hops++;
  }
  return null;
}

export const _internals = { PROJECT_MANIFESTS };
