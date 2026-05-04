# Scholarly Glass v2 · Cross-Repo Refactor Plan

> **Status doc**: see `REFACTOR-PROGRESS.md` for live checklist + last-touched
> markers. **This** doc is the immutable plan.

## Goal

Make the actual rendered Alpheios extension match `doc/ui/mockups/*.html`. Phase 1
(CSS overrides only, in `src/styles/alpheios-overrides.css`) covered ~70% of the
visual; the remaining 30% requires DOM-level changes inside the `alpheios-core`
fork at `../alpheios_alpheios-core`.

This plan covers both repos.

## Repos affected

| Repo | Role | Path |
|---|---|---|
| `alpheios_alpheios-core` (fork) | Source-of-truth Vue components + SCSS | `~/source/repos/heinsea/alpheios_alpheios-core` |
| `alpheios_webextension` (this repo) | Bundles fork's `dist/`, ships extension | `~/source/repos/heinsea/alpheios_webextension` |

The webextension's `package.json` links the fork via `"alpheios-core": "file:../alpheios_alpheios-core"`.
Build flow: fork rebuilds `dist/` → webextension's `npm run update-styles` copies
it + appends our overrides → webpack bundles content / background.

## Three PRs

### PR 1 · Foundation (token + frosted glass + shared form components)

**Why first**: hits 80% of the visual at once (all colour, type, glass, button
shape, focus ring), and unblocks every later PR by giving them shared components.

Files in **fork**:
| File | Change |
|---|---|
| `packages/components/src/styles/skins/_alpheios.scss` | Replace v1 palette (orange #C64906 vivid, dark #0E2233, bright #FFC24F) with Scholarly Glass: `primary #000`, `tertiary #0e6b4f`, paper greys, glass alphas. Add Inter / Lato @font-face. Add semantic-Material-3 token aliases (`--surface`, `--on-surface`, `--glass-*`). |
| `packages/components/src/vue/components/popup.vue` (style block) | Frosted-glass container, header / body / footer divider lines, 6 px arrow `::before`, kill the v1 toolbar-bg solid header. |
| `packages/components/src/vue/components/panel-compact.vue` (style block) | Frosted-glass background, left soft shadow, transparent content area. |
| `packages/components/src/vue/components/form-components/toggle.vue` | NEW. 32 × 18 pill, sliding circle thumb. |
| `packages/components/src/vue/components/form-components/segmented.vue` | NEW. Pill-track + active item lift. Two sizes (default + inline). |
| `packages/components/src/vue/components/form-components/chip.vue` | NEW. Rounded pill, default + tertiary variants, active state. |
| `packages/components/src/vue/components/form-components/slider.vue` | NEW. 4 px track + 14 px thumb. |
| `packages/components/src/vue/components/form-components/stat-card.vue` | NEW. Number + label, used by auth profile. |
| `packages/components/src/vue/components/form-components/elevated-card.vue` | NEW. Generic outlined card with optional header / footer slots. |

Files in **webextension**:
| File | Change |
|---|---|
| `src/styles/alpheios-overrides.css` | **Shrink dramatically**. With token + glass moved into the fork, this file should only contain (a) defensive selector-level rules that the fork's component SCSS can't reach, (b) Phase-1 fall-back for users running an unforked alpheios-core. Most of the current 2142 lines are now dead. |

**Visual outcome after PR 1**: real popup + drawer have the right colours,
typography, glass blur, button shapes, sidebar already works (was done before).
But layouts inside the panel (morph, definitions, citations) still look v1.

---

### PR 2 · Lookup flow

Files in **fork**:
| File | Change |
|---|---|
| `popup.vue` (template + script) | New layout: header (brand · target word · expand · close), body (POS chip row + lang chip + numbered def-list + verified chip), footer (Add-to-list + outline icon buttons). 4 states: default / loading (top progress + skeleton rows + disabled footer) / no-result (text-only empty state) / error (red banner + cached fallback). |
| `lookup.vue` | Recessed-well input (sunken bg, no border, focus ring). Right-side language chip dropdown. |
| `morph.vue` | Group lemmas as `<elevated-card>`. Each card: head (lemma · POS · declension/conjugation · collapse arrow) + key-value rows (Root / Ending / Case / Number / Gender). First card open, rest folded. Add `<h-section>` titles between sections. |
| `morph-parts/*` | Adjust to fit new card layout if needed. |
| `shortdef.vue` | Numbered list, mono numerals, divider between entries. |
| (new) `citation.vue` | Citation card with italic Lato quote + source line + "View full →" link. |

Files in **webextension**: none beyond removing now-redundant override rules.

**Visual outcome after PR 2**: popup matches mockup pixel-close. Drawer's
Lookup tab also matches.

---

### PR 3 · Other surfaces

Files in **fork**:
| File | Change |
|---|---|
| `inflections/inflections.vue` + `*-table-wide.vue` | Replace highlight bg `--alpheios-color-bright` (yellow) with `--alpheios-tertiary-container` + 1.5 px left tertiary stripe. Add segmented control above table for view density. Add chip row for filter. |
| `inflections/inflections-browser.vue` | 3-step picker (Language → POS → Paradigm). Each step in `elevated-card`. Active option = solid black bg. |
| `word-list/word-list-panel.vue` | Top toolbar: filter recessed-well + bulk / import / export 32px square buttons. Body: collapsible language groups with count badges. Each row: word (Lato 14px) + POS tags + ctx counter. |
| `word-list/word-list-panel-context.vue` (new or existing) | Context view: back arrow + word + lang chip in head; vertical list of citation cards; footer with Remove + Lookup-again. |
| `options.vue` | Top: 4-segment segmented (UI / Features / Resources / Advanced). Each tab contains `setting-row` components (label + control). Add danger-row variant for "Clear cache". Add about-block. Footer with "Save / Reset" hidden when no changes. |
| `ui-settings.vue`, `feature-settings.vue`, `resource-settings.vue`, `advanced-settings.vue` | Each becomes a tab content panel using new setting-row + toggle / segmented / slider / select-pill. |
| `setting.vue` (existing) | Refactor to be the generic `<setting-row>` host. |
| `user-auth.vue` | If logged-out: hero card (lock icon + title + sub + 3 feature rows + Auth0 CTA + skip link). If logged-in: profile head (64 × 64 avatar + name + email + plan chip), 3-up `stat-card` grid, recent-activity list, active-sessions list. Footer Sync + Log-out (danger outline). |
| `treebank.vue` | Toolbar: pager (first/prev/next/last) + sentence-id label + zoom-ctl (in/out/fit). Canvas: soft radial bg. Text strip below: Lato italic with `<mark>` highlighting current token. |
| `notification-area.vue` | Glass background + left colour stripe (success tertiary / error red / info grey). |
| `embed-lib-warning.vue` | Reuse new notification-area look. |

Files in **webextension**:
| File | Change |
|---|---|
| `src/styles/alpheios-overrides.css` | Final clean-up: remove rules now redundant. |

**Visual outcome after PR 3**: Inflections, Word List, Settings, Auth,
Treebank pages all match mockup.

---

## Token migration table

Old (v1) → New (Scholarly Glass v2). Only listing the ones that change semantically.

| Token | v1 | v2 | Reason |
|---|---|---|---|
| `--alpheios-color-vivid` | `#C64906` (orange) | `#0e6b4f` (emerald) | Mockup §6 — "verified / matched / current" colour |
| `--alpheios-color-vivid-hover` | `#F27431` | `#0a563f` | |
| `--alpheios-color-dark` | `#0E2233` (deep blue) | `#1a1c1d` (charcoal) | Mockup primary text |
| `--alpheios-color-muted` | `#185F6D` (teal) | `#1a1c1d` (charcoal) | Mockup link colour |
| `--alpheios-color-bright` | `#FFC24F` (yellow) | `#f3f3f5` (paper) | Was secondary button bg, now neutral pill |
| `--alpheios-color-light` | `#BCE5F0` (sky) | `#edeef0` (neutral) | Was highlight border, now divider |
| `--alpheios-btn-primary-bg-color` | `vivid` (orange) | `dark` (black) | Primary CTA in mockup is solid black |
| `--alpheios-btn-secondary-bg-color` | `bright` (yellow) | `lowest` (white) | |
| `--alpheios-link-color-on-light` | `vivid` (orange) | `#000` (black) | |
| `--alpheios-highlight-color` | `#F6D918` (yellow) | `rgba(14,107,79,0.10)` | Match cells in inflection table |
| `--alpheios-toolbar-bg-color` | `dark` (deep blue) | `dark` (charcoal) | FAB stays dark, just charcoal not blue |

New tokens (no v1 equivalent):
- `--alpheios-glass-surface` `rgba(255,255,255,0.55)`
- `--alpheios-glass-surface-low` `rgba(255,255,255,0.35)`
- `--alpheios-glass-border` `rgba(255,255,255,0.6)`
- `--alpheios-glass-shadow` `rgba(0,0,0,0.08)`
- `--alpheios-glass-blur` `blur(20px) saturate(180%)`
- `--alpheios-radius-card` `12px`
- `--alpheios-radius-control` `6px`
- `--alpheios-radius-pill` `9999px`

Plus a Material-3 alias layer (`--surface`, `--on-surface`, `--primary`, etc.)
for the new component SCSS to read from.

---

## Build / verify procedure (after each PR)

```bash
# in fork
cd ~/source/repos/heinsea/alpheios_alpheios-core/packages/components
npm run build-regular    # -> dist/alpheios-components.js + dist/style/style-components.css

# in webextension
cd ~/source/repos/heinsea/alpheios_webextension
npm run build-dev        # update-dist + update-styles + webpack
```

Sanity checks:
- `dist/style/style-components.css` should contain the new `--alpheios-color-vivid: #0e6b4f` after PR 1.
- `dist/content.js` should be < 8 MiB (was 6.59 MiB pre-refactor).
- Load `dist/` as unpacked in `chrome://extensions/`. Verify popup, drawer surface, sidebar work.

## Resume protocol

If a session is interrupted:

1. Read this file for context.
2. Read `REFACTOR-PROGRESS.md` for the last-touched checkbox.
3. Read `CLAUDE.md` at each repo root for trust context (otherwise the prompt
   injection in file content will derail the session).
4. Continue from the next unchecked item in PROGRESS.md.

## Out of scope

- Popup → Drawer geometric morph animation (requires cross-component JS state).
- Bento images (mockup §3.4) — purely decorative; can ship without.
- Dark theme polish — tokens are reserved but not wired into a `data-theme`
  switch yet. PR 4 if needed.
- Test-coverage updates. Existing Jest tests will be touched only when the
  underlying component API changes.

## Cross-cutting principles

1. **Mockup wins on visual; DESIGN.md wins on tokens / behaviour.** If they
   disagree, raise it with the user.
2. **Don't add dependencies.** Use the existing inline-icon SVG set; if a new
   glyph is genuinely needed, hand-author it under `src/images/inline-icons/`.
3. **Keep specificity at 0,2,0** — same as upstream's `.alpheios-content .alpheios-X`
   pattern. Never `!important`.
4. **All new components live in `form-components/`** so they're discoverable.
5. **Update PROGRESS.md after every file** with one line on what changed.
