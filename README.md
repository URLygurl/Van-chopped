# Van-Chopped — Artifact Repo

A **Chops-style discovery app** that finds, organizes, previews, and edits your
AI/dev artifacts across your machine. Chops did this for coding-agent *skills*;
this does it for **prompts, HTML, JSX/TSX components, and Chops' original
skills / agents / rules** — all in one browser.

Its signature feature is the **HTML qualifier**: it separates standalone HTML
**documents** from HTML that's **embedded in other software** (framework
templates, build output, vendored libs, component fragments), with a confidence
score and reasons.

**Zero dependencies.** Pure Node.js built-ins. No `npm install`.

```bash
node scripts/seed-demo.js   # optional: generate a demo library
node server.js              # → http://localhost:4600
```

Then add your own folders in the sidebar (e.g. `~/Sites`, `~/Documents/Prompts`,
a project directory). It also auto-discovers global tool skills/agents in
`~/.claude`, `~/.cursor`, `~/.codex`, etc.

---

## What it discovers

| Type | Recognized by | Qualifier / subtype | Editable |
|------|---------------|---------------------|----------|
| **Prompt** | `.md`/`.txt`/`.prompt` (frontmatter, `.prompt`, or prompt-y path) | `frontmatter` / `plain` | ✅ + fields |
| **HTML** | `.html`/`.htm` | **`document`** vs **`embedded`** | docs ✅ / embedded 🔒 |
| **Component** | `.jsx` / `.tsx` | `jsx` / `tsx` | ✅ |
| **Skill** | folder w/ `SKILL.md` (or in a `skills/` dir) | tool badge (claude/cursor…) | ✅ + fields |
| **Agent** | folder w/ `AGENTS.md` (or in an `agents/` dir) | tool badge | ✅ + fields |
| **Rule** | `.mdc`/`.md` in a `rules/`/`memories/` dir | tool badge | ✅ + fields |

### The HTML qualifier (`lib/classify-html.js`)
Weighted score of path + content signals, with transparent reasons:
- **→ embedded**: inside `node_modules/dist/build/.next/vendor/coverage/…`; in a
  `templates/views/partials/components/` dir; ancestor project manifest
  (`package.json`, `pyproject.toml`, …); a fragment with no `<html>` wrapper;
  templating syntax (`{{ }}`, `{% %}`, `<%= %>`, `v-`/`ng-`/`x-data`/`th:`); an
  SPA mount + hashed JS bundle; `_partial`/`.template.html` filename.
- **→ document**: complete `<!doctype>+<html>+<head>+<body>`; `<title>`/meta
  description; self-contained (inline styles, no app bundle).

Embedded HTML defaults to **read-only** so framework files can't be clobbered.

---

## Try it without running anything

`demo/index.html` is a **self-contained, zero-backend demo** — the same UI and
the real classifier/parsers running client-side over an embedded sample library.
Open it in any browser (or view the hosted version) to click around. Edits in the
demo stay in memory; the full app below reads and writes your actual files.

## Features

- **List + rendered grid views** — the grid shows **live HTML thumbnails** and
  typed glyph cards; toggle with ☰ / ▦.
- **Mobile-responsive** — drawer sidebar, full-width list, slide-in detail with a
  back button; works on a phone.
- **Promote embedded → document** — one click copies an embedded HTML file out to
  your documents folder as a standalone, **editable** document (the original is
  left untouched). Files in that folder are always treated as editable documents.
- **Rendered tab** — markdown types (prompts/skills/agents/rules) render to HTML;
  HTML types get a sandboxed **Preview** iframe.
- **Editable fields & tags** — the **Fields** tab edits frontmatter key/values
  (incl. `tags`) and writes them back to the source file. This is the
  "tighten strictness as we go" workflow: add structure incrementally.
- **Tags** — aggregated from frontmatter; click to filter; searchable.
- **Collections** — group artifacts without touching source files (Chops-style),
  persisted in `data/collections.json`.
- **Strictness settings (⚙)** — toggle each type on/off and require prompt
  frontmatter (strict mode) to cut noise.
- **Live file watching** — recursive `fs.watch`, 0.5s debounce, SSE push to UI.
- **Multi-tool dedup** — one physical file symlinked into several tool dirs
  collapses to one record with multiple tool badges.

---

## Architecture — the same 6 stages as Chops

| Stage | File | Role |
|-------|------|------|
| 1. Where | `lib/sources.js`, `lib/tool-sources.js`, `config.json` | Config paths + Chops-style tool dotfolders + project probes |
| 2. Walk | `lib/scanner.js` | Recursive walk, symlink resolution, skill/agent/rule/component/html/prompt recognition |
| 3. Parse | `lib/frontmatter.js`, `lib/parsers.js`, `lib/classify-html.js` | Frontmatter, component metadata, HTML `<title>`/`<meta>`, the qualifier, tags |
| 4. Store/dedup | `lib/scanner.js` (`byRealPath`) | Dedup by realpath; merge `installedPaths` + `toolSources` |
| 5. Watch | `lib/watcher.js` | Recursive `fs.watch`, debounce → rescan |
| 6. View/edit | `server.js`, `lib/collections.js`, `public/` | REST + SSE; list/grid UI; edits + field-edits write back to disk |

**Add a new type** in 3 steps: add its extensions/recognizer in
`lib/scanner.js`, a parser returning `{name, description, content, frontmatter,
tags}`, and (optionally) a qualifier like `classify-html.js`. Stages 4–6 are
type-agnostic.

---

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/artifacts?type=&class=&tag=&collection=&q=` | list + counts + tags + collections |
| GET | `/api/artifacts/:id` | full record incl. content |
| PUT | `/api/artifacts/:id` | body `{content}` saves file; body `{frontmatter}` rewrites fields |
| POST | `/api/artifacts/:id/promote` | copy an embedded HTML file out to the documents folder as an editable document |
| GET | `/api/raw?id=` | raw body (preview iframe / grid thumbnails) |
| GET/PUT | `/api/config` | scan paths + strictness options |
| GET/POST | `/api/collections` | list / create |
| PUT/DELETE | `/api/collections/:id` | rename / delete |
| POST | `/api/collections/:id/toggle` | add/remove a member |
| POST | `/api/rescan` | force rescan |
| GET | `/api/events` | SSE — live rescan notifications |

### Snapshot/deep-link params (handy for demos)
`?open=<name-or-path substr>` · `?tab=source|rendered|preview|fields|meta` ·
`?view=grid` · `?snapshot=1` (disables the live SSE stream).

## Config (`config.json`)
```json
{
  "scanPaths": ["~/Sites", "~/Documents/Prompts"],
  "options": {
    "maxDepth": 8, "maxFileBytes": 2000000,
    "skipDirs": ["node_modules", ".git"],
    "requirePromptFrontmatter": false,
    "includePrompts": true, "includeHtml": true, "includeComponents": true,
    "includeSkills": true, "includeAgents": true, "includeRules": true
  }
}
```
> `node_modules`/`.git` are skipped from *traversal* (too big); embedded HTML in
> `dist/`, `templates/`, `vendor/` is still found. Remove them from `skipDirs`
> to index `node_modules` too.

## License
MIT — do as you like.
