# Changelog

All notable changes to the Alpheios WebExtension are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

This release closes the long-standing
[issue #324 (Manifest V3 migration)](https://github.com/alpheios-project/webextension/issues/324)
at the manifest and background-shell layer, while keeping all existing
Chrome / Firefox / Safari distribution paths working.

### Added
- **`src/lib/auth/auth0-sw-client.js`** — a service-worker-safe drop-in
  replacement for the `auth0-chrome` npm package. The original package's
  published `dist/auth0chrome.js` bundle embeds Node.js polyfills
  (`setimmediate`, `vm-browserify`) that reference `document` / `window`.
  Loading it in an MV3 service worker threw `ReferenceError: document is
  not defined` inside an async chain whose rejection the popup never
  observed — so the UI hung on "Please be patient while we are logging you
  in...". The new client reimplements PKCE OAuth with only `crypto.subtle`,
  `fetch`, and `chrome.identity.launchWebAuthFlow`, all of which are
  available natively in service workers. Public surface (`constructor`,
  `authenticate`, `logout`, `getRedirectURL`) is intentionally identical.

  - Supporting utilities `buildQueryString()` and `extractAuthCode()` are
    exported as pure functions for unit testing.
  - `test/auth0-sw-client.test.js` covers URL encoding, PKCE code extraction,
    and error parsing (10 cases).

- **`src/lib/auth/login-path.js`** — the authentication path decision
  (real Auth0 OAuth vs `TEST_ID` mock vs missing-config error) is now a
  pure function `decideLoginPath(authEnv)`. The bug it fixes: the old
  handler checked `TEST_ID` **first**, so any leftover `TEST_ID: 'mock-token'`
  from a previous test-mode build silently short-circuited the real-Auth0
  branch and kept the user stuck as `testuser`. Priority is now **real
  Client ID > TEST_ID fallback > error**, enforced by `login-path.js` and
  covered by `test/login-path.test.js` (9 cases including the exact
  regression scenario).

- `browser_specific_settings.gecko.id = "alpheios@alpheios.net"` and
  `strict_min_version = "115.0"` in `src/manifest/manifest.json`. Firefox
  temporary loads now retain access to `storage.local` / `storage.sync`,
  and old Firefox releases that lack reliable MV3 support are no longer
  targeted.
- Defensive logging on the popup ↔ background message link:
  `[alpheios-popup]` warnings on every catch / non-ok response in
  `src/manifest/popup.js`; `[alpheios-bg]` warnings/errors in
  `BackgroundProcess.popupMessageListener` so service-worker DevTools see
  the same diagnostics. Failures inside an async listener now also become
  structured `{ ok: false, error }` responses instead of unhandled
  rejections the popup never observes.
- `src/lib/url-support.js`: a no-browser-dependency helper that owns the
  list of internal URL schemes (`chrome:`, `edge:`, `about:`, `moz-extension:`,
  `chrome-extension:`, `view-source:`) on which content-script injection is
  blocked. `BackgroundProcess.isSupportedTabUrl` delegates to it. Single
  source of truth for tests and runtime.
- Test suites:
  - `test/url-support.test.js` (14 cases) — covers blocked / allowed URL
    matrix including case-insensitivity.
  - `test/background-models.test.js` (13 cases) — covers `Tab.createUniqueId`
    stability, attach/deattach lifecycle, `TabScript.serializable + readObject`
    round-trip across Symbol fields, and `AuthData` chain methods.
  - 27 / 27 tests pass under `jest`.
- `doc/migration/PENDING-DECISIONS.md` — strategy decision matrix for cross-browser
  packaging, build toolchain, and MV2 fallback retention. Decisions taken
  on 2026-05-03: A / A / A (single MV3 manifest, keep Webpack, keep all
  defensive fallbacks).
- `doc/migration/DEPENDENCY-NOTES.md` — dependency / warning baseline captured
  on 2026-05-04 as P2 wrap-up. Records what was removed in this round, the
  full `npm audit` severity breakdown (192 total: 22 critical / 72 high /
  88 moderate / 10 low; 28 of those at `package.json` direct level), the
  unavoidable deprecation warnings (e.g. transitive `uuid@3.4.0`), and a
  recommended ordering for the follow-up audit-fix PR. Cross-references
  `MIGRATION-CHECKLIST.md` P2 and `PENDING-DECISIONS.md`.

### Fixed
- **Context menu duplicate-id error**: In MV3, the background service worker
  restarts when idle, and context menu items persist across worker
  lifetimes. Each restart calls `initialize()` again, which tried to create
  items with the same IDs as the previous instance, triggering
  `Unchecked runtime.lastError: Cannot create item with duplicate id`.
  Fixed by calling `browser.contextMenus.removeAll()` at the start of
  `initialize()`.
- **Auth0 real-credentials short-circuit** (`TEST_ID` priority bug):
  `BackgroundProcess.loginRequestHandler` previously checked `TEST_ID`
  first. Any leftover `TEST_ID: 'mock-token'` from a test-mode build
  silently swallowed real Auth0 credentials and logged every user in as
  `testuser`. The decision was extracted into `src/lib/auth/login-path.js`
  (`decideLoginPath`), which always prioritizes a real Client ID over
  `TEST_ID`. The stale `TEST_ID` could not be cleared by `npm run
  set-auth0` because the old `update_env.mjs` only replaced the literal
  string `PLACE_AUTH0_CLIENT_ID_HERE` (one-shot). Both `loginRequestHandler`
  and `update_env.mjs` are fixed; switching from test mode to real mode
  now works with a single `npm run set-auth0 -- <client-id>`.

### Changed
- `manifest_version` is now `3`. Background page replaced with a
  `service_worker`. `browser_action` → `action`. `tabs.executeScript` →
  `browser.scripting.executeScript`. `tabs.insertCSS` →
  `browser.scripting.insertCSS`. `host_permissions` separated from
  `permissions`. `web_accessible_resources` rewritten in the MV3 object form
  with explicit `matches`.
- Cross-browser strategy is **single MV3 manifest** for both Chrome Web
  Store and Mozilla AMO — one `dist.zip` is shipped to both. Safari
  continues to be built from `src/safari-app-extension/` separately.
- **Lint toolchain (P2 wrap-up, 2026-05-04)**: `babel-eslint` →
  `@babel/eslint-parser ^7.12.0` (the former is now upstream-deprecated).
  `eslintConfig.parserOptions.parser` and `requireConfigFile: false`
  updated accordingly. `eslintConfig.env.webextensions: true` added — the
  removed `eslint-plugin-standard` was implicitly providing the
  `browser` global; without an explicit env declaration, every `browser.*`
  call in the background script triggered `'browser' is not defined`.
- Documentation refreshed:
  - `README.md` — "Project Revival Status" rewritten to reflect that the
    MV3 shell migration has landed and to list remaining items
    (Auth0 P1 verification, optional toolchain modernization).
  - `doc/guides/DEVELOPMENT.md` — "Modernization Context" rewritten to describe
    the completed API mapping rather than the historical V2 surface.
  - `doc/guides/BUILD-FF-CHROME.md` — declares MV3 output, Firefox 115+ minimum,
    and a single `dist.zip` for both stores.
  - `doc/migration/MIGRATION-CHECKLIST.md` — P0/P2/P3 progress and the 2026-05-03
    decisions are now recorded inline.

### Removed
- MV2 dead branches that became unreachable once the manifest was MV3:
  - `browser.action || browser.browserAction` — `browserAction` no longer
    exists in MV3.
  - `browser.tabs.executeScript` fallback inside `BackgroundProcess.executeScript`
    and `BackgroundProcess.dispatchEvent`.
  - `browser.tabs.insertCSS` fallback inside `loadContentCSS`.
- Two informational `console.log` lines from `src/background/background.js`
  that produced startup noise in service-worker DevTools without conveying
  actionable information. Error-path `console.warn` is preserved.
- **Dead dependencies (P2 wrap-up, 2026-05-04)** — verified-removed from
  `package.json` after `npm install` + `npm run build-dev` + the full verify
  chain stayed green:
  - `auth0-chrome` (runtime dep). Replaced by `src/lib/auth/auth0-sw-client.js`
    in P1; the `auth0-code-update` npm script and the matching segment of
    the `update-dist` chain are also removed. `dist/support/auth0/` is no
    longer produced.
  - `path` ^0.12.7 (devDep). A userland package that shadowed Node's built-in
    `path`; clearly an accidental install.
  - `coveralls` ^3.1.0 (devDep). The QA-build GitHub Actions workflow does
    not run tests and never invoked it; deprecated upstream.
  - `friendly-errors-webpack-plugin` ^1.7.0 (devDep). Zero references in this
    repo and not pulled in by `alpheios-node-build`.
  - `babel-eslint` ^10.1.0 (devDep). Upstream-deprecated; replaced by
    `@babel/eslint-parser` (see Changed).
  - `eslint-plugin-standard` ^4.0.2 (devDep). Upstream-deprecated; its rules
    were merged into `eslint-config-standard`.

  See `doc/migration/DEPENDENCY-NOTES.md` for the full removal table, the
  short-lived regression where `webpack-cleanup-plugin` / `vue-svg-loader` /
  `imagemin*` were removed and immediately restored once `build-dev` revealed
  they are peer dependencies of `alpheios-node-build`'s presets, and the
  remaining `npm audit` baseline (192 vulnerabilities — left for a separate
  audit-fix PR per the user's scope decision for this round).

### Verified
- **P1 authentication** — both scenarios verified end-to-end in Chrome
  MV3 service worker:
  - **Scenario B** (`TEST_ID` / `LOCAL_DEV_NO_AUTH` mock mode, 2026-05-03):
    popup ↔ content ↔ background message-chain is sound.
  - **Scenario A** (real Auth0 PKCE OAuth, 2026-05-04): full flow working
    with a self-provisioned free Auth0 tenant + Google social login:
    `chrome.identity.launchWebAuthFlow` → Auth0 `/authorize` → callback
    → `/oauth/token` token exchange → `/userinfo` profile fetch → logout.
    Popup displays the real Auth0 user nickname, not the mock fallback.
  - Detailed records in `doc/testing/P1-AUTH-SMOKE-STEPS.md`.

### Deferred
- Toolchain swap (Webpack → Vite). See `doc/migration/PENDING-DECISIONS.md` decision
  2: deferred to the next major version. The current Webpack +
  `alpheios-node-build` chain is retained to keep the QA / release
  pipeline working.
- End-to-end service-worker ↔ content-script integration tests via
  `puppeteer` / `playwright`. Tracked separately; the unit tests above
  cover the pure-logic surface.

### Notes
- `npm run verify:worker-safe` and the new jest suites are the
  pre-merge baseline. `npm run verify:p0` still requires a fresh
  `npm run build-dev` and is run by reviewers locally.
- Firefox 115 ESR or newer is the supported floor.
