// Stage 6 (frontend): browser with list/grid views, tags, collections,
// editable fields, strictness settings, and rendered previews.
import { renderMarkdown } from '/md.js';

const $ = (s) => document.querySelector(s);
const api = (u, o) => fetch(u, o).then((r) => r.json());

let filter = { type: '', class: '', tag: '', collection: '' };
let query = '';
let view = 'list';
let items = [];
let current = null;
let dirty = false;
let meta = {};

const PILL = (a) => a.type === 'html' ? a.subtype : a.type; // document|embedded|prompt|component|skill|agent|rule
const shortPath = (p) => p.replace(/^\/(home|Users)\/[^/]+/, '~');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- load -------------------------------------------------------------------
async function refresh() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ type: filter.type, class: filter.class, tag: filter.tag, collection: filter.collection, q: query }))
    if (v) p.set(k, v);
  const data = await api('/api/artifacts?' + p);
  items = data.items; meta = data.meta;
  renderCounts(); renderTags(); renderCollections(); renderRoots();
  renderActiveFilter();
  view === 'grid' ? renderGrid() : renderList();
  $('#status').textContent = `${meta.total} artifacts · ${meta.scanned} files${meta.tookMs != null ? ` · ${meta.tookMs}ms` : ''}`;

  const sp = new URLSearchParams(location.search);
  if (sp.get('view') === 'grid' && view !== 'grid') $('#viewGrid').click();
  const openParam = sp.get('open');
  if (openParam && !current) {
    const hit = items.find((a) => a.name.includes(openParam) || a.path.includes(openParam));
    if (hit) open(hit.id).then(() => { const t = sp.get('tab'); if (t) setTab(t); });
  }
}

function renderCounts() {
  const c = meta.counts || {};
  $('#c-all').textContent = meta.total;
  $('#c-prompt').textContent = c.prompt ?? 0;
  $('#c-doc').textContent = c.htmlDocument ?? 0;
  $('#c-emb').textContent = c.htmlEmbedded ?? 0;
  $('#c-cmp').textContent = c.component ?? 0;
  $('#c-skill').textContent = c.skill ?? 0;
  $('#c-agent').textContent = c.agent ?? 0;
  $('#c-rule').textContent = c.rule ?? 0;
}

function renderTags() {
  const el = $('#tags'); el.innerHTML = '';
  (meta.tags || []).slice(0, 40).forEach(({ tag, n }) => {
    const b = document.createElement('button');
    b.className = 'tag-chip' + (filter.tag === tag ? ' active' : '');
    b.innerHTML = `${esc(tag)} <span>${n}</span>`;
    b.onclick = () => { filter.tag = filter.tag === tag ? '' : tag; refresh(); };
    el.append(b);
  });
  if (!(meta.tags || []).length) el.innerHTML = '<span class="muted-note">none yet</span>';
}

function renderCollections() {
  const ul = $('#colls'); ul.innerHTML = '';
  (meta.collections || []).forEach((c) => {
    const li = document.createElement('li');
    li.className = filter.collection === c.id ? 'active' : '';
    const s = document.createElement('span');
    s.textContent = `${c.name} (${c.memberIds.length})`;
    s.onclick = () => { filter.collection = filter.collection === c.id ? '' : c.id; refresh(); };
    const del = document.createElement('button'); del.textContent = '×'; del.title = 'Delete';
    del.onclick = async (e) => { e.stopPropagation(); await fetch('/api/collections/' + c.id, { method: 'DELETE' }); if (filter.collection === c.id) filter.collection = ''; refresh(); };
    li.append(s, del); ul.append(li);
  });
}

function renderRoots() {
  const ul = $('#roots'); ul.innerHTML = '';
  (meta.roots || []).forEach((r) => {
    const li = document.createElement('li');
    const s = document.createElement('span'); s.textContent = shortPath(r); s.title = r;
    const b = document.createElement('button'); b.textContent = '×'; b.onclick = () => removeRoot(r);
    li.append(s, b); ul.append(li);
  });
}

function renderActiveFilter() {
  const bits = [];
  if (filter.tag) bits.push(`tag: ${filter.tag}`);
  if (filter.collection) { const c = (meta.collections || []).find((x) => x.id === filter.collection); if (c) bits.push(`collection: ${c.name}`); }
  const el = $('#activeFilter');
  if (bits.length) { el.classList.remove('hidden'); el.innerHTML = bits.map((b) => `<span>${esc(b)}</span>`).join('') + ` <button id="clearF">clear</button>`; $('#clearF').onclick = () => { filter.tag = ''; filter.collection = ''; refresh(); }; }
  else el.classList.add('hidden');
}

// ---- list & grid ------------------------------------------------------------
function renderList() {
  $('#list').classList.remove('hidden'); $('#grid').classList.add('hidden');
  const ul = $('#list'); ul.innerHTML = '';
  if (!items.length) { ul.innerHTML = '<li class="muted-note pad">No artifacts match.</li>'; return; }
  for (const a of items) {
    const li = document.createElement('li');
    li.className = 'card' + (current && a.id === current.id ? ' sel' : '');
    li.onclick = () => open(a.id);
    li.innerHTML = `
      <div class="card-top"><span class="card-name">${esc(a.name)}</span>${pill(a)}</div>
      ${a.description ? `<p class="card-desc">${esc(a.description)}</p>` : ''}
      ${tagRow(a.tags)}
      <div class="card-path">${esc(shortPath(a.path))}</div>`;
    ul.append(li);
  }
}

function renderGrid() {
  $('#grid').classList.remove('hidden'); $('#list').classList.add('hidden');
  const g = $('#grid'); g.innerHTML = '';
  if (!items.length) { g.innerHTML = '<div class="muted-note pad">No artifacts match.</div>'; return; }
  for (const a of items) {
    const card = document.createElement('div');
    card.className = 'gcard' + (current && a.id === current.id ? ' sel' : '');
    card.onclick = () => open(a.id);
    const thumb = document.createElement('div'); thumb.className = 'thumb';
    if (a.type === 'html') {
      const f = document.createElement('iframe');
      f.className = 'thumb-frame'; f.setAttribute('sandbox', 'allow-same-origin'); f.loading = 'lazy';
      f.src = '/api/raw?id=' + encodeURIComponent(a.id);
      thumb.append(f);
    } else {
      thumb.classList.add('thumb-text', 't-' + PILL(a));
      thumb.innerHTML = `<div class="thumb-glyph">${glyph(a)}</div>`;
    }
    card.append(thumb);
    const cap = document.createElement('div'); cap.className = 'gcap';
    cap.innerHTML = `<div class="gcap-top">${pill(a)}<span class="gname">${esc(a.name)}</span></div>${a.description ? `<p class="gdesc">${esc(a.description)}</p>` : ''}`;
    card.append(cap);
    g.append(card);
  }
}

function glyph(a) { return { prompt: '¶', component: '‹/›', skill: '◆', agent: '☑', rule: '≡' }[a.type] || '◫'; }
function pill(a) { const k = PILL(a); return `<span class="pill ${k}">${k}</span>`; }
function tagRow(tags) { return (tags && tags.length) ? `<div class="tag-row">${tags.slice(0, 6).map((t) => `<span class="tag-mini">${esc(t)}</span>`).join('')}</div>` : ''; }

// ---- detail -----------------------------------------------------------------
async function open(id) {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  current = await api('/api/artifacts/' + id);
  dirty = false;
  view === 'grid' ? renderGrid() : renderList();
  renderDetail();
  document.getElementById('app').classList.add('detail-open'); // mobile: slide detail in
}

function renderDetail() {
  $('#empty').classList.add('hidden');
  $('#detailBody').classList.remove('hidden');
  const a = current;
  $('#d-name').textContent = a.name;
  $('#d-desc').textContent = a.description || '';
  $('#d-path').textContent = a.path;
  $('#d-tags').innerHTML = tagRow(a.tags);

  const badges = [`<span class="pill ${PILL(a)}">${PILL(a)}</span>`];
  (a.toolSources || []).forEach((t) => badges.push(`<span class="pill tool">${t}</span>`));
  if (a.readOnly) badges.push(`<span class="pill ro">read-only</span>`);
  if (a.installedPaths && a.installedPaths.length > 1) badges.push(`<span class="pill ro">${a.installedPaths.length}×</span>`);
  $('#d-badges').innerHTML = badges.join('');

  const box = $('#d-classification');
  if (a.classification) {
    box.classList.remove('hidden');
    box.innerHTML = `<h4>Qualifier: ${a.classification.class}
      <span class="conf">confidence ${(a.classification.confidence * 100) | 0}%</span></h4>
      <ul>${a.classification.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`;
  } else box.classList.add('hidden');

  // Promote only for embedded HTML (read-only "inside software" files).
  $('#promoteBtn').classList.toggle('hidden', !(a.type === 'html' && a.subtype === 'embedded'));

  const isMd = ['prompt', 'skill', 'agent', 'rule'].includes(a.type);
  $('#previewTab').classList.toggle('hidden', a.type !== 'html');
  $('#renderedTab').classList.toggle('hidden', !isMd);
  $('#fieldsTab').classList.toggle('hidden', !a.editableFields);

  const ed = $('#editor');
  ed.value = a.content; ed.readOnly = a.readOnly;
  $('#saveBtn').disabled = true; $('#dirty').classList.add('hidden');

  renderFields();
  renderMeta();
  setTab('source');
}

function renderFields() {
  const a = current, wrap = $('#fields'); wrap.innerHTML = '';
  if (!a.editableFields) { wrap.innerHTML = '<p class="muted-note">This type has no editable frontmatter.</p>'; return; }
  const fm = { ...a.frontmatter };
  Object.entries(fm).forEach(([k, v]) => wrap.append(fieldRow(k, v)));
}
function fieldRow(k, v) {
  const row = document.createElement('div'); row.className = 'field-row';
  row.innerHTML = `<input class="field-key" value="${esc(k)}"><input class="field-val" value="${esc(v)}"><button class="mini">×</button>`;
  row.querySelector('button').onclick = () => row.remove();
  return row;
}

function renderMeta() {
  const a = current, fm = a.frontmatter || {};
  const rows = [
    ['type', a.type], ['subtype', a.subtype || '—'],
    ['tags', (a.tags || []).join(', ') || '—'],
    ['toolSources', (a.toolSources || []).join(', ') || '—'],
    ['size', a.size + ' bytes'], ['modified', new Date(a.mtime).toLocaleString()],
    ['realPath', a.realPath],
    ...(a.installedPaths || []).map((p, i) => [`path[${i}]`, p]),
    ...Object.entries(fm),
  ];
  $('#metaTable').innerHTML = rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(String(v))}</td></tr>`).join('');
}

function setTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  ['source', 'rendered', 'preview', 'fields', 'meta'].forEach((n) => $('#pane-' + n).classList.toggle('hidden', n !== name));
  if (name === 'preview' && current) $('#preview').src = '/api/raw?id=' + encodeURIComponent(current.id) + '&t=' + Date.now();
  if (name === 'rendered' && current) $('#rendered').innerHTML = renderMarkdown(current.content);
}

async function save() {
  if (!current || current.readOnly || !dirty) return;
  const res = await api('/api/artifacts/' + current.id, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: $('#editor').value }),
  });
  if (res.error) return alert('Save failed: ' + res.error);
  current.content = $('#editor').value; dirty = false;
  $('#saveBtn').disabled = true; $('#dirty').classList.add('hidden');
}

async function saveFields() {
  const fm = {};
  document.querySelectorAll('#fields .field-row').forEach((r) => {
    const k = r.querySelector('.field-key').value.trim();
    const v = r.querySelector('.field-val').value;
    if (k) fm[k] = v;
  });
  const res = await api('/api/artifacts/' + current.id, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frontmatter: fm }),
  });
  if (res.error) return alert('Save failed: ' + res.error);
  open(current.id); // reload
}

// ---- promote embedded HTML -> standalone document ---------------------------
async function promote() {
  if (!current || !(current.type === 'html' && current.subtype === 'embedded')) return;
  const res = await api('/api/artifacts/' + current.id + '/promote', { method: 'POST' });
  if (res.error) return alert('Promote failed: ' + res.error);
  await refresh();
  const hit = items.find((a) => a.path === res.path);
  if (hit) open(hit.id);
}

// ---- collections / roots / settings ----------------------------------------
async function addRoot(p) {
  const cfg = await api('/api/config');
  if (cfg.scanPaths.includes(p)) return;
  await api('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scanPaths: [...cfg.scanPaths, p] }) });
  refresh();
}
async function removeRoot(p) {
  const cfg = await api('/api/config');
  await api('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scanPaths: cfg.scanPaths.filter((x) => x !== p) }) });
  refresh();
}

async function openSettings() {
  const cfg = await api('/api/config');
  document.querySelectorAll('#settings [data-opt]').forEach((cb) => { cb.checked = !!cfg.options[cb.dataset.opt]; });
  $('#settings').classList.remove('hidden');
}
async function saveSettings() {
  const options = {};
  document.querySelectorAll('#settings [data-opt]').forEach((cb) => { options[cb.dataset.opt] = cb.checked; });
  await api('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ options }) });
  $('#settings').classList.add('hidden');
  refresh();
}

// ---- events -----------------------------------------------------------------
document.querySelectorAll('.filter').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.filter').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    filter.type = b.dataset.type; filter.class = b.dataset.class;
    refresh();
  };
});
$('#search').oninput = (e) => { query = e.target.value; refresh(); };
$('#rescanBtn').onclick = () => api('/api/rescan', { method: 'POST' }).then(refresh);
$('#saveBtn').onclick = save;
$('#addForm').onsubmit = (e) => { e.preventDefault(); const v = $('#addPath').value.trim(); if (v) { addRoot(v); $('#addPath').value = ''; } };
document.querySelectorAll('.tab').forEach((t) => (t.onclick = () => setTab(t.dataset.tab)));
$('#editor').oninput = () => { if (!current || current.readOnly) return; dirty = $('#editor').value !== current.content; $('#saveBtn').disabled = !dirty; $('#dirty').classList.toggle('hidden', !dirty); };
$('#viewList').onclick = () => { view = 'list'; $('#viewList').classList.add('active'); $('#viewGrid').classList.remove('active'); $('#app').classList.remove('grid-mode'); renderList(); };
$('#viewGrid').onclick = () => { view = 'grid'; $('#viewGrid').classList.add('active'); $('#viewList').classList.remove('active'); $('#app').classList.add('grid-mode'); renderGrid(); };
$('#settingsBtn').onclick = openSettings;
$('#settingsClose').onclick = saveSettings;
$('#newCollBtn').onclick = async () => { const name = prompt('Collection name:'); if (name) { await api('/api/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); refresh(); } };
$('#addFieldBtn').onclick = () => { const k = $('#newFieldKey').value.trim(); if (!k) return; $('#fields').append(fieldRow(k, $('#newFieldVal').value)); $('#newFieldKey').value = ''; $('#newFieldVal').value = ''; };
$('#saveFieldsBtn').onclick = saveFields;
$('#collBtn').onclick = async () => {
  const colls = meta.collections || [];
  if (!colls.length) return alert('Create a collection first (＋ next to Collections).');
  const name = prompt('Add to which collection?\n' + colls.map((c) => '• ' + c.name).join('\n'));
  const c = colls.find((x) => x.name.toLowerCase() === (name || '').toLowerCase());
  if (c) { await fetch('/api/collections/' + c.id + '/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artifactId: current.id }) }); refresh(); }
};
$('#promoteBtn').onclick = promote;
document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } });

// mobile: drawer + back button + theme toggle
const appEl = document.getElementById('app');
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  const mt = $('#mTheme'); if (mt) mt.textContent = dark ? '◑' : '◐';
}
$('#mHamb').onclick = () => appEl.classList.toggle('sidebar-open');
$('#backdrop').onclick = () => appEl.classList.remove('sidebar-open');
$('#mTheme').onclick = toggleTheme;
$('#mBack').onclick = () => appEl.classList.remove('detail-open');
['#filters', '#tags', '#colls'].forEach((sel) => { const el = $(sel); if (el) el.addEventListener('click', () => appEl.classList.remove('sidebar-open')); });

if (!new URLSearchParams(location.search).has('snapshot')) {
  const es = new EventSource('/api/events');
  es.onmessage = (e) => { const d = JSON.parse(e.data); if (d.type === 'rescan') refresh(); };
}

refresh();
