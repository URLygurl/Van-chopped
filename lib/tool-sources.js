// Chops-style tool registry. Knows the conventional dotfolders each coding
// agent uses for skills / agents / rules, so we can discover them the same way
// Chops does. `kind` tags what a directory yields.

import os from 'node:os';
import path from 'node:path';

const home = os.homedir();
const configHome = process.env.XDG_CONFIG_HOME && process.env.XDG_CONFIG_HOME.length
  ? process.env.XDG_CONFIG_HOME
  : path.join(home, '.config');

/** Global (home-level) directories to probe, with the tool + kind they yield. */
export const GLOBAL_SOURCES = [
  { tool: 'claude',   kind: 'skill', dir: `${home}/.claude/skills` },
  { tool: 'claude',   kind: 'agent', dir: `${home}/.claude/agents` },
  { tool: 'cursor',   kind: 'skill', dir: `${home}/.cursor/skills` },
  { tool: 'cursor',   kind: 'rule',  dir: `${home}/.cursor/rules` },
  { tool: 'cursor',   kind: 'agent', dir: `${home}/.cursor/agents` },
  { tool: 'codex',    kind: 'skill', dir: `${home}/.codex/skills` },
  { tool: 'codex',    kind: 'agent', dir: `${home}/.codex/agents` },
  { tool: 'windsurf', kind: 'rule',  dir: `${home}/.codeium/windsurf/memories` },
  { tool: 'windsurf', kind: 'rule',  dir: `${home}/.windsurf/rules` },
  { tool: 'amp',      kind: 'skill', dir: `${configHome}/amp/skills` },
  { tool: 'opencode', kind: 'skill', dir: `${configHome}/opencode/skills` },
  { tool: 'agents',   kind: 'skill', dir: `${home}/.agents/skills` },
];

/** Per-project subpaths probed inside each subdirectory of a scan root. */
export const PROJECT_PROBES = [
  { subpath: '.claude/skills',  tool: 'claude',   kind: 'skill' },
  { subpath: '.claude/agents',  tool: 'claude',   kind: 'agent' },
  { subpath: '.cursor/skills',  tool: 'cursor',   kind: 'skill' },
  { subpath: '.cursor/rules',   tool: 'cursor',   kind: 'rule' },
  { subpath: '.cursor/agents',  tool: 'cursor',   kind: 'agent' },
  { subpath: '.codex/skills',   tool: 'codex',    kind: 'skill' },
  { subpath: '.codex/agents',   tool: 'codex',    kind: 'agent' },
  { subpath: '.windsurf/rules', tool: 'windsurf', kind: 'rule' },
];

const TOOL_BY_SEGMENT = {
  '.claude': 'claude', '.cursor': 'cursor', '.codex': 'codex',
  '.windsurf': 'windsurf', '.codeium': 'windsurf', '.agents': 'agents',
  '.opencode': 'opencode', '.amp': 'amp', amp: 'amp',
};

/** Infer which tool a path belongs to, from its dotfolder segment. */
export function toolFromPath(p) {
  for (const seg of p.split(path.sep)) {
    if (TOOL_BY_SEGMENT[seg]) return TOOL_BY_SEGMENT[seg];
  }
  return null;
}

/** Infer skill/agent/rule from the nearest meaningful directory in the path. */
export function kindFromPath(p) {
  const segs = p.split(path.sep).map((s) => s.toLowerCase());
  if (segs.includes('agents')) return 'agent';
  if (segs.includes('rules') || segs.includes('memories')) return 'rule';
  if (segs.includes('skills')) return 'skill';
  return null;
}

export const TOOL_META = {
  claude:   { label: 'Claude Code', color: '#d97706' },
  cursor:   { label: 'Cursor',      color: '#2563eb' },
  codex:    { label: 'Codex',       color: '#16a34a' },
  windsurf: { label: 'Windsurf',    color: '#0d9488' },
  amp:      { label: 'Amp',         color: '#db2777' },
  opencode: { label: 'OpenCode',    color: '#dc2626' },
  agents:   { label: 'Global',      color: '#059669' },
};
