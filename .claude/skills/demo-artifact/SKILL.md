---
name: demo-artifact
description: >
  The self-contained HTML shipping standard for every demo, landing page, dashboard,
  one-pager, pitch doc, report, or shareable client deliverable. Fires AUTOMATICALLY
  whenever a session is about to build any single-page HTML artifact meant to be shared
  or shown — you should never have to invoke it by name. Output is ONE .html file with
  embedded CSS/JS, zero external dependencies, that opens correctly from a file://
  double-click with the network OFF, and looks studio-grade: warm-dark or bone palette,
  one-token theming, condensed period-per-line hero.
---

# Demo Artifact — the self-contained HTML standard

The rule: every deliverable leaves your hands as a single `.html` file. Not a link,
not a Notion page, not a Google Doc. A file that works offline, never goes down, and opens
instantly on any device. This skill makes that the default.

## Fire automatically
Any time the session builds a demo, landing page, hero, dashboard, one-pager, pitch,
capability showcase, audit/report, or "share this with a client" artifact. No invocation
needed. If a separate aesthetics/design skill is also active: **that one governs the look,
this one governs packaging and the offline guarantee.** They don't compete.

## Start from a scaffold (don't hand-roll structure)
`assets/` holds four building blocks — fork, don't rebuild:

| Asset | Use for |
|-------|---------|
| `standalone-light-scaffold.html` | reports, audits, findings docs (bone/cream, sidebar nav) — for *informing* |
| `standalone-dark-scaffold.html` | demos, pitches, showcases, landing exports (dark, kinetic hero) — for *impressing* |
| `hero-template.html` | the condensed period-per-line hero + feature/steps/CTA sections |
| `design-tokens.css` | the token system + collision-checked accent presets |

Rule of thumb: **impressing → dark. Informing → light.** Fork one, rename it
`product-name-v1.html`, change the `PRODUCT_SLUG` string near the top of the `<script>`
(it isolates the localStorage keys), then replace content and delete sections you don't need.
Restraint matters: use four or five section types, not all of them.

Everything inside `hero-template.html`'s `<body>` is fictional example copy for a made-up
product called Meridian. It is there to show the shape, not to be kept. Replace all of it.

## The rules this skill enforces (encode these, don't just link)

**(a) Single self-contained file.** One `.html`, all CSS/JS inline. No CDN links, no
analytics, no external fonts, no external images. Inline SVG and `data:` URIs are fine;
external `http(s)://` URLs are not.

**(b) Theme by swapping ONE token.** All color lives in the `:root` block of the embedded
`design-tokens.css`. Change exactly one line to rebrand:
```css
--color-accent: #2D6EE8;   /* the only line you swap per product */
```
Collision-checked presets (all safe against the locked AI-action yellow `#F0C040`):
Signal blue `#2D6EE8` · Teal green `#1A9B62` · Violet `#7C3AED` · Cyan `#0891B2`.
Never set the accent to yellow/orange or within 30 hue degrees of `#F0C040` — that hue is
reserved for AI actions, so an accent near it makes "the machine did this" unreadable.
Locked base tokens (do not touch): `--color-bg: #F5F0EB` (bone),
`--color-text: #1A1A1A` (near-black), `--color-ai-action: #F0C040`.

**(c) Hero = condensed, period-per-line, 3 colors.** Barlow Condensed ExtraBold, 64px+,
one period-terminated line each, exactly three colors (line 1 neutral, line 2 accent,
line 3 outcome). One example:
```
ONE DASHBOARD.   ← bone/white (the thing)
EVERY GUEST.     ← accent      (the scope)
FULLY AUTOMATED. ← outcome color (what they get)
```
The periods are visual anchors, not grammar — keep them. One accent word per section, not many.

**(d) Warm palette baseline, never pure.** Dark = warm near-black `#0d0908` (add a radial
vignette), light = bone `#f5f0e8`. Pure `#000` reads cold; pure `#fff` reads unfinished.

**(e) Finish gate — this IS the acceptance test.** The file must open correctly from a
`file://` double-click with the network OFF. Before calling it done: `grep -n 'http' file.html`
— every hit must be a comment, an SVG xmlns, or a `data:` URI, never a live-loaded resource.
If it fails offline, it is not done. Actually turn the wifi off and open it once; a grep
that passes and a page that renders are two different claims.

**(f) Outbound links/CTAs — real anchors, never `window.open()`.** When the file is hosted
inside a sandboxed viewer (a Claude Artifact, an iframe embed, some email previewers), the
sandbox blocks script-triggered popups — `onclick="window.open(url)"` silently does nothing,
with no error. Use `<a href="url" target="_blank" rel="noopener">` instead; a real anchor
click survives the sandbox. Before calling any artifact with an outbound link done, click it
once in the place it will actually be viewed. "The code looks right" is not the same check as
"I clicked it and it opened." This rule exists because a `window.open()` CTA shipped on a live
deck and the button was dead for everyone who touched it.

**Font note:** all three HTML assets use a condensed *system* stack
(`'Barlow Condensed','Arial Narrow',system-ui,sans-serif`) and ship zero webfonts, on
purpose — a CDN font link breaks rule (a) quietly, because the page still renders, just in
the wrong face. If you want the real Barlow Condensed, embed it as a base64 `@font-face`.
Never re-add the `<link>`.

## Ship path (reference, don't automate)
A finished single-file `index.html` is already deployable as-is: drag it into Netlify Drop,
push it to a GitHub Pages repo, or commit it as `app-name/index.html` in any Vercel-connected
repo and it goes live on the next push. The point of the single-file rule is that the deploy
step is never the hard part. Mention the path; don't run it unless asked.

## Known contrast gaps in the shipped assets (verify before you trust them)

Run `project-to-portfolio/scripts/check-render.mjs` over anything you build from these.
Measured against WCAG AA on the assets as shipped:

| Asset | Status |
|---|---|
| `standalone-light-scaffold.html` | **passes** at 390px and 1280px |
| `standalone-dark-scaffold.html` | muted text `#555250` on `#0d0d0d` is 2.5:1; accent CTAs (white on `#7B61FF`) are 4.2:1 |
| `hero-template.html` | the hot-pink accent is the issue: white on `#FF2D78` is 3.56:1, pink on bone is 3.14:1 |

These are palette-level, not layout bugs — raising them means changing the accent colours,
which is a brand decision rather than a fix. Decide deliberately: either darken the accent
until it clears 4.5:1, or reserve the accent for large text only (3:1) and keep body copy on
the neutral tokens. What you must not do is ship it unmeasured and assume it is fine.

## Honest limit
The scaffolds raise the floor, not the ceiling. They give structure, tokens, and the offline
guarantee. They can't supply copy that earns the layout, or the restraint to delete sections
you don't need — those come from reps.
