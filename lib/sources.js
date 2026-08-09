// Stage 1: WHERE to look. Prompts and HTML don't live in standardized
// dotfolders the way agent skills do, so the source of truth is a user-editable
// config file (the analog of Chops' `customScanPaths`).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

const DEFAULTS = {
  // Folders to scan. Ships pointing at the bundled demo library so it runs
  // out of the box; add your real folders in the UI or here.
  scanPaths: [path.join(__dirname, '..', 'sample-library')],
  options: {
    maxDepth: 8,
    maxFileBytes: 2_000_000,
    // Directories never traversed (too big / noisy). Embedded HTML in
    // dist/build/templates is still found; these are just the black holes.
    skipDirs: ['node_modules', '.git', '.hg', '.svn'],
    // Prompts: if false, any non-ignored .md/.txt counts; if true, a file must
    // have frontmatter or a prompt-y path/extension.
    requirePromptFrontmatter: false,
    // Per-type include toggles (the "strictness" switches).
    includePrompts: true,
    includeHtml: true,
    includeComponents: true, // .jsx / .tsx
    includeSkills: true,     // Chops-style skills
    includeAgents: true,     // Chops-style agents
    includeRules: true,      // Chops-style rules
  },
};

export function expandHome(p) {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return path.resolve(p);
}

export function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return {
      scanPaths: Array.isArray(raw.scanPaths) ? raw.scanPaths : DEFAULTS.scanPaths,
      options: { ...DEFAULTS.options, ...(raw.options || {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveConfig(cfg) {
  const merged = {
    scanPaths: Array.isArray(cfg.scanPaths) ? cfg.scanPaths : [],
    options: { ...DEFAULTS.options, ...(cfg.options || {}) },
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

export { DEFAULTS };
