# design.md — Cotabby (cotabby.app)

Captured-design contract for the Cotabby marketing site (v0.6.2-beta). Tokens are **extracted from the site's own CSS** (`:root` block and `.tabby-*` classes), then cross-checked against 14 mobile screenshots and one desktop screenshot.

> **Confidence key**
> - **[css]** copied from the stylesheet. Exact.
> - **[screenshot]** read by eye from a screenshot (not found as a token in the CSS provided). Close, not exact.
> - **[unconfirmed]** reasonable inference; verify before relying on it.

---

## 1. Brand essence

- **What it is:** Free, open-source (AGPL-3.0) macOS menu-bar app. AI autocomplete as ghost text, accept with Tab. Runs on Apple Intelligence or local GGUF models. Nothing leaves the Mac.
- **Look:** *Neo-brutalist sticker book.* Every card, button, chip and icon is a die-cut "sticker": 2px near-black outline, hard solid shadow dropped straight down, flat saturated fill, on warm cream paper.
- **Personality:** Cozy, playful, a bit cheeky, indie-maker. "The basics, without the enterprise brochure voice."
- **Mascot:** A tabby cat. Logo = white cat hugging a pole on a blue rounded-square. A dark striped cat naps across the hero shell's lower edge (tail hanging down, floating "z"s); cat ears peek over the tops of the Install, Comparison and FAQ cards.

## 2. Colour

### Core tokens [css]

| Token | Value | Role |
|---|---|---|
| `--background` | `#f5efe1` | Page background (warm cream; paper-speckle texture sits on top [screenshot]) |
| `--foreground` | `#1c1c1c` | Text, headlines, selection text |
| `--muted-foreground` | `#4a4a4a` | Body copy, nav links, `.tabby-link` |
| `--subtle-foreground` | `#595959` | Captions, stat row, tertiary text |
| `--surface-1` (`--surface-2`) | `#faf7f0` | Shell, panels, chips, cards, fake app windows |
| `--surface-3` | `#f3ecdc` | Open FAQ item, soft fills |
| `--surface-4` | `#ebe1cc` | Deeper cream fills (tracks, wells) |
| `--line` | `#1c1c1c` | All outlines and hard shadows |
| `--line-soft` | `#1c1c1c1f` (12% ink) | Hairline dividers (e.g. table rows, step rules) |
| `--accent` | `#ff8273` | Coral (soft) |
| `--accent-deep` | `#f56a59` | Coral (deep); hero headline highlight |
| `--accent-soft` | `#ffd6cf` | Pale coral wash |
| `--accent-pink` | `#ec4899` | "Support Cotabby" label and heart |
| `--accent-blue` / `--button-blue` | `#007aff` | Primary action (Download for Mac), logo tile, links |
| `--button-blue-hover` | `#0062d6` | Blue hover |
| `--accent-green` | `#43bd6e` | Check badges, permission toggles |
| `--button-primary` | `#1c1c1c` | Ink button (hover `#000`) |
| *(secondary button)* | `#3a3a3a`, hover `#2a2a2a` | "Star on GitHub", key caps |
| `--button-text` | `#fff` | Text on filled buttons |
| selection | `#ff827347` | `::selection` background |

### Icon-tile palette [css, Tailwind values]

violet-500 `#8d54ff` (autocomplete) · amber-400 `#fcbb00` (emoji) · sky-500 `#00a5ef` (macro) · amber-500 `#f99c00` · emerald-500 `#00bb7f` · rose-500 `#ff2357` · fuchsia-500 `#e12afb` · zinc-500 `#71717b` · red-500 `#fb2c36`.

### Screenshot-only values

| Item | Value | Status |
|---|---|---|
| Announcement bar | ≈ `#2962cf` with white text | [screenshot] |
| "No" cross badge in comparison table | soft red ≈ `#f0897a` | [screenshot] |

### Rules

- Black (`--line`) outline + hard shadow on every card-like or interactive element. No blurred shadows.
- Blue = act. Coral = one headline emphasis. Pink = support/heart only. Green/red = yes/no only. Violet/amber/sky = feature identity tiles.
- Brand icons (Gmail, Slack, etc.) keep their own colours inside cream tiles.
- Light theme only. Demo recordings inside cards are dark-mode app windows, which gives strong contrast on the cream.

### Contrast audit (computed from the exact tokens)

| Pair | Ratio | Verdict |
|---|---|---|
| `#1c1c1c` on `#f5efe1` | 14.9:1 | Pass |
| `#4a4a4a` on `#faf7f0` | 8.3:1 | Pass |
| `#595959` on `#f5efe1` | 6.1:1 | Pass (also 5.4:1 on `--surface-4`) |
| white on `#3a3a3a` / `#1c1c1c` | 11.4 / 17.0:1 | Pass |
| white on `#0062d6` (hover) | 5.7:1 | Pass |
| white on `#007aff` (resting Download button) | **4.0:1** | **Fails AA for normal text.** Passes for large/bold text (≥18.66px bold), so keep the label bold at 19px+ or darken the resting blue to `#0062d6` |
| `#007aff` link text on `#faf7f0` | **3.75:1** | **Fails for body-size links.** Underline them or use `#0062d6` (5.1:1 on cream, approx.) |
| `--accent-deep #f56a59` on `#faf7f0` | **2.8:1** | **Fails even the 3:1 large-text bar.** The "for macOS." H1 highlight is the only use; the same words appear in the subcopy, so meaning is not lost, but for an accessible rebuild use `#c9301f` (5.0:1) |
| `--accent #ff8273` as text | **2.3:1** | Fails. Use only as a fill; ink text on it is 7.1:1 |
| `--accent-pink #ec4899` on `#faf7f0` | **3.3:1** | **Fails for small text.** "Support Cotabby" in the hero stat row is small. Use `#be185d` (5.6:1) |
| white check/× glyph on `#43bd6e` | **2.4:1** | **Fails the 3:1 bar for graphics.** Use an ink `#1c1c1c` glyph on the green badge (7.1:1) |
| Input placeholder (browser default 50% mix of ink on white ≈ `#8e8e8e`) | ≈3.3:1 | **Fails.** Set placeholder to `--subtle-foreground` |

## 3. Typography

- **Display [css]:** `Bricolage Grotesque`, weight **800** only, `letter-spacing: -0.035em` (class `.tabby-display`). Fallback: Arial with size-adjust 105.43% (ascent 88.21%, descent 25.61%). Exposed as `--font-display`.
- **Body [css]:** `OpenRunde` (registered as `bodyFont`), weights 400 / 500 / 600 / 700, `font-display: swap`. Fallback: Arial with size-adjust 107.64%. Exposed as `--font-body`. **Body default weight is 500.**
- **Mono [css]:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`.
- **Type scale in use [css]:** `.75, .875, 1, 1.125, 1.25, 1.5, 1.875rem` (Tailwind steps) plus custom `0.55 / 0.6 / 0.65 / 0.68 / 0.7 / 0.78 / 0.8 / 0.82 / 0.95 / 1.02 / 1.05 / 1.08 / 1.1 / 1.15 / 1.22 / 1.35 / 1.55 / 1.65 / 1.7 / 1.8 / 2 / 2.1 / 2.3 / 2.4 / 2.5 / 2.6 / 2.7 / 2.8 / 2.9 / 3.4 / 6rem`. The 6rem step is almost certainly the giant footer wordmark; the 2.1–3.4rem steps are the display headings. [unconfirmed which size maps to which element]
- **Line-height on display [css]:** 0.88, 0.94, 0.95, 1.02 (very tight); body uses `leading-relaxed` (1.625) and base 1.5.
- **Tracking [css]:** `-0.025em` (tight), `0.025em` (wide), `0.1em` (widest, used for small uppercase eyebrows such as BETA, MACOS INSTALL, FEATURE).
- **Casing [observed]:** Hero H1 sentence case ("AI autocomplete for macOS."); section titles lowercase; step titles sentence case ("Install once"); small eyebrows uppercase with wide tracking.

## 4. Layout, spacing, surfaces

- **Spacing unit [css]:** `--spacing: 0.25rem` (Tailwind 4 scale; paddings and gaps are multiples of 4px).
- **Containers [css]:** `max-w-shell` = **85rem** (1360px) for the big hero shell; `max-w-content` = **76.25rem** (1220px) for sections; prose columns use 34rem, 36rem (xl), 42rem (2xl), 48rem (3xl), 56rem (4xl).
- **Breakpoints [css]:** 40rem, 48rem, 64rem, 80rem, 96rem (Tailwind defaults); marquee also changes at 640px.
- **Outline [css]:** `2px solid var(--line)` on shell, panel, chip, button. Dividers use `--line-soft`.
- **Hard shadows [css], straight down, no blur and no x-offset:**

| Token | Value | Use |
|---|---|---|
| `--shadow-tabby-2xs` | `0 2px 0 var(--line)` | Button pressed |
| `--shadow-tabby-xs` | `0 3.4px 0 var(--line)` | Button hover |
| `--shadow-tabby-sm` | `0 5px 0 var(--line)` | Chips (`.tabby-chip`) |
| `--shadow-tabby` | `0 6.7px 0 var(--line)` | Panels and buttons at rest (`--shadow-card`) |
| `--shadow-tabby-xl` | `0 11.8px 0 var(--line)` | Hero shell (`--shadow-shell`) |

- **Radii [css]:** Tailwind `md .375rem · lg .5rem · xl .75rem · 2xl 1rem · 3xl 1.5rem · 4xl 2rem`, plus custom `0.3 / 0.5 / 0.55 / 0.7 / 0.8 / 0.95 / 1.1 / 1.3 / 1.5 / 1.55 / 1.6 / 1.85rem` and `rounded-full`. Rough mapping from screenshots: hero shell ≈ 4xl–1.85rem; panels ≈ 1.5–1.6rem; buttons and inputs ≈ 1–1.1rem (rounded rectangles, not pills); icon tiles ≈ 0.8–1.1rem; key caps ≈ 0.7rem. [unconfirmed per-element]
- **Backgrounds:** body is `--background` with a paper-speckle texture; hero shell has a faint dot grid. Neither pattern is in the CSS provided, so they are image assets. [screenshot]

## 5. Components

Class names are the site's own, for reference.

**Shell / panel / chip** (`.tabby-shell`, `.tabby-panel`, `.tabby-chip`) — `2px` outline, `--surface-1` fill, shell uses `--shadow-tabby-xl`, panel `--shadow-tabby`, chip `--shadow-tabby-sm`.

**Button** (`.tabby-button` + variant) — `2px` outline, `--shadow-tabby`, `overflow: hidden`.
- Variants: `-blue` (`#007aff`, white text), `-secondary` (`#3a3a3a`, white text), `-primary` (`#1c1c1c`, white text).
- Hover (hover-capable devices): shadow → `-xs`, `translateY(2px) scale(.985)`, a diagonal highlight sweeps across (120° gradient, 0.52s).
- Active: shadow → `-2xs`, `translateY(3px) scale(.98)`.
- Focus-visible: `outline: 2px solid var(--foreground); outline-offset: 4px`.
- `.tabby-button-shimmer`: the highlight sweeps on a 5s loop (used on Download); stops on hover.
- Transition: transform `.22s cubic-bezier(.22,1,.36,1)`; colours `.18s`.

**Link** (`.tabby-link`) — `--muted-foreground`, becomes `--foreground` on hover; `.18s` colour/transform transition; no underline except the announcement-bar link.

**Announcement bar** — full-width blue [screenshot], white text, underlined link; wraps to two lines on mobile.

**Logo lockup** — blue rounded tile (outline + hard shadow) with the cat-on-pole glyph, "Cotabby" in display type, small `BETA` in wide-tracked uppercase. Logo has a `tabby-logo-ping` bounce (0.72s, `cubic-bezier(.34,1.56,.64,1)`).

**Nav** — lowercase links in `--muted-foreground`: help · compare · how it works · privacy · faq · contact. Wraps on mobile. On desktop it sits inline in the shell header next to a "join mailing list" input and a square blue arrow button.

**Mailing-list input** — white fill, outline + hard shadow, adjacent square blue submit button with white arrow; 2px divider rule below the header.

**Floating CTA dock** — fixed bottom-right pair: white "Support Cotabby" (pink heart) over blue "Download for Mac" (shimmer). Enters with `tabby-float-cta-enter` (1s, rise 14px + fade + scale from .98). Overlaps content on mobile, so leave bottom padding.

**Stat row** — `v0.6.2-beta · 15k+ installs · 1k+ stars · AGPL-3.0 ·` in `--subtle-foreground`, with a pink "Support Cotabby ♥" link.

**Fake app window (hero demo)** — `--surface-1` card, macOS traffic-light dots, app chip (Gmail icon + "Gmail — Compose"), To/Subject rows, large body text, dark `⇥ tab` key cap. On desktop it is a "Notes — Weekend trip" window with the key cap bottom-right.

**App marquee** — two rows of chips (brand icon in a circular outline + label), each chip a `.tabby-chip`. Tracks: `tabby-marquee-track` 72s linear infinite (`translateX 0 → -50%`), `-reverse` 88s; gap 1rem (1.25rem ≥640px); desktop duration 60s. Paused under reduced motion.

**Feature card** — panel with dark video thumbnail + play button on top, then a coloured icon tile (violet / amber / sky, with outline + shadow), lowercase title, body.

**Step card** — large display numeral (01 / 02 / 03) + hairline rule, H3, body, inset mini-UI: install drag-zone (dashed border), app-icon stickers + dashed "+ anywhere" chip, `⇥ tab` key cap with 0/3 tap demo. Cat ears peek over card 01.

**Testimonial card** — panel with Reddit avatar, `u/username`, a small coral/orange upvote arrow in a soft circle; cards are **rotated slightly in alternating directions** and overlap. [screenshot]

**Permission card** — panel: grey icon tile (zinc), bold title, one-sentence description, green toggle (on) at right.

**Customisation list** — one panel with a dark settings-window video thumbnail above five rows (pale `--surface-3` icon tile with coloured line icon, bold lowercase title, description).

**Model cloud** — large blue Cotabby tile on the right; model-logo chips (Apple Intelligence, Qwen, DeepSeek, Gemma, Kimi) on the left joined by soft grey curves; dashed "+" tile.

**Comparison table** — panel with cat ears on top, columns Feature · Cotabby · Cotypist (grid: `minmax(0,1fr) 4.5rem 4.5rem`). Cells are square outlined badges: green (`--accent-green`) with check, soft red with ×. Rows separated by `--line-soft`.

**FAQ accordion** — stacked panels with a line icon + bold question; open item fills `--surface-3` with a hairline under the question; cat ears peek above the list.

**Footer** — repeated Download + GitHub buttons, divider, logo lockup, link list (Help · Cotabby vs Cotypist · Mac autocomplete guide · Compatibility · Security · Privacy · Terms of Service · Release notes), email, three social sticker tiles (LinkedIn, X, Discord), and a giant translucent grey "cotabby" wordmark (≈6rem) bleeding off the bottom edge.

## 6. Imagery and iconography

- Flat near-black striped-tabby illustrations (sleeping, ears, tail). White cat-on-pole glyph for the logo.
- 2px-stroke rounded line icons (Lucide-style) inside outlined tiles.
- Official app and model logos, always in cream tiles.
- Real dark-mode screen recordings as video thumbnails with centred play buttons.
- No photography; no gradients except the button highlight sweep.

## 7. Motion [css]

| Animation | Spec |
|---|---|
| Button sweep (`tabby-button-shimmer-sweep`) | 5s loop, rests for the first 68%, sweeps 68–92% |
| Marquee | 72s / 88s reverse linear infinite (60s on desktop) |
| Cat breathe | 4.5s ease-in-out infinite, `scale 1 → 1.014`, origin 50% 80% |
| Cat "z" float | 8s ease-out infinite, rises 64px, rotates up to 10°, fades; second z delayed 3.2s |
| Ears peek | 5s ease-in-out infinite, `translateY 0 → -3px` |
| Logo ping | 0.72s spring on interaction |
| Floating CTA enter | 1s `cubic-bezier(.22,1,.36,1)` |
| Default transition | `.15s cubic-bezier(.4,0,.2,1)`; links `.18s` |

**Reduced motion [css]:** marquee stops, button hover transform/sweep removed, and the floating CTA, logo, cat and ears animations are disabled (z's hidden).

## 8. Voice and copy

- Lowercase, conversational section titles; short sentences; concrete numbers (2–4 words or 12–20, 1–5 GB, macOS 14+).
- Product in third person ("Cotabby watches your cursor"), user as "you".
- Privacy stated flatly: no cloud, no telemetry, no analytics.
- Social proof is blunt, unedited Reddit quotes.
- CTAs: "Download for Mac", "Star on GitHub", "Support Cotabby", "join mailing list".
- Avoid: enterprise, revolutionary, supercharge, seamless, "AI-powered" as a headline.

## 9. Accessibility

- Fix the contrast failures in §2 (resting blue button text, blue links, coral headline, pink label, white glyph on green, placeholder).
- Keep the existing 2px ink focus ring (offset 4px); it works well on the cream.
- Check/cross badges pair colour with a glyph, which is right; keep both.
- Video thumbnails need accessible names and captions/transcripts.
- Floating CTA dock must not trap focus or hide content on small screens; add bottom padding or hide near the footer CTA.
- Decorative cats `aria-hidden`; duplicated marquee content `aria-hidden` with a static list for screen readers. Reduced-motion rules already exist; keep them.

## 10. Do / Don't

**Do**
- 2px ink outline + straight-down hard shadow on every card, chip and button.
- Heavy Bricolage Grotesque (800, -0.035em) for headlines; OpenRunde for everything else.
- One colour per job (blue act, coral emphasise, pink support, green/red yes/no).
- Press-down button behaviour (translate + shadow shrink).
- Let the cat peek, nap and dangle.

**Don't**
- Don't use blurred shadows, glassmorphism, gradients or full-pill buttons.
- Don't set headlines in any weight but 800, or with default tracking.
- Don't put coral or pink text on cream at small sizes.
- Don't write corporate copy.

## 11. Still unconfirmed

- Which exact rem size each heading uses at each breakpoint.
- The paper-speckle and dot-grid image assets.
- Announcement-bar blue and the soft-red "no" badge (taken from screenshots, no token found).
- Per-element radii (CSS lists the scale, not which element uses which).
- Behaviour of the desktop layout beyond the one screenshot.
