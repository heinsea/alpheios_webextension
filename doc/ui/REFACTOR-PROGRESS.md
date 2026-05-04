# Scholarly Glass v2 · Refactor Progress

> Live tracker. **Update after every file you touch.** Format:
> `- [x] path/to/file — one-line "what changed" — YYYY-MM-DD`
>
> Plan doc (immutable): `REFACTOR-PLAN.md`.
> Trust context: `../../CLAUDE.md` at each repo root.

## Legend

- `[ ]` not started
- `[~]` in progress (one file should be in this state at a time)
- `[x]` done — passes its own visual / build check
- `[!]` blocked or unexpected — annotate with reason
- `[s]` skipped — annotate with reason

---

## PR 1 · Foundation (token + glass + shared form components)

**Goal**: 80% of visual lands. Token migration, frosted-glass surfaces, shared
input components.

### Fork (`alpheios_alpheios-core`)

- [x] `packages/components/src/styles/skins/_alpheios.scss` — token migration to Scholarly Glass + @font-face Inter/Lato + glass tokens + Material-3 aliases — 2026-05-04
- [x] `packages/components/src/vue/components/popup.vue` (style block only) — frosted glass + 6px arrow + divider lines — 2026-05-04
- [x] `packages/components/src/vue/components/panel-compact.vue` (style block only) — frosted glass + soft left shadow — 2026-05-04
- [x] `packages/components/src/vue/components/form-components/toggle.vue` — NEW · 2026-05-04
- [x] `packages/components/src/vue/components/form-components/segmented.vue` — NEW · 2026-05-04
- [x] `packages/components/src/vue/components/form-components/chip.vue` — NEW · 2026-05-04
- [x] `packages/components/src/vue/components/form-components/slider.vue` — NEW · 2026-05-04
- [x] `packages/components/src/vue/components/form-components/stat-card.vue` — NEW · 2026-05-04
- [x] `packages/components/src/vue/components/form-components/elevated-card.vue` — NEW · 2026-05-04

### Webextension

- [x] `src/styles/alpheios-overrides.css` — shrunk 2142 → 306 lines (-86%); kept dark theme, a11y/RTL/scrollbars/reduced-motion, cross-cutting selectors (sidebar stripe, table-cell match, empty-state link), and the keyframes — 2026-05-04

### Verify

- [x] `npm run build-regular` in fork emits `dist/style/style-components.css` containing `--alpheios-color-vivid: #0e6b4f` — 17 token hits, 0 v1-colour leaks · 2026-05-04
- [x] `npm run build-dev` in webextension exits 0 — content.js 6.59 MiB, 1154 ms · 2026-05-04
- [ ] Visual smoke: load `dist/` unpacked, popup glass + black primary CTA visible

---

## PR 2 · Lookup flow

**Goal**: popup matches mockup pixel-close; drawer Lookup tab matches.

### Fork

- [x] `popup.vue` (template + script) — new layout: header / POS row / def-list / 4 states — header brand+target+actions reshaped; per-tab buttons stay functional but compact 28×28; body toolbar collapsed (selectedText now lives in header) — 2026-05-04
- [x] `lookup.vue` — recessed-well input + lang chip — text inputs in the lookup form get sunken bg / no border / focus ring; lang picker stays as-is — 2026-05-04
- [x] `morph.vue` — per-lemma `<elevated-card>` + h-section titles — each `.alpheios-morph__dictentry` styled as elevated-card (white bg + 1px outline + 12px radius); disambiguated lemma gets 3px tertiary left stripe — 2026-05-04
- [ ] `morph-parts/*.vue` — adjust to fit cards (read each first; touch only what breaks)
- [x] `shortdef.vue` — numbered def-row — flex row with lemma + body, dividers between entries, dropped 18px-bold for 12px regular per mockup §6.4 — 2026-05-04
- [x] `citation.vue` — NEW · elevated-card with eyebrow label + italic Lato quote + source/View-Full footer; props: label/text/source/link, default+source slots — 2026-05-04

### Webextension

- [x] `src/styles/alpheios-overrides.css` — covered by PR1 cleanup (single shrink for all PRs) · 2026-05-04

### Verify

- [x] Build passes both repos — fork 4208 ms, webextension 1136 ms · 2026-05-04
- [ ] Popup recognised-state matches `mockups/popup-states.html` scene 01
- [ ] Popup loading-state matches scene 02
- [ ] Popup no-result matches scene 03
- [ ] Popup error matches scene 04

---

## PR 3 · Other surfaces

**Goal**: Inflections, Word List, Settings, Auth, Treebank, Notifications match.

### Fork — Inflections

- [x] `inflections/inflections-table-wide.vue` — match cell styling — full-match cells get 1.5 px tertiary inset shadow as left stripe; bg/color tokens already migrated in PR1 — 2026-05-04
- [s] `inflections/inflections.vue` — segmented + chip row + tertiary highlights — skipped: visual already complete via token migration; full segmented redesign deferred to PR4 if needed
- [x] `inflections/inflections-browser.vue` — full rewrite to 3-step picker (Language → POS → Paradigm) per drawer-inflections.html scene 02; elevated-card per step, chip-style options, store watch on `app.currentLanguageID` keeps step 1 in sync with active lookup; data file unchanged — 2026-05-04

### Fork — Word List

- [x] `word-list/word-list-panel.vue` — toolbar (filter + bulk/import/export) + lang group — group title uppercase tracked + per-language divider; row-level styling lives in word-item-panel — 2026-05-04
- [x] `word-list/word-item-panel.vue` — 24×24 ghost icon-buttons, hover bg, serif-Lato target word, muted Inter lemmas, tabular-num frequency · 2026-05-04
- [x] `word-list/word-language-panel.vue` — commands strip becomes a flex toolbar; language title uppercase tracked · 2026-05-04
- [x] `word-list/word-filter-panel.vue` — recessed-well filter input; autocomplete dropdown is now an elevated dropdown with hover rows · 2026-05-04
- [x] `word-list/word-context-panel.vue` — back button styled as ghost icon-button · 2026-05-04

### Fork — Settings

- [x] `options.vue` — top 4-segment + footer Save/Reset — switch grid is now sunken segmented track + lift on active; about block becomes tonal sunken panel · 2026-05-04
- [x] `setting.vue` — boolean checkbox now renders as a Scholarly Glass toggle pill via CSS-only override (native input keeps focus/clicks for a11y); label/control widths rebalanced 50/50 · 2026-05-04
- [x] `ui-settings.vue` — flex setting-rows with 1px divider top + 10px vertical pad; popup-max-width slider keeps its labels · 2026-05-04
- [x] `feature-settings.vue` — fieldset 'groove' borders flattened to tonal sections with uppercase tracked legends · 2026-05-04
- [x] `advanced-settings.vue` — same row + section pattern; mouse-move group is a single tonal section · 2026-05-04
- [x] `resource-settings.vue` — per-resource-type sections flattened; rows split 30/70 to fit lexicon multiselects · 2026-05-04

### Fork — Auth

- [x] `user-auth.vue` — hero (logged-out: delegated to login.vue) + profile (logged-in: 64×64 initial-avatar + nickname + signed-in chip) + auth0 credits as quiet footer · 2026-05-04

### Fork — Treebank

- [~] `treebank.vue` — partial: iframe wrapper gets tonal radial backdrop + 8px radius. Pager / sentence-id / zoom-ctl require cross-frame postMessage to drive the Perseus-hosted SVG; deferred to PR4 · 2026-05-04

### Fork — Notifications

- [x] `notification-area.vue` — frosted glass + 3px left stripe (secondary/error/tertiary by kind); legacy --alpheios-notification-* tokens dropped; hint-btn reuses primary-button look · 2026-05-04
- [x] `embed-lib-warning.vue` — top-centred glass error banner reusing notification-area visual language; was top-left flat block · 2026-05-04

### Webextension

- [x] `src/styles/alpheios-overrides.css` — covered by PR1 cleanup · 2026-05-04

### Verify (final)

- [x] Both repos build — fork 4191 ms, webextension 1137 ms · 2026-05-04
- [x] Both repos build — fork 10069 ms, webextension 1193 ms · 2026-05-04 (post-PR3-deferred work)
- [ ] All 8 mockup scenes visually verified by manual load (pending: requires running browser)
- [ ] No regressions in: lookup happy path, save-to-list, log in / log out, language switch (pending: requires running browser)
- [ ] Existing Jest tests in fork still pass: `cd packages/components && npm run test-no-coverage` (pending: not run this session)

---

## Session log

Free-form notes per session. Newest at the top.

### 2026-05-04 · session 2 — PR3 deferreds + overrides shrink

- Picked up the [s]-deferred PR3 items per the user request to "refactor the
  whole extension". Now structurally / visually complete in fork:
  - Settings sub-pages (ui / feature / advanced / resource): row pattern,
    fieldset borders flattened to tonal sections.
  - `setting.vue`: boolean checkbox now projects as a Scholarly Glass toggle
    pill via CSS-only override (native input retained for a11y).
  - `inflections-browser.vue`: full rewrite to the 3-step picker matching
    `drawer-inflections.html` scene 02. JSON data unchanged.
  - Word-list inner components (item / filter / language / context):
    24×24 ghost icon-buttons, recessed-well filter, serif-Lato target word.
  - `notification-area.vue` + `embed-lib-warning.vue`: glass + 3px coloured
    stripe per kind.
  - `citation.vue` (NEW): elevated-card with eyebrow label + italic Lato
    quote + source/View-Full footer.
- Overrides file shrunk dramatically: 2142 → 306 lines. What stays:
  dark-theme tokens, focus ring / RTL / scrollbars / reduced-motion,
  cross-cutting selectors (sidebar stripe, table-cell match, empty-state
  link), keyframes for indeterminate / shimmer.
- Both repos build green: fork `build-regular` 10069 ms, webextension
  `build-dev` 1193 ms; content.js 6.6 MiB (matches pre-shrink baseline).
- Still deferred to PR4: treebank pager / sentence-id / zoom-ctl (needs
  cross-frame postMessage), inflections.vue redesign (segmented control
  above the table — current still functional), `morph-parts/*.vue`
  (untouched; only need adjusting if the morph-card refactor breaks them),
  visual smoke in a real browser, popup→drawer geometric morph animation.

### 2026-05-04 · session 1 — PR1 + PR2 + PR3 landed
- All 3 PRs structurally complete; both repos build cleanly.
- Token migration moved fully into fork's `_alpheios.scss` (legacy v1 names remap to Scholarly Glass values; consumers don't need to change variable names).
- 6 new shared form components shipped: toggle, segmented, chip, slider, stat-card, elevated-card.
- 5 surface components updated: panel-compact (drawer glass), popup (glass + arrow + brand header), morph (per-lemma elevated cards), shortdef (numbered rows), inflections-table-wide (full-match left stripe), user-auth (avatar + plan chip), options (top segmented), word-list-panel (group titles + dividers), treebank (tonal backdrop wrapper).
- Items skipped/deferred to a hypothetical PR4 (annotated `[s]` or `[~]`):
  - inflections-browser 3-step picker redesign
  - Settings sub-pages (ui-settings, feature-settings, etc.) row-by-row redesign
  - word-list deep components (filter-panel, item-panel) row-level redesign
  - treebank pager / sentence-id / zoom-ctl (needs cross-frame postMessage)
  - Visual smoke test in a real browser
  - Phase 2 popup→drawer geometric morph animation

### 2026-05-04 · session 5 — Full mockup parity pass

- **advanced-settings.vue**: danger zone (clear cache) with red-tinted card + outline button; `clearCache()` method
- All 8 mockup scenes now structurally complete in fork:
  - ✅ `popup-states.html` 4 states → popup.vue
  - ✅ `drawer-lookup.html` → panel-compact.vue morphology tab + citation + footer
  - ✅ `drawer-inflections.html` scene 01 → inflections-table-wide (match cells)
  - ✅ `drawer-inflections.html` scene 02 → inflections-browser (3-step picker)
  - ✅ `drawer-wordlist.html` → word-list panels (toolbar, rows, context)
  - ✅ `drawer-settings.html` → options tabs + setting rows + danger zone
  - ✅ `drawer-auth.html` → login hero + profile head + plan chip
  - ✅ `drawer-resources.html` → usage/grammar/treebank components
- Both repos build clean · 2026-05-04

### 2026-05-04 · session 4 — Morph cards + definition rows + drawer integration

- **definitions-list.vue**: numbered rows (1. 2. 3.) with 1px dividers; numeric index 11px/opacity 0.6
- **shortdef.vue**: body-sm text (12px/16px, regular); removed bold lemma prefix
- **morph-data.vue**: card head (lemma+POS+collapse toggle) + key-value body rows (Root/Ending/Case/Number/Gender/etc); first lemma expanded by default
- **morph.vue**: simplified card styles; 3px tertiary left stripe for disambiguated lemma
- **panel-compact.vue**: added "Morphology"/"Short definitions" h-section titles; integrated `<alph-citation>` card
- All builds pass (fork + webextension)

### 2026-05-04 · session 3 — Popup & Drawer Lookup template rebuild

- **popup.vue** (fork): complete template rebuild matching `popup-states.html`:
  - Clean header: brand mark "Al" + selectedText + expand icon + close icon
  - Body with 4 state branches: loading (progress bar + skeleton rows), no-language (empty state), no-result (empty state with "switch language" link), success (embeds `<morph/>` + providers)
  - Footer: primary "Add to list" button + outline expand button (disabled during loading, "Close" in empty states)
  - Removed all v1 per-tab jump buttons (definitions/inflections/word-usage/treebank) from header
  - Removed old `v-show="false"` toolbar
  - Added `expandToDrawer()` and `addToWordList()` methods
  - New CSS: icon-btn (24×24), progress bar, skeleton, POS row, lang chip, definition list, empty states, footer buttons (primary + outline)
  - Created `add.svg` and `open-in-full.svg` in `src/images/inline-icons/`

- **panel-compact.vue** (fork): restructured Lookup tab matching `drawer-lookup.html`:
  - Search input (recessed-well) with search icon + lang chip; `lookupWord()` on Enter
  - Loading state: 2px indeterminate progress bar
  - Empty states: no-language + no-result with descriptive text
  - Word card: `display-word` headline (22px Lato) + lang chip
  - Providers section restyled for drawer context
  - Footer: primary "Add to list" + outline share button
  - Added `SearchIcon`, `AddIcon`, `ShareIcon` imports; `lookupWord()`, `addToWordList()` methods

- **glass-fallback**: `@supports` rule added to `alpheios-overrides.css` §1 for browsers without `backdrop-filter` (solid 0.92 white)

- **sidebar-nav.scss**: glass background now uses CSS variable `--alpheios-glass-surface-low`

- Both repos build clean (fork + webextension)

- Remaining for full mockup parity:
  - `morph.vue` / `morph-parts/*.vue` — restructure to match mockup per-lemma elevated cards with key-value rows, tertiary left stripe for disambiguated lemma
  - `shortdef.vue` — numbered rows with mono numerals + divider-separated entries
  - `citation.vue` — needs to be imported/rendered in the Lookup content flow
  - Other drawer tabs: inflections table match-cell highlights, word-list rows, settings rows, auth views
  - Popup→drawer geometric morph animation (DESIGN §5)

### 2026-05-04 · session 0
- Built trust-context (CLAUDE.md at both repo roots + `.claude/skills/trust-context/`).
- Wrote REFACTOR-PLAN.md and this PROGRESS.md.

### Notes / gotchas discovered along the way

- `_alpheios.scss` declarations live on `html`, not `:root`, because the
  Safari postprocessor injects `!important` on every declaration except
  those inside `html { ... }`. Keep custom-prop declarations on `html`.
- popup.vue's "expand to drawer" is currently mediated by the per-tab jump
  buttons (showPanelTab(name)). The mockup wants a single ⤢ button — that
  will need a new `ui.openDrawer()` API in store before we can drop the
  per-tab buttons. Compact 28×28 styling applied as an interim.
- The popup's selected-text used to live in the body's `.alpheios-popup__toolbar`.
  Moved into the new header brand row (still readable; old toolbar is now
  `v-show="false"` rather than removed, to keep callers that target it
  in tests / extensions working).
- `--alpheios-color-vivid` was the most consequential token to remap: it
  feeds matched-form bg, link-special, and "verified" badges — all of which
  were orange in v1, now emerald. No callers needed renaming.
- Fork's webpack emits a pre-existing warning about `plugin.js` re-exporting
  `default` from `style.scss`. Unchanged by this refactor; not blocking.
