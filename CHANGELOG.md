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
  `MIGRATION-CHECKLIST.md` P2 and `PENDING-DECISIONS.md`. Subsequently
  expanded with a "second round" section recording the 2026-05-04 follow-up
  (Tier 1+2+3): final audit baseline `135 total` (down -57 / -30%; critical
  22 → 4, high 72 → 46), the install warnings cleared by Tier 1, the
  transitive upgrades from `npm audit fix`, and the direct-dep major bumps
  for `jsonwebtoken` and `webpack-bundle-analyzer`.
- Empty `.npmignore` (Tier 1, 2026-05-04 follow-up). Silences the
  `npm warn gitignore-fallback` that npm 11 emits on installs in this
  repo. The package is private (not published to the npm registry), so
  there's nothing to specifically exclude — a comment-only file does the
  job.
- **`webpack.config.mjs` and `webpack.config.safari.mjs`** (toolchain
  unification, 2026-05-04 ×2). Inline ~100-line webpack configs that drive
  the Chrome / Firefox and Safari builds directly via `webpack` CLI,
  bypassing `alpheios-node-build`'s `Builder` + preset chain. Inspection
  showed every relevant preset (`pwa-vue.mjs`, `vue.mjs`) was importing
  deprecated peer-dependencies (`webpack-cleanup-plugin`,
  `mini-css-extract-plugin@^0.9.0`, `optimize-css-assets-webpack-plugin@^5`,
  `vue-svg-loader@^0.16`, `url-loader`, `source-map-loader@^1`) that this
  repo never actually invoked: `grep` for `\.vue'`, `\.css'`, `\.scss'` in
  `src/` returned **zero matches**. Both new configs use `clean-webpack-plugin`
  + `DefinePlugin` + node fallbacks for `crypto`/`stream` only; the
  Safari variant additionally inlines `build/plist-plugin.mjs`. Generated
  bundles are byte-level equivalent (±92 bytes from `DefinePlugin` timestamp
  drift) to the previous output.

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
- **Build toolchain — webpack pipeline now direct (2026-05-04 ×2)**:
  - `npm run dev` / `prod` / `build-safari[-dev]` invoke `webpack --config
    webpack.config{,.safari}.mjs --mode {development,production}` instead
    of `alpheios-node-build/dist/build.mjs`. `alpheios-node-build` itself
    stays as a devDep but is now used only by `update-styles`,
    `webext-polyfill-update`, and `dist` (which delegate to its
    `dist/files.mjs` and `dist/zip.mjs` — pure `fs-extra` helpers with no
    webpack coupling).
  - `webpack-cli ^5.1.4` added — required for direct CLI invocation, was
    not previously present because the alpheios-node-build pipeline used
    webpack programmatically.
  - `--openssl-legacy-provider` and `--experimental-modules` flags removed
    from every npm script. Modern webpack 5.106+ no longer hashes via
    OpenSSL MD4, and Node 20+ has stable native ESM, so neither flag
    contributes anything.
  - `github-build.mjs` rewritten: no longer imports `Builder` from
    `alpheios-node-build`; uses `execSync('npm run build')` and inlines
    its own `generateBuildInfo` (mirror of the prior alpheios-node-build
    helper).
- **Node engine baseline 14.1 → 20.0** (2026-05-04 ×2):
  - `package.json.engines.node` `>=14.1.0` → `>=20.0.0`;
    `engines.npm` `>=6.13.0` → `>=10.0.0`.
  - `.github/workflows/main.yml`: `node-version: '14'` → `'20'`;
    `actions/checkout@v2` → `@v4`; `actions/setup-node@v2-beta` → `@v4`;
    legacy `actions/create-release@v1` + `actions/upload-release-asset@v1`
    pair replaced with `softprops/action-gh-release@v2` (single action);
    `EndBug/add-and-commit@v4` → `@v9`. The `npm update` step that ran
    after `npm install` is gone — semver-floating updates inside CI break
    determinism.
- **`.babelrc` simplified** (2026-05-04 ×2). Reduced to
  `{ "presets": [["@babel/preset-env", { "targets": { "node": "current" } }]] }`.
  Removed `@babel/plugin-transform-runtime`, `module-resolver`, and
  `@babel/plugin-proposal-object-rest-spread`. The explicit `targets`
  matters: without it, `@babel/preset-env` transforms `async`/`await`
  through `regeneratorRuntime`, which 404s once `@babel/runtime` is gone
  (the test suite caught this in Phase 4D — `regeneratorRuntime is not
  defined` from `auth0-sw-client.test.js`). With Node 20+ as the jest
  target, the transform is skipped entirely.
- **Direct-dependency major bumps (Tier 3, 2026-05-04 follow-up)**:
  - `jsonwebtoken` `^8.5.1` → `^9.0.2` (installed 9.0.3). The repo's only
    use is `jwt.decode(accessToken)` in `src/content/content-safari.js:310`,
    and `decode` is unchanged across the 8→9 boundary; the breaking changes
    in 9.x are scoped to `sign` / `verify`. Closes the upstream dependabot
    PR #351 idea.
  - `webpack-bundle-analyzer` `^3.9.0` → `^4.10.2`. CLI tool only, no source
    imports, so the 4.x ESM rewrite has no impact on this repo's pipeline.
- **Transitive upgrades captured in `package-lock.json` (Tier 2, 2026-05-04
  follow-up, `npm audit fix` without --force)**: `+124 / -196 / changed 273`
  packages in one round. Direct-dep installed versions advanced inside
  their existing caret ranges: `webpack` 5.4 → 5.106.2, `terser` 5.3 →
  5.46.2, `vue` 2.6 → 2.7.16 (final 2.x, EOL), `eslint` 7.12 → 7.32.0
  (final 7.x), `copy-webpack-plugin` 6.3 → 6.4.1. `package.json` declared
  ranges intentionally left untouched — the caret already includes the new
  versions, and `package-lock.json` is the single source of truth.
- Documentation refreshed:
  - `README.md` — "Project Revival Status" rewritten to reflect that the
    MV3 shell migration has landed and to list remaining items
    (Auth0 P1 verification, optional toolchain modernization).
  - `doc/guides/DEVELOPMENT.md` — "Modernization Context" rewritten to describe
    the completed API mapping rather than the historical V2 surface.
    A new "Build Toolchain" section (2026-05-04 ×2) documents the inline
    `webpack.config{,.safari}.mjs` pipeline, the reduced role of
    `alpheios-node-build` (file ops only), the Node 20 / npm 10 engine
    baseline, and the standard verify-gate command chain.
  - `doc/guides/BUILD-FF-CHROME.md` — declares MV3 output, Firefox 115+ minimum,
    and a single `dist.zip` for both stores. Refreshed in 2026-05-04 ×2 to
    state the Node 20 LTS / npm 10 prerequisites, the removal of the
    `--openssl-legacy-provider` / `--experimental-modules` flags, the
    direct `webpack --config webpack.config.mjs` invocation, and to point
    at `DEPENDENCY-NOTES.md` "第三轮" for the dropped-package table.
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
- **Toolchain unification — ~30 packages dropped (2026-05-04 ×2)**.
  Now that `webpack.config.mjs` / `webpack.config.safari.mjs` drive the
  build directly, the entire bundle of preset peer-dependencies that
  `alpheios-node-build/dist/presets/*.mjs` declared but our actual
  source never used is gone:
  - **Vue ecosystem (8)**: `vue`, `vue-template-compiler`, `vue-loader`,
    `vue-template-loader`, `vue-style-loader`, `vue-svg-loader`, `vue-jest`,
    `vue-eslint-parser`. `eslint-plugin-vue` and `jest-vue-preprocessor`
    + `jest-serializer-vue` from the jest/lint side. `eslintConfig.extends`
    drops `plugin:vue/essential`; `package.json.jest` drops the `.vue`
    transform, the `^vue$` `moduleNameMapper`, and the `vue` entry from
    `moduleFileExtensions`.
  - **CSS / PostCSS / Sass (10)**: `mini-css-extract-plugin`, `css-loader`,
    `postcss-import`, `postcss-loader`, `postcss-safe-important`,
    `postcss-scss`, `sass`, `sass-loader`, `autoprefixer`,
    `optimize-css-assets-webpack-plugin`, `style-loader`. CSS in this
    repo is copied via `update-styles` (shx + alpheios-node-build's
    `files.mjs`), never imported through webpack.
  - **Imagemin + webpack peripherals (16)**: `imagemin`, `imagemin-jpegtran`,
    `imagemin-optipng`, `imagemin-svgo`, `webpack-cleanup-plugin`,
    `webpack-bundle-analyzer`, `webpack-dev-server`, `webpack-merge`,
    `parallel-webpack`, `inspectpack`, `html-webpack-plugin`, `file-loader`,
    `raw-loader`, `url-loader`, `source-map-loader`, `copy-webpack-plugin`,
    `terser-webpack-plugin`, `terser`. Icons are copied directly via shx;
    no webpack-side dev server has ever been used; `clean-webpack-plugin`
    suffices for build-dir hygiene.
  - **Babel runtime (5)**: `@babel/plugin-transform-modules-commonjs`,
    `@babel/plugin-transform-runtime`, `@babel/register`, `@babel/runtime`,
    `babel-plugin-dynamic-import-node`, `babel-plugin-module-resolver`.
    Modern Node + webpack 5 + `@babel/preset-env { targets: { node: 'current' } }`
    handles everything we need.
  - Misc dead deps: `chalk` (only alpheios-node-build's CLI internally
    used it), the accidental `caniuse-lite` direct dep introduced earlier
    in the day during the Tier 1 baseline-fetch.
  - Direct devDeps count: 65+ → **30**. `npm install` shows roughly -300
    transitive packages.
  - Vulnerability total: **135 → 37** (`-98`); critical 4 → **0**;
    high 46 → 4. The 37 remaining are entirely inside the jest 26.6.3
    transitive chain (`sane`/`micromatch`/`braces`/`@tootallnate/once` →
    `jsdom`); jest 26 → 29/30 is a follow-up PR. `npm audit --omit=dev`
    reports zero vulnerabilities.

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
- Toolchain swap (Webpack → Vite). See `doc/migration/PENDING-DECISIONS.md`
  decision 2: deferred to the next major version. The 2026-05-04 toolchain
  unification work landed 路线 C 修订版 (direct webpack CLI via
  in-repo `webpack.config{,.safari}.mjs`) without bringing in Vite;
  `alpheios-node-build` is kept in `devDependencies` solely for file ops
  (`dist/files.mjs` / `dist/zip.mjs`) so the QA / release pipeline keeps
  working.
- End-to-end service-worker ↔ content-script integration tests via
  `puppeteer` / `playwright`. Tracked separately; the unit tests above
  cover the pure-logic surface.

### Notes
- `npm run verify:worker-safe` and the new jest suites are the
  pre-merge baseline. `npm run verify:p0` still requires a fresh
  `npm run build-dev` and is run by reviewers locally.
- Firefox 115 ESR or newer is the supported floor.
