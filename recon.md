# Recon — Van-Chopped demo

Scope: this run builds the **demo half only** (`project-to-portfolio` Phase 2), not the
splash. The splash equivalent already exists as `van-chopped-pitch-v1.html` from a prior
run. Per user instruction, the repo's pre-built `demo/index.html` and the live server UI
(`public/app.js`, `public/index.html`) were **not opened** — recon below is source-only,
drawn from the modules those files wrap, not from the finished artifact itself.

## Locate everything
Single repo, no parked siblings: `/home/user/Van-chopped` (branch
`claude/gracious-pasteur-0nvgo5`). One canonical tree.

## The real control model (source, not README)
- `lib/classify-html.js` — the HTML qualifier. Pure, dependency-free scoring: path signals
  (embedded dirs +5, template dirs +2, project-manifest ancestor +2, partial filename +2)
  plus content signals (no `<html>`/doctype +4, complete document −4, template syntax +4,
  SPA-mount+hashed-bundle +3, `<title>` −1, meta description −1, self-contained inline
  styles −1). `score >= 2` → embedded. `confidence = min(1, 0.5 + |score−1.5|/8)`. This is
  portable client-side JS — the demo runs the *actual* algorithm live against seeded
  content, not a canned confidence number.
- `public/styles.css` — the real skin. Three-column layout (240px sidebar / 320px list /
  detail pane), CSS custom-property palette per type (document green `#0e7c5a`, embedded
  amber `#b4690e`, prompt indigo `#4f46e5`, component violet `#7c3aed`, skill sky `#0369a1`,
  agent pink `#be185d`, rule stone `#57534e`), a dark-mode variant block, tabs with an
  active underline, pill badges, a `.classification` box (reasons list + floated confidence),
  a promote button, and a documented mobile breakpoint at 820px (slide-in sidebar/detail,
  back button). Reused verbatim as design tokens; markup and JS wiring were written fresh.

## The full surface
README's API table + config.json shape cover the real routes; no route enumeration needed
beyond that for a seeded, no-backend demo.

## Data/domain layer
`sample-library/` — real seeded fixture files already listed in a prior directory scan:
prompts (frontmatter + plain + `.prompt`), a `.claude` agent + skill, a `.cursor` rule,
`.tsx`/`.jsx` components, and HTML across `sites/`, `reports/`, and — inside
`my-webapp/` (which has its own `package.json`) — `templates/`, `vendor/widget/`,
`views/_card.html`, and `dist/index.html`. That mix is what the demo seeds, verbatim by
path, with short representative content written to genuinely exercise each scoring branch.

## The aesthetic question
Dark, kinetic `demo-artifact` scaffold was used for the splash already. The demo itself
wears **Van-Chopped's own skin** (the CSS above), not the pitch's palette — per Phase 2,
"launching feels like entering the product."

## Honesty-pass candidate (found during recon, not invented)
`dist/index.html` has a complete `<!doctype>+<html>+<head>+<body>` — normally a strong
"document" signal (−4) — but it still classifies as **embedded**, because `dist/` (+5),
its `my-webapp/package.json` ancestor (+2), and its hashed SPA bundle (+3) outweigh it.
That's a genuine, non-obvious case worth surfacing rather than a manufactured gap.
