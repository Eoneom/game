# Slice 040 — Readability: typography scale and flat data theme

**Status**: Implemented on `main` (slice 040): semantic type tokens replace Tailwind's default size scale (`--text-*: initial`), every size class of `apps/web/src` migrated (no size below 12 px left, map labels 12 / 14), flat surfaces replace scanlines and textures behind text, ambient embers removed, palette `ink` / `label` / `muted` / `edge`, global `:focus-visible` outline, and the `typography-guard` / `palette-contrast` vitest guards. See [Implementation notes](#implementation-notes).

## Summary

The player finds the web client hard to read on a 27" screen. The text is small (most content is 14 px `text-sm` or 12 px `text-xs`, some labels go down to 9.6 px), the panels sit on metal / rust textures with a scanline overlay drawn **over** the workspace, and amber, label and dim text look almost the same, so there is no clear hierarchy.

This slice keeps the rusty-bunker mood and the Oxanium font, and fixes legibility for a **1920 × 1080** desktop:

- a **semantic type scale** as Tailwind v4 theme tokens in `apps/web/src/index.css`: **16 px body**, 12–14 px secondary text, **floor 12 px**;
- a **mechanical mapping** from today's classes (`text-xs`, `text-sm`, arbitrary `text-[10px]`…) to the new tokens, applied to every screen;
- **flat data panels**: no scanlines or textures behind text; textures stay only where no text sits;
- **contrast**: every text colour checked against every panel surface (WCAG AA target, ratios computed below), with three new tokens and one adjusted one;
- **spacing and density rules** for tables, cards, lists and forms;
- a **vitest guard** that fails the build when a text size below 12 px, an arbitrary font size, a raw Tailwind size class or a texture behind text comes back.

This slice changes no layout structure: the shell rework is [`041`](../041-app-shell-navigation/spec.md), the city home page is [`042`](../042-city-dashboard/spec.md). Source of truth for the decisions: [`docs/ui-revamp-decisions.md`](../../docs/ui-revamp-decisions.md).

**Depends on**: [`019`](../019-web-shell-routing/spec.md) (shell, `index.css`). Lands **first** among the UI revamp slices 040–047; later slices use its tokens and must pass its guard.

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Target** | Design for **1920 × 1080** desktop. No tablet or phone work. |
| **Body text** | **16 px (1 rem)**, line height 24 px. |
| **Secondary text** | **12–14 px** (captions, labels, table meta). **Never below 12 px**, anywhere in `apps/web/src`, the operator console included. |
| **Font** | Oxanium stays (weights 400 / 500 / 600 / 700 already loaded). Numbers keep `font-mono tabular-nums`. |
| **Mood** | Rusty-bunker palette kept. **No scanlines or textures behind text**; data sits on **plain panels**. |
| **Contrast** | WCAG **AA** for all text (≥ 4.5 : 1 at every size we use, since nothing is "large text" below 18.66 px bold / 24 px). Form field borders and focus rings ≥ 3 : 1. |
| **Tokens** | Font sizes are **semantic theme tokens** (`text-caption`, `text-meta`, `text-body`, `text-heading`, `text-title`, `text-page`, `text-display`); raw Tailwind size classes and arbitrary font sizes are forbidden after the migration. |
| **Guard** | A vitest test scans the sources; no ESLint rule (the web app has no ESLint config today). |

## Target viewport and layout widths

The browser viewport on a 1920 × 1080 screen is about **1920 × 960** once browser chrome is removed. All values below are in CSS pixels at 100 % zoom; every size is in `rem`, so browser zoom keeps working.

| Area | Width / height at 1920 × 960 | Owner |
| --- | --- | --- |
| Header (command bar) | full width × **56 px** | [`041`](../041-app-shell-navigation/spec.md) |
| Left column (navigation + activity) | **256 px** (`w-64`) | [`041`](../041-app-shell-navigation/spec.md) |
| Right column (locations) | **224 px** (`w-56`) | [`041`](../041-app-shell-navigation/spec.md) |
| Chat bar | full width × **40 px** collapsed, **288 px** open | [`041`](../041-app-shell-navigation/spec.md) |
| Workspace | 1920 − 256 − 224 = **1440 px** wide, padding **24 px** → **1392 px** of content; about **864 px** high with the chat collapsed | this slice (rules below) |

Width rules for the workspace:

| Rule | Value |
| --- | --- |
| Global max width | **None.** The workspace fills the space between the two columns: catalogue grids with their fixed details panel and the map need the width. |
| Reading text (report bodies, mail bodies, details descriptions, help ledes) | `max-w-[72ch]` (about 640 px at 16 px). |
| Standalone forms (signup, mail compose, alliance creation) | `max-w-[40rem]` (640 px). |
| Smallest supported viewport | **1280 × 720** must stay usable without horizontal page scroll (workspace 800 px). No design work below that. |
| Root font size | Stays at the browser default (16 px). Never set `html { font-size }`. |

## Typography scale

Tokens defined in the `@theme` block of `apps/web/src/index.css`. Tailwind v4 generates one `text-<name>` utility per `--text-<name>` variable (size, line height and optional weight).

| Token / utility | Size | Line height | Weight | Use |
| --- | --- | --- | --- | --- |
| `text-caption` | **12 px** (0.75 rem) | 16 px | 500 | The floor. Uppercase labels, table column headers, badges, units, timestamps, keyboard hints. Never for sentences. |
| `text-meta` | **14 px** (0.875 rem) | 20 px | 400 | Secondary text: ledes, hints, secondary table columns, button labels, chat lines, field labels. |
| `text-body` | **16 px** (1 rem) | 24 px | 400 | Default for all content: paragraphs, list rows, table cells, nav links, inputs, values. |
| `text-heading` | **18 px** (1.125 rem) | 24 px | 600 | Panel / card titles (`h2`, `h3`). |
| `text-title` | **20 px** (1.25 rem) | 28 px | 600 | Details panel `h1`, header brand, admin page titles. |
| `text-page` | **24 px** (1.5 rem) | 32 px | 600 | Page `h1` (city / outpost name on the dashboard). |
| `text-display` | **30 px** (1.875 rem) | 36 px | 700 | « EONEOM » on the login and signup screens only. |

`index.css` change (sketch):

```css
@theme {
  /* Drop Tailwind's default size scale so only the semantic tokens exist. */
  --text-*: initial;
  --text-caption: 0.75rem;   --text-caption--line-height: 1rem;      --text-caption--font-weight: 500;
  --text-meta: 0.875rem;     --text-meta--line-height: 1.25rem;
  --text-body: 1rem;         --text-body--line-height: 1.5rem;
  --text-heading: 1.125rem;  --text-heading--line-height: 1.5rem;    --text-heading--font-weight: 600;
  --text-title: 1.25rem;     --text-title--line-height: 1.75rem;     --text-title--font-weight: 600;
  --text-page: 1.5rem;       --text-page--line-height: 2rem;         --text-page--font-weight: 600;
  --text-display: 1.875rem;  --text-display--line-height: 2.25rem;   --text-display--font-weight: 700;
}

@layer base {
  body { @apply text-body text-ink; }
}
```

Other typography rules:

| Rule | Value |
| --- | --- |
| Uppercase | Only with `text-caption` or `text-meta`, only for labels of at most three words (column headers, section labels, button labels). Never for sentences or descriptions. |
| Letter spacing | `tracking-wide` (0.025 em) or `tracking-wider` (0.05 em) with uppercase only. The wider arbitrary values (`tracking-[0.18em]`, `[0.2em]`, `[0.25em]`) are removed, except on the « EONEOM » brand. |
| Numbers | `font-mono tabular-nums`, right-aligned in tables; weight 500 for primary values. |
| Truncation | `truncate` only on names inside fixed-width columns, always with a `title` attribute holding the full text. |
| Canvas text (map, Konva) | `fontSize` ≥ 12 (labels 12, emphasised 14). |

## Audit of current usage

Counts over `apps/web/src/**/*.{ts,tsx,css}`, tests and `routeTree.gen.ts` excluded (grep on 2026-11-27):

| Class | Occurrences | Files | Of which `modules/admin/**` |
| --- | --- | --- | --- |
| `text-xs` (12 px) | 136 | 54 | 21 |
| `text-sm` (14 px) | 173 | 66 | 39 |
| `text-base` (16 px) | 26 | 24 | 2 |
| `text-lg` | 3 | 3 | 2 |
| `text-xl` | 1 | 1 | 0 |
| `text-2xl` | 4 | 4 | 0 |

Files with the most `text-xs`: `modules/exchange/order-form.tsx` (9), `modules/communication/chat/panel.tsx` (8), `modules/admin/system-player-observability/stats-panel.tsx` (8), `modules/city/page.tsx` (5), `modules/alliance/no-alliance.tsx` (5), `modules/alliance/my-alliance.tsx` (5). Most `text-sm`: `modules/admin/combat-simulator/page.tsx` (19), `modules/admin/system-player-observability/page.tsx` (8), `modules/alliance/no-alliance.tsx` (7).

Sizes **below the 12 px floor** (22 occurrences):

| Class | Size | Locations |
| --- | --- | --- |
| `text-[0.6rem]` | 9.6 px | `ui/header/index.tsx:21` (« Command terminal ») |
| `text-[0.65rem]` | 10.4 px | `ui/activity/index.tsx:227` (« Activité »), `ui/header/resources/item/index.tsx:93` (rates), `ui/nav/location/index.tsx:18` (« Emplacements »), `ui/nav/location/outpost/index.tsx:37,55` (« Permanents », « Temporaires »), `ui/list/item/index.tsx:49,57` (badges), `ui/production-terrain-readout.tsx:105`, `ui/energy-readout.tsx:78` (column headers) |
| `text-[10px]` | 10 px | `modules/admin/combat-simulator/page.tsx:369,373`, `modules/admin/system-player-observability/page.tsx:151` |
| `text-[11px]` | 11 px | `ui/energy-readout.tsx:62` (dense label), `modules/defense/list/index.tsx:36`, `modules/admin/combat-simulator/page.tsx:99,218,345,572`, `modules/admin/system-player-observability/page.tsx:181`, `modules/admin/system-player-observability/stats-panel.tsx:163,180` |
| Konva `fontSize` | 10–11 px | `modules/map/markers.tsx:88` (`emphasized ? 13 : 11`), `modules/map/markers.tsx:138` (`emphasized ? 12 : 10`) |

Class strings kept outside JSX also count: `modules/exchange/styles.ts` (`fieldClass`, `sectionTitleClass`, `tableClass`, `headRowClass`), `index.css` `@apply` rules (`.field-label` `text-xs`, `.field-input` `text-base`, `.map-zoom-btn` `text-sm`), variant forms such as `[&_h3]:text-sm` in `ui/layout/details/content/index.tsx` and `!text-xs`-style overrides passed to `Button`.

Today 12 px (`text-xs`) is used for whole sentences (ledes, empty states, hints), and 14 px (`text-sm`) is the de-facto body size. The migration moves everything up one step.

## Mapping rule (old class → token)

Apply in this order; the first matching row wins.

| Old | Context | New |
| --- | --- | --- |
| `text-[0.6rem]`, `text-[0.65rem]`, `text-[10px]`, `text-[11px]` | any | `text-caption` |
| `text-xs`, `text-sm`, `text-[…]` | anywhere under `modules/admin/**` (operator console stays dense) | `text-caption` for `text-xs` and arbitrary sizes, `text-meta` for `text-sm` |
| `text-xs` | together with `uppercase` (labels, badges, column headers), or a timestamp / unit / counter (« Q2 », « 3/7 », `hh:mm`) | `text-caption` |
| `text-xs` | anything else (sentences, ledes, hints, empty states, secondary values, tooltip text) | `text-meta` |
| `text-sm` | button label (`ui/button.tsx`), chat message line, secondary column of a dense table (movement list, order book, ranking), field label | `text-meta` |
| `text-sm` | anything else (list rows, paragraphs, table cells, nav links, inputs, values, `<h3>` inside details) | `text-body` |
| `text-base` | on `h1`–`h3` or a card / panel title | `text-heading` |
| `text-base` | anything else (`.field-input`, plain text) | `text-body` |
| `text-lg`, `text-xl` | header brand, admin `h1`, details `[&_h1]` | `text-title` |
| `text-2xl` | page `h1` (`modules/city/page.tsx`, `modules/outpost/page.tsx`) | `text-page` |
| `text-2xl` | « EONEOM » on `modules/auth/login-form.tsx`, `signup-form.tsx` | `text-display` |
| Konva `fontSize` 10 / 11 | map labels | 12; emphasised labels 13 → 14 |

Colour roles that go with the sizes:

| Role | Colour token |
| --- | --- |
| Main reading text of a block (body default, table cells, list row names, chat and mail bodies) | `text-ink` (new) |
| Values and headings (stocks, levels, counts, titles) | `text-amber` |
| Secondary text (ledes, hints, descriptions) | `text-amber-dim` |
| Labels and column headers | `text-label` (adjusted) |
| Placeholders only | `text-muted` (new) |
| States | `text-terminal` (ok / free), `text-danger` (error / full / threat) |

### Shared components to migrate first

They carry most of the visible text; migrating them fixes many screens at once.

| Component | Today | After |
| --- | --- | --- |
| `ui/button.tsx` `Button` | `text-sm uppercase tracking-wide px-3 py-2` | `text-meta font-semibold uppercase tracking-wide px-3 py-2` (36 px high); small overrides use `py-1` (28 px), never a smaller size |
| `ui/list/item/index.tsx` `ListItem` | name `text-sm`, badge `text-[0.65rem]` | name `text-body`, badge `text-caption` (catalogue cards are redesigned by the catalogue slice, see 043–047) |
| `ui/queue-panel.tsx` `QueuePanel` | title `text-sm`, depth / queue title `text-xs` | title `text-heading`, depth `text-caption`, queue title `text-caption uppercase` |
| `ui/countdown-progress.tsx` | summary `text-xs`, time `text-xs` | summary `text-meta`, time `text-body font-mono` |
| `ui/tooltip.tsx` | `text-xs` | `text-meta` |
| `ui/resource-item.tsx` | `font-mono text-sm` | `font-mono text-body` |
| `ui/production-terrain-readout.tsx`, `ui/energy-readout.tsx` | headers `text-[0.65rem]`, cells `text-sm` / `text-xs`, dense label `text-[11px]` | headers `text-caption`, cells `text-body`, base column `text-meta`; `dense` mode uses `text-meta`, not 11 px |
| `ui/layout/details/content/index.tsx` | `text-sm`, `[&_h1]:text-xl`, `[&_h2]:text-base`, `[&_h3]:text-sm` | `text-body`, `[&_h1]:text-title`, `[&_h2]:text-heading`, `[&_h3]:text-caption [&_h3]:uppercase` |
| `ui/layout/details/empty.tsx` | `text-sm` | `text-body` |
| `index.css` `.field-label` / `.field-input` | `text-xs uppercase` / `text-base` | `text-meta` (sentence case) / `text-body` |
| `modules/exchange/styles.ts` | `text-sm` / `text-xs` strings | `fieldClass` `text-body`, `sectionTitleClass` `text-caption uppercase`, `tableClass` `text-body`, `headRowClass` `text-caption uppercase` |

### Screens affected

Every authenticated screen changes size; this list is the review checklist for the implementation.

| Area | Paths |
| --- | --- |
| Shell | `App.tsx`, `ui/header/**`, `ui/activity/index.tsx` (removed by 041, migrate only if 040 lands alone), `ui/nav/**`, `modules/communication/chat/panel.tsx` |
| City / outpost home | `modules/city/page.tsx`, `modules/outpost/page.tsx` (replaced by 042) |
| Catalogues | `modules/building/**`, `modules/technology/**`, `modules/troop/**`, `modules/defense/**`, `modules/requirement/**`, `modules/cost/**` |
| Map | `modules/map/**` (Konva labels) |
| Movements | `modules/movement/**` |
| Inbox | `modules/communication/report/**`, `modules/communication/mail/**`, `modules/communication/inbox-tabs.tsx` |
| Social | `modules/alliance/**`, `modules/ranking/page.tsx` |
| Bourse | `modules/exchange/**` |
| Auth | `modules/auth/**` |
| Operator console | `modules/admin/**` (sizes only, density kept) |

## Surfaces and textures

Today:

| Utility / element | Effect | Text on it? |
| --- | --- | --- |
| `.scanlines::after` (`index.css`, used on `<main class="workspace">` in `App.tsx` and in `modules/auth/screen.tsx`) | A black 4 px line pattern drawn **on top of** the whole workspace (`absolute inset-0`, 7 % opacity) | Yes: it overlays every page |
| `.surface-inset` (`main.workspace`) | Chrome + `tex-rust-noise.png` | Yes |
| `.surface-chrome` (20 usages: header, nav, locations, chat, panels, auth cards) | Chrome-2 gradient + `tex-metal-panel.png` | Yes |
| `body` background | Gradient + `tex-rust-noise.png` | Only where no panel covers it |
| `.admin-surface-*` | Gradients + metal / rust textures | Yes |
| `ui/fx/index.tsx` `FxLayer` | Canvas `fixed inset-0 z-[60] opacity-70`: ambient amber embers drift **over** everything, plus bursts on completion | Yes (over text) |

New rules:

| Utility | Definition | Use |
| --- | --- | --- |
| `.surface-frame` | `bg-chrome-2 border-rust/70`, flat, no image | Shell bars: header, left column, right column, chat bar ([`041`](../041-app-shell-navigation/spec.md)) |
| `.surface-panel` | `rounded-sm border border-rust/60 bg-chrome-2`, flat | Every data panel and card (replaces `surface-chrome` in modules) |
| `.surface-panel-inset` | `rounded-sm border border-rust/40 bg-chrome`, flat | Blocks nested in a panel: active queue item, table body, inputs area |
| `.surface-raised` | `bg-chrome-3` | Selected row / card, hover on rows (`hover:bg-chrome-3/60`) |
| Workspace `main` | `bg-chrome`, flat | Replaces `surface-inset scanlines` in `App.tsx` |

Removed: `.scanlines`, `.surface-inset`, `.surface-chrome`, the `--background-image-tex-scan` and `--background-image-tex-ember` tokens (no other use), and the `background-image` lines of `.admin-surface-page|panel|card|nested` (their shadows stay). `public/ui/tex-scanline.png`, `tex-ember.png` and the unused `tex-grit.png` can be deleted.

Kept (no text on them): the `body` backdrop texture; the decorative backdrop layer of `modules/auth/screen.tsx` (its own `aria-hidden` div behind the login card, `scanlines` class removed from the wrapper); `--background-image-tex-metal`, `-rust` and `-panel-rivet` for such decorative layers only.

`FxLayer`: ambient embers are removed (they float over text all the time); the short **burst** on completion (`triggerFxBurst`, called by building, technology, troop and defense hooks) stays, still `motion-reduce:hidden`.

## Palette and contrast

Ratios are WCAG 2.x contrast ratios computed from the hex values of `index.css`. Effective textured backgrounds were also checked (texture PNGs decoded: `surface-chrome` ≈ `#332b23`–`#372f26`, `surface-inset` ≈ `#29221c`–`#2e251e`): luminance barely moves, so the textures hurt through **noise behind glyphs**, not through average contrast.

### Current text colours on current surfaces

| Text \ surface | `chrome` #2c241e | `chrome-2` #352c24 | `chrome-3` #46382e | `copper/30` on chrome-2 (#61432c, primary button) | `danger-deep/50` on chrome-2 (#58221e) |
| --- | --- | --- | --- | --- | --- |
| `amber` #e8c547 | 9.08 | 8.14 | 6.71 | 5.33 | 7.52 |
| `amber-dim` #dbbf82 | 8.55 | 7.67 | 6.32 | 5.02 | 7.09 |
| `label` #e0c878 | 9.22 | 8.26 | 6.81 | 5.41 | 7.64 |
| `terminal` #7dcea0 | 8.13 | 7.29 | 6.01 | 4.77 | 6.74 |
| `danger` #ffb4a8 | 8.96 | 8.03 | 6.62 | 5.26 | 7.43 |
| `plastic` #d4a06a | 6.56 | 5.88 | 4.84 | 3.85 | 5.44 |
| `copper` #c97a3d (as text: `hover:text-copper`, base `a:hover`) | 4.60 | **4.12** | **3.40** | **2.70** | **3.81** |
| `amber-dim/65` (field placeholder, on chrome) | 4.50 | **4.03** | **3.32** | — | — |
| `rust/60` (field border vs. its background) | **1.82** on chrome-2 | | | | |

Findings:

1. The main text colours already pass AA, even AAA, on flat surfaces. Contrast is not the main problem; size, texture noise and hierarchy are.
2. **Hierarchy is flat**: `amber` vs `label` is 1.02 : 1 and `amber` vs `amber-dim` 1.06 : 1, so labels, values and descriptions look the same apart from a slight hue shift.
3. **Failures**: `copper` used as text (hover colour of every link in `index.css`, `text-copper` ×2), the field placeholder on `chrome-2` / `chrome-3`, and input borders (`rust/60`, 1.82 : 1, below the 3 : 1 needed for form field boundaries).
4. `plastic` fails on `copper/30` (3.85): never put the plastic colour on a primary button.
5. Disabled controls use `opacity-40` (≈ 2.5 : 1): allowed by WCAG (inactive components are exempt); kept.

### Adjusted palette

| Token | Old | New | Ratio on chrome / chrome-2 / chrome-3 | Use |
| --- | --- | --- | --- | --- |
| `--color-ink` | — | **#efe1bd** | 11.74 / 10.52 / 8.67 | New. Main reading text; `body` default (replaces `text-amber-dim` as the default). |
| `--color-label` | #e0c878 | **#cdb994** | 7.95 / 7.13 / 5.88 (4.67 on copper/30) | Desaturated khaki: labels read as labels, distinct from amber values, AA on every surface. |
| `--color-muted` | — | **#b3a07a** | 5.97 / 5.35 / 4.41 | New. **Placeholders only**, on `chrome` / `chrome-2` (fields are on `chrome`). Not allowed on `chrome-3`. |
| `--color-edge` | — | **#9a7656** | 3.70 / 3.32 / — | New. Borders of inputs, selects, data table frames and the focus-visible fallback; ≥ 3 : 1 non-text contrast. Decorative panel borders keep `rust/40–70`. |
| `--color-amber`, `amber-dim`, `terminal`, `danger`, `danger-deep`, `plastic`, `mushroom`, `chrome*`, `rust`, `copper` | | unchanged | see table above | `copper` stays for fills and borders (primary button), **never for text**. |

Other contrast rules:

| Rule | Value |
| --- | --- |
| Link hover | `a:hover` → `text-ink` + `underline` (was `text-copper`, 4.12 : 1). `text-copper` and `hover:text-copper` are forbidden. |
| Focus | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber` (8.14 : 1 on chrome-2) on every interactive element; replaces `focus:ring-amber/35` and `focus:outline-none` without replacement. |
| Placeholders | `placeholder:text-muted` (was `placeholder:text-amber-dim/65` in `.field-input`, `placeholder:text-label` in `fieldClass` and the chat input). |
| Opacity on text | No `text-*/<alpha>` on text except disabled states. |
| Neon glow | `neon-amber` (pulsing border glow on active items and primary buttons) stays: it is outside the element, not behind the text. [`041`](../041-app-shell-navigation/spec.md) removes it from the header and the two shell columns. |

## Spacing and density

Base unit 4 px (Tailwind spacing scale).

| Element | Rule |
| --- | --- |
| Panel | `surface-panel p-4` (16 px); title row `mb-3`; panels in a grid `gap-4`; page sections `space-y-6`. |
| Page header | `h1` `text-page`, lede `text-meta text-amber-dim`, bottom border `border-rust/50 pb-3 mb-4`. |
| Table, standard | Header row `text-caption uppercase tracking-wider text-label`, `px-3 py-2`; body rows `text-body text-ink`, `px-3 py-2` → **40 px** rows; separators `border-t border-rust/30`; hover `bg-chrome-3/60`. |
| Table, dense (movement list, order book, trades, ranking, admin) | Body rows `text-meta`, `px-3 py-1.5` → **32 px** rows; the first column (name) may stay `text-body`. |
| Numeric columns | Right-aligned, `font-mono tabular-nums`, units in `text-caption text-label` after the value. |
| List rows (nav, locations, inbox) | Minimum **36 px** high (`py-1.5` + 24 px line), whole row clickable. |
| Cards (catalogue grids, dashboard) | `p-3`–`p-4`; title `text-body font-semibold` or `text-heading`; meta `text-meta`; badges `text-caption uppercase`, `px-1.5 py-0.5`. |
| Forms | Label `text-meta text-label` above the field, `mb-1`; input `text-body px-3 py-2` (40 px); fields `space-y-4`. |
| Buttons | Default 36 px high; small 28 px; hit area never below 24 × 24 px (WCAG 2.5.8). |
| Icons | 20 px (`h-5 w-5`) next to `text-body`, 16 px (`h-4 w-4`) next to `text-meta`; resource icons never smaller than 16 px. |
| Progress bars | 8 px (`h-2`) in panels, 4 px (`h-1`) only inside list rows; always with a text value next to them (the bar is never the only carrier of the information). |

## Guard

### `apps/web/src/ui/typography-guard.test.ts`

A plain vitest test (node `fs`, no extra dependency) that walks `apps/web/src/**/*.{ts,tsx,css}`, skipping `*.test.*`, `*.spec.*` and `routeTree.gen.ts`, and fails with a list of `file:line: match` for:

| # | Forbidden | Pattern (JS regex, sketch) | Message |
| --- | --- | --- | --- |
| 1 | Any arbitrary font size | `/(?<![\w-])text-\[\d*\.?\d+(px\|rem\|em)\]/` | « Use a text-* token (040). » |
| 2 | Raw Tailwind size classes, with or without variants (`lg:`, `!`, `[&_h3]:`) | `/(?<![\w-])text-(xs\|sm\|base\|lg\|xl\|[2-9]xl)(?![\w-])/` | « Raw size class: map it with the 040 table. » |
| 3 | Canvas / inline font sizes below 12 | `fontSize` followed by `=` or `:` → take every number in the expression (`fontSize={emphasized ? 13 : 11}` → 13, 11); fail when any is < 12 | « Canvas text below 12 px. » |
| 4 | CSS font sizes below the floor | in `.css` files, `font-size:\s*([\d.]+)(px\|rem)` with px < 12 or rem < 0.75 | « CSS font size below 12 px. » |
| 5 | Textures behind text | `scanlines`, `surface-inset`, `surface-chrome`, `bg-tex-`, `var(--background-image-tex-` outside the allowlist (`index.css` `body` rule and the `@theme` block, `modules/auth/screen.tsx` backdrop div) | « Texture behind text (040). » |
| 6 | Copper as text colour | `/(?<![\w-])(hover:)?text-copper(?![\w-])/` | « copper fails AA as text. » |

Each rule has a small fixture case in the same file (a string that must match and one that must not), so a regex change cannot silently disable a rule.

### `apps/web/src/ui/palette-contrast.test.ts`

Reads `index.css`, extracts the `--color-*` hex values of the `@theme` block and asserts, with the WCAG formula:

| Pair | Minimum |
| --- | --- |
| `ink`, `amber`, `amber-dim`, `label`, `terminal`, `danger` on `chrome`, `chrome-2`, `chrome-3` | 4.5 |
| `amber`, `ink` on `copper/30` over `chrome-2` and on `danger-deep/50` over `chrome-2` (alpha blended in the test) | 4.5 |
| `muted` on `chrome`, `chrome-2` | 4.5 |
| `edge` on `chrome`, `chrome-2`; `amber` (focus outline) on `chrome-2` | 3.0 |

A later palette edit that breaks AA fails the test suite.

## Testing

| Area | Cases |
| --- | --- |
| Guard | `typography-guard.test.ts` passes on the migrated tree; each rule's fixtures (match / no match); allowlist honoured. |
| Contrast | `palette-contrast.test.ts` ratios as above. |
| Tokens | A render test of `Button`, `QueuePanel`, `CountdownProgress`, `ListItem` asserts the token classes (`text-meta`, `text-heading`, `text-caption`) are present. |
| Existing tests | Tests asserting colour classes keep passing (`modules/movement/capacity/index.test.tsx` `text-danger`, `modules/cost/index.test.tsx` `text-terminal` / `text-danger`). Tests querying the header resources and activity strip are updated by [`041`](../041-app-shell-navigation/spec.md). |
| Visual check | Manual pass at 1920 × 1080 and 1280 × 720 on: city dashboard, buildings, technologies, troops, defense, map, movements, reports, mail, alliance, ranking, Bourse, login, admin observability. No horizontal scroll; no text under 12 px in devtools (« Computed » font-size). |

## Out of scope

- Shell structure (columns, header panel, activity in the left column): [`041`](../041-app-shell-navigation/spec.md).
- City and outpost home content: [`042`](../042-city-dashboard/spec.md).
- Catalogue card grid, map, movements, Bourse layouts and new artwork (slices 043–047).
- Light theme, user-selectable font size, tablet / phone layouts.
- An ESLint setup for the web app.

## Assumptions (confirm on review)

| # | Assumption |
| --- | --- |
| 1 | The semantic token names (`text-caption`, `text-meta`, `text-body`, `text-heading`, `text-title`, `text-page`, `text-display`) replace Tailwind's default scale entirely (`--text-*: initial`), rather than redefining `text-xs` / `text-sm` / `text-base`. If the reset causes a build issue, the defaults stay defined and the guard alone forbids them. |
| 2 | Buttons use 14 px uppercase semibold (`text-meta`), not 16 px: uppercase at 16 px is heavy, and 14 px uppercase stays within the 12–14 px secondary band. |
| 3 | Chat lines are 14 px (`text-meta`): the chat is a secondary panel (decided with [`041`](../041-app-shell-navigation/spec.md)). |
| 4 | The operator console (`modules/admin/**`) keeps a denser mapping (14 px content, 12 px labels) but obeys the 12 px floor and the texture rule. |
| 5 | `label` is darkened from #e0c878 to #cdb994 (still ≥ 4.67 : 1 everywhere) to create hierarchy; and a new `ink` (#efe1bd) becomes the default reading colour. Both are new tones in the same amber / khaki family. |
| 6 | Ambient embers of `FxLayer` are removed; completion bursts stay. |
| 7 | The `neon-amber` pulse is kept everywhere it is today, except where [`041`](../041-app-shell-navigation/spec.md) removes it (header bar, left and right columns). |
| 8 | No global max content width at 1920; reading text capped at 72 ch, forms at 40 rem. Minimum supported viewport 1280 × 720. |
| 9 | Map label sizes are bumped to 12 / 14 here even if the map slice later rewrites the markers; the guard rule 3 then applies to the new code. |

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`019`](../019-web-shell-routing/spec.md) | Global UI: type tokens, flat surfaces, guard tests; `index.css` description. |
| [`041`](../041-app-shell-navigation/spec.md), [`042`](../042-city-dashboard/spec.md), 043–047 | Use the tokens and surfaces defined here. |
| `README.md` (specs index) | Slice 040 row. |

## Implementation notes

- **Tokens**: the `@theme` block of `index.css` resets `--text-*` and defines the seven tokens as specified (assumption 1 held: the reset builds; `text-xs` / `text-sm` / `text-base` no longer generate CSS). `body` is `text-body text-ink`.
- **Migration**: 365 size classes in 81 files. A script applied the mapping table mechanically (arbitrary sizes → `text-caption`; admin `text-xs` → `text-caption`, `text-sm` → `text-meta`; `text-xs` + `uppercase` → `text-caption`, other `text-xs` → `text-meta`; `text-sm` → `text-body`, or `text-meta` with `uppercase`, or `text-caption` for uppercase `text-label` section labels; `text-base` → `text-heading` on `h1`–`h3`, else `text-body`; `text-lg` / `text-xl` → `text-title`; `text-2xl` → `text-page`, `text-display` on the auth screens), then each line was reviewed by hand:
  - `text-caption` for timestamps, units and counters: queue depth and queue item timing, chat time and character counter, mail character counter, « × N » counts, available troop counts, « niveau N » on the city wall, member counts and « Le / Envoyée le / Bloqué le <date> » lines, ranking footer, rank change and points.
  - `text-meta` for button labels (`Button` gets `font-semibold`; map zoom buttons, nav logout button), chat message lines, the ranking table (dense) and every field label.
  - Uppercase `text-sm` section labels (« Coût », « Pré-requis », list group titles, alliance / exchange `sectionTitleClass`) became `text-caption uppercase`, consistent with the spec's `sectionTitleClass` and details `[&_h3]` rows. Panel `h2` titles that were `text-base uppercase` (movements) and the `QueuePanel` title lose `uppercase` since uppercase is only allowed with caption / meta.
  - Field labels of login, signup and mail compose follow the Forms rule (`text-meta text-label`, sentence case) rather than the mechanical `text-xs uppercase` → `text-caption` row, like `.field-label`.
  - Button size overrides (`!px-2 !py-1 text-xs` in queues and the city wall) drop the size class and keep `py-1` (28 px).
  - Arbitrary trackings `[0.18em]`, `[0.2em]`, `[0.25em]` → `tracking-wider`; the « EONEOM » brand keeps its own.
- **Surfaces**: `surface-frame`, `surface-panel`, `surface-panel-inset`, `surface-raised` are declared with `@utility` (not `@layer utilities`), so an explicit `border-amber/30` or `border-danger/60` on the element overrides the surface border. Shell bars (header, nav, locations, activity strip, chat, admin header) use `surface-frame`; panels and auth cards `surface-panel`. The workspace `main` is `border border-rust/55 bg-chrome p-6` (24 px padding per the viewport table; the border is kept). Surfaces no longer set a text colour: unstyled text inherits `text-ink` from `body`. `.admin-surface-*` keep their shadows, without background images. The auth backdrop div is now `aria-hidden`. `tex-scanline.png`, `tex-ember.png` and `tex-grit.png` are deleted, with `--background-image-tex-scan`, `-ember` and the unused `--animate-ember` keyframes.
- **Contrast and focus**: `a:hover` is `text-ink underline`; `:focus-visible` gets `outline-2 outline-offset-2 outline-amber` once in the base layer (covers every interactive element) and the `outline-none` / `focus:outline-none` / `focus:ring-amber/35` classes are removed. Inputs (`.field-input`, the three `fieldClass` strings, the chat input, the admin simulator stack select) use `border-edge` and `placeholder:text-muted`; the `fieldClass` forms also move to `px-3 py-2`. Mail bodies are `text-ink`.
- **Widths**: reading text cap `max-w-[72ch]` on mail bodies and details paragraphs (`[&_p]:max-w-[72ch]`); `max-w-[40rem]` on the mail compose and alliance creation forms (auth cards stay `max-w-md`, already narrower).
- **Neon**: `neon-amber` unchanged everywhere (041 removes it from the shell).
- **Guards**: `typography-guard.test.ts` implements the six rules with block-aware allowlisting for `index.css` (`@theme` block and `body` rule) and the auth backdrop line; the forbidden fixtures are written with a `~` that the test strips, so Tailwind does not generate CSS for them. `palette-contrast.test.ts` parses the `@theme` hex values and checks every pair of the table (blended `copper/30` and `danger-deep/50`). `typography-tokens.test.tsx` asserts the token classes of `Button`, `QueuePanel`, `CountdownProgress` and `ListItem`. Both node-based tests reference `types="node"` (the web tsconfig has no node types).
- **Not done here**: `transformDecimals(0)` is owned by [`041`](../041-app-shell-navigation/spec.md). The spacing table is a rule set for new and reworked screens (041–047); this slice applied it only where a migrated class or shared component already sat (buttons, fields, workspace padding).

## Follow-ups

- **Visual pass**: the manual check at 1920 × 1080 and 1280 × 720 listed under Testing has not been done in a browser; only the built CSS was inspected (no font size below 12 px, no texture or scanline rule).
- **Colour roles**: only `body`, mail bodies and inherited text moved to `text-ink`; table cells and list row names that set `text-amber` / `text-amber-dim` explicitly keep them until their screens are reworked (042–046).
- **Density**: dense-table first columns, numeric right alignment and row heights of the spacing table are left to the screen slices.

## Evidence index

| Area | Paths |
| --- | --- |
| Theme | `apps/web/src/index.css` (`@theme` text tokens, `--color-ink`, `-label`, `-muted`, `-edge`; `@utility surface-frame`, `surface-panel`, `surface-panel-inset`, `surface-raised`; `:focus-visible`; `.field-label`, `.field-input`, `.map-zoom-btn`; removed `.scanlines`, `.surface-inset`, `.surface-chrome`, `tex-scan` / `tex-ember` tokens, ember keyframes, admin surface textures) |
| Shell | `apps/web/src/App.tsx` (workspace surface), `apps/web/src/ui/fx/index.tsx` (no ambient embers), `ui/header/**`, `ui/nav/**`, `ui/activity/index.tsx`, `modules/communication/chat/panel.tsx`, `modules/admin/layout.tsx` |
| Shared UI | `apps/web/src/ui/button.tsx`, `ui/list/**`, `ui/queue-panel.tsx`, `ui/queue-item-timing.tsx`, `ui/countdown-progress.tsx`, `ui/tooltip.tsx`, `ui/resource-item.tsx`, `ui/production-terrain-readout.tsx`, `ui/energy-readout.tsx`, `ui/layout/details/**`, `ui/layout/page.tsx`, `modules/exchange/styles.ts`, `modules/alliance/no-alliance.tsx` (`fieldClass`) |
| Screens | `apps/web/src/modules/{city,outpost,building,technology,troop,defense,requirement,cost,movement,communication,alliance,ranking,exchange,admin}/**` (size migration) |
| Map | `apps/web/src/modules/map/markers.tsx` (labels 12 / 14), `modules/map/legend-overlay.tsx` (already 12) |
| Auth | `apps/web/src/modules/auth/screen.tsx`, `login-form.tsx`, `signup-form.tsx` |
| Guard tests | `apps/web/src/ui/typography-guard.test.ts`, `apps/web/src/ui/palette-contrast.test.ts`, `apps/web/src/ui/typography-tokens.test.tsx` |
| Assets | `apps/web/public/ui/` (`tex-scanline.png`, `tex-ember.png`, `tex-grit.png` deleted) |
