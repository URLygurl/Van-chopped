---
name: project-to-portfolio
description: >
  Turn an existing project or repo into a shipped portfolio artifact — a splash page that
  sells it PLUS a self-contained interactive demo. Always both files, never just the
  landing page. Trigger on "put X in the portfolio", "build a demo for X", "make a
  portfolio page for <project>", "turn this repo into a demo", or any request to present
  something already built as a shareable, clickable thing. NOT for greenfield products —
  this skill's whole premise is that the artifact already exists and must be READ, not
  imagined.
---

# project-to-portfolio

**One line:** scour an existing project and assemble it into a shipped portfolio artifact —
a splash that sells it, plus a self-contained interactive demo.

This skill is the pipeline. `demo-artifact` is the packaging standard it hands off to for
each of the two files. If you only have `demo-artifact` installed you will get a beautiful
landing page and no demo — that is the wrong half.

Evidence base: three full runs against real repos. Run 1 was rebuilt three times; runs 2
and 3, with RECON done first, had zero rebuilds. That delta is the skill.

## The deliverable — two files, always

| File | What it is | Done when |
|---|---|---|
| `<project>/index.html` | splash — sells the thing, pushes into the demo | multiple "Launch the demo" CTAs (nav, hero, launch band, closing) |
| `<project>/demo/index.html` | the demo — a working, clickable slice of the product | opens from `file://` with the network off and you can actually use it |

**The demo is the deliverable. The splash is the wrapper.** If the session ends with one
HTML file, the job is not done — no matter how good that file is. A splash page with a dead
"Launch the demo" button is the single most common failure of this pipeline; check the button
before you call it finished.

## The one failure this skill exists to prevent

**Designing from a description when the artifact is one click away.** Every rebuild in run 1
had the same root cause:

| Rebuild | What was used | What should have been opened |
|---|---|---|
| 1 | the README | the actual components — the real control model |
| 2 | an invented palette | the screenshots in the repo — the app's real look |
| 3 | a card's `href` | the reference demo's live URL itself |

Plus a fourth class: **verifying over `python3 -m http.server`**, which sends no framing/CSP
headers and resolves bare directories — so it silently passes exactly the two bug classes
that then fail in production.

A pointer that says "look first" gets skipped. So RECON is gated: it produces a written
artifact, and later phases consume it. **No design decision may be made before `recon.md`
exists.**

## Phase 0 — RECON (produces `recon.md`; nothing else starts without it)

**Before anything else — confirm the target is worth featuring.** Recon reads the disk, and
the disk does not know who a project was built for or whether it should be seen publicly.
Name the target and ask, in one line, before any design decision. An unattributed third-party
brand in the source is a signal to ask, not a default to quietly neutralise. (One run was
built end to end and then withdrawn: it was a throwaway for a named client, which no file on
the machine recorded.)

Write `<project>/recon.md` in the working directory. Required sections:

- **Locate everything.** The canonical repo plus every parked, archived or duplicated
  sibling. One project is usually 4+ directories. List them all with paths.
- **The running artifact.** Screenshots in the repo, design explorations, a build output,
  or actually start it. Record **hex values and font stacks**. "Clean and modern" is not
  recon and does not satisfy this section.
- **The full surface, from the code.** Enumerate every page/route from the router or route
  table (`routes.ts`, `App.tsx`, `urls.py`…) and list them in recon.md with what the demo
  will cover. A screenshot in `assets/` is dated evidence, not the current UI — it can
  predate a whole redesign. (One run built a single scrolling overview from a pre-SPA
  preview image; the live app had 11 routed pages.)
  The same holds below page level: any component the demo re-creates is rebuilt from its
  SOURCE file and its real name, never from its README. A README describes; the source is
  the referent. (Another run rebuilt a dashboard from `README.md` while the module defining
  its 17 panels sat beside it, and shipped an agent under the wrong name because the README
  abbreviated it.)
- **Every third-party surface the demo imitates** (Telegram, Slack, Gmail) is a reference
  too: record its real layout parts before building, then render and compare against it.
- **The reference.** If the brief says "like X", OPEN X and record its tokens and page
  structure. Never infer X from a link.
- **The data/domain layer.** Content libraries, domain tokens, migrations, seed data. The
  architecture story lives here, not in the README.
- **The aesthetic question, asked explicitly.** "The app's own look, or the portfolio's?"
  These conflict, the answer is not guessable, and for an older project the owner may not
  want fidelity to what they built when less experienced. Ask; do not decide.
- **Original language.** If the product is not English-first, the demo opens in its original
  language with a working toggle. Translating it to English flattens the local specificity
  that is often the entire differentiator.

## Phase 1 — THESIS

One non-obvious decision worth showing. Not "I built an app" — the decomposition.

> Example, from a contract-drafting tool: *the model never writes the contract; it picks a
> posture and the text is retrieved.*

Test: can it be said in one sentence that would make a peer engineer raise an eyebrow? If
not, go back to the domain layer — the thesis is in there.

## Phase 2 — BUILD (both files, in this order)

Build the **demo first**. It is the hard half and the thing being sold; a splash written
before the demo exists ends up promising something the demo does not do.

- **demo** — one self-contained HTML. Seeded data, no backend, no keys, no model call.
  Opens from `file://` with the network off. Cover the routes recon enumerated, not just
  the one you have a screenshot of.
- **splash** — a marketing page that sells and pushes into the product. Multiple "Launch
  the demo" CTAs. NOT a case study with a provenance section; that reads as an academic
  exercise.
- Wear the product's own skin so launching feels like entering the product.
- Architecture section: **only when the thesis is structural.** Do not force it.

Both files follow the `demo-artifact` packaging standard: single file, everything inline,
no CDN, no external fonts, works offline.

## Phase 3 — HONESTY PASS (non-negotiable; it is the credibility move)

Cross-tab the real data, find a genuine gap, put it on the page.

> Example: 7 of 9 risk×stance cells populated, mass on a diagonal — so the axes are
> modelled independent and populated correlated.

Naming your own gap reads as someone who understands their system. Never manufacture a fake
weakness, and never soften a real one into a feature.

## Phase 4 — VERIFY (scripted, not eyeballed; re-run after ANY restyle)

Both scripts ship with this skill, in `scripts/`.

```bash
python3 scripts/check-links.py <project>/index.html <project>/demo/index.html
node scripts/check-render.mjs <project>/index.html <project>/demo/index.html --width 390,1280
```

`check-links.py` is stdlib-only and needs nothing. `check-render.mjs` needs Playwright
(`npm i playwright && npx playwright install chromium`) — installed either in the project
being checked or beside the script; it resolves from both, and names the fix if it is absent.

| # | Check | Mechanism |
|---|---|---|
| 1 | Every internal `href`/`src` resolves to a FILE, not a directory | `check-links.py` — resolves as a `file://` browser would |
| 2 | CSS specificity: no bare-element descendant rule outranking a component class | `check-render.mjs` — compares the winning rule's computed colour against overridden class rules |
| 3 | Contrast ≥ 4.5:1 (3:1 large) against the **resolved** ancestor background | `check-render.mjs` — composites translucent layers up the tree |
| 4 | 390px: page overflow 0; wide things scroll inside their own container | `check-render.mjs --width 390` |
| 5 | Full interaction run, programmatic, **against the deployed URL** — not localhost | manual/Playwright, per demo |
| 6 | The splash's "Launch the demo" CTA actually opens the demo | click it, in the place it will be viewed |

Check 2 is the one that cannot be caught by reading: `.navlinks a` beats `.btn-dark`, and the
CSS reads correctly in isolation. It shipped in two separate runs.

`check-render.mjs` is mutation-tested: injecting `div.mutwrap a { color:#111 }` over
`.btn-x { color:#fff }` produces `FAIL specificity`, and known-good pages produce none.

## Phase 5 — SHIP

Deploy, wire up whatever index or portfolio links to it, then **confirm the live URL by
fetching it**. Never quote a URL you have not curled.

Host-specific things that have bitten this pipeline, worth checking on yours:

- **If your host has an auth/passcode layer, a new directory is usually gated by default.**
  Whatever allowlist your proxy or middleware reads, add the new path to it in the same
  commit. This is invisible locally — `file://` and any dev server serve it fine.
- **Confirm which host is actually production before quoting a URL.** A vanity domain can
  be pinned to an old deployment that does not follow production. Check what the deploy
  actually published, every run — this has been wrong twice.
- **Re-check ~60s after deploy.** Edge networks propagate static files before proxy config,
  so a public path can 401 for about a minute after the assets already return 200.
- **Check the framing headers in the delivery context.** `X-Frame-Options: DENY` will block
  a demo from being iframed by its own splash page. A local dev server will not show you this.

## Standing decisions (settled across three runs — do not relitigate)

- **Variant generation is not part of this flow.** When the artifact exists, variants are
  four inventions competing with a real thing. Recon replaces them. Keep variant-first
  methods for greenfield.
- **Architecture section only when the thesis is structural.**
- **Non-English products open in their original language,** with a working toggle.
- **Two files or it is not done.**
