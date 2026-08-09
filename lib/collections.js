// Chops-style collections: user groupings that live outside the source files.
// Persisted to data/collections.json; members are artifact ids (realpath-based).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'data', 'collections.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { collections: [] }; }
}
function persist(state) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
}
// Deterministic id without Date.now/Math.random (kept resume-safe).
function nextId(state) {
  const n = state.collections.reduce((max, c) => Math.max(max, Number(c.id?.replace('c', '')) || 0), 0);
  return 'c' + (n + 1);
}

export const Collections = {
  all() { return load().collections; },
  create(name) {
    const s = load();
    const c = { id: nextId(s), name: name || 'Untitled', memberIds: [] };
    s.collections.push(c); persist(s); return c;
  },
  rename(id, name) {
    const s = load(); const c = s.collections.find((x) => x.id === id);
    if (c) { c.name = name; persist(s); } return c;
  },
  remove(id) {
    const s = load(); s.collections = s.collections.filter((x) => x.id !== id); persist(s);
  },
  toggle(id, artifactId) {
    const s = load(); const c = s.collections.find((x) => x.id === id);
    if (!c) return null;
    const i = c.memberIds.indexOf(artifactId);
    if (i === -1) c.memberIds.push(artifactId); else c.memberIds.splice(i, 1);
    persist(s); return c;
  },
};
