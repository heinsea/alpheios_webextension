# Alpheios Webextension Developer Notes

## Modernization Context

The historical blocker for this repository was
[issue #324](https://github.com/alpheios-project/webextension/issues/324),
which tracked migration to Manifest V3 for Chrome and Firefox.

That migration has now landed at the shell level. The codebase no longer uses
the deprecated MV2 APIs:

- `browser_action` → `action`
- `tabs.executeScript` → `browser.scripting.executeScript`
- `tabs.insertCSS` → `browser.scripting.insertCSS`
- persistent background page → `service_worker`

Remaining modernization work (toolchain, cross-browser packaging strategy,
end-to-end Auth0 verification, integration tests) is tracked in
[`../migration/MIGRATION-CHECKLIST.md`](../migration/MIGRATION-CHECKLIST.md).

## Build Toolchain

> **2026-05-04 update — toolchain unification (决策 2 路线 C 修订版).** This
> section reflects the post-unification state. For the full history (and the
> reasoning behind keeping `alpheios-node-build` in the dependency graph at
> all), see
> [`../migration/DEPENDENCY-NOTES.md`](../migration/DEPENDENCY-NOTES.md)
> "第三轮 — 工具链统一升级" and the matching
> [`../migration/PENDING-DECISIONS.md`](../migration/PENDING-DECISIONS.md)
> decision 2 update.

The Chrome / Firefox / Safari builds are driven directly by Webpack 5 via two
in-repo configs:

- [`webpack.config.mjs`](../../webpack.config.mjs) — Chrome / Firefox entry
  points (`src/background/background.js` and `src/content/content.js`).
- [`webpack.config.safari.mjs`](../../webpack.config.safari.mjs) — Safari
  `content-safari` entry plus the `PlistPlugin` hook that writes the build
  number into the Xcode `Info.plist` files under `src/safari-app-extension/`.

The npm scripts that wrap these are:

| script | resolves to |
|---|---|
| `npm run dev` | `webpack --config webpack.config.mjs --mode development` |
| `npm run prod` | `webpack --config webpack.config.mjs --mode production` |
| `npm run build-dev` | `update-dist` → `update-styles` → `dev` |
| `npm run build-prod` | `update-dist` → `update-styles` → `lint` → `prod` |
| `npm run build-safari[-dev]` | analogous, swapping the safari config |

### `alpheios-node-build`'s reduced role

The private `alpheios-node-build` git package historically supplied a
`Builder` class plus a `pwa-vue` / `vue` preset chain that drove webpack
programmatically. That chain pulled in a long list of deprecated peer
dependencies (`webpack-cleanup-plugin`, `mini-css-extract-plugin`,
`vue-svg-loader`, the imagemin pipeline, …) which `src/` never actually
imported (`grep` for `\.vue'` / `\.css'` / `\.scss'` returns zero matches),
but whose absence still broke the top-level `import` of `Builder` itself.

After the 2026-05-04 unification, `alpheios-node-build` is **kept in
`devDependencies` only as a file-ops helper**:

- `dist/files.mjs` is invoked by the `update-styles`,
  `webext-polyfill-update`, and `dist` npm scripts to copy / replace files.
- `dist/zip.mjs` is invoked by the `dist` npm script to produce the
  release zip under `dist-zip/`.

Neither helper touches webpack. Nothing in this repo imports `Builder` or
the preset modules anymore — `github-build.mjs` was rewritten to use
`execSync('npm run build')` and inlines its own `generateBuildInfo` helper.

### Engine baseline

`package.json.engines` requires **Node `>= 20.0.0` and npm `>= 10.0.0`**.
The CI workflow (`.github/workflows/main.yml`) tracks this with
`actions/setup-node@v4` pinned at Node 20. The
`--openssl-legacy-provider` / `--experimental-modules` Node flags that
appeared throughout the older npm scripts have been removed entirely;
modern webpack 5.106+ no longer hashes via OpenSSL MD4, and Node 20+ has
stable native ESM.

### Verify gate

After any toolchain or dependency change, run the standard chain:

```
cmd.exe /c "npm install --legacy-peer-deps"
npm run build-dev
npm run verify:p0
npm run verify:worker-safe
npm test
npm run lint
```

(WSL bash hits intermittent `EBUSY` against Windows file locks during
`npm install`; `cmd.exe /c` is the stable workaround.)

## Authentication
The Webextension uses Auth0 for Authentication. In order for Authentication to work,
the Auth0 Client ID secret must be present in the environment.
This is handled automatically for the QA and Production builds via the GitHub Actions
release workflow. This workflow can be executed from the GitHub UI manually
to produce a development release with authentication enabled for testing.

In addition, for Chrome and FF, the URL for the local testing profile id must be
added to the list of valid callback URLs for the Alpheios Reading Tools application
in the Auth0 console. (The URL is calculated automatically by the code and looks like
https://<profileid>.chromiumapp.org/auth0 and
https://<profileid>.extensions.mozilla.org/auth0 ). It is specific to the directory
a local testing extension is installed from, so it's easiest for testing to always
install the build you are testing from the same directory.

## Initialization sequence

1. Background script loads a content script, content styles, and, if necessary, a webextension polyfill into
a tab.
2. Content script sets itself to a default state.
3. Background script sends a StatusRequest to a content script with a desired content script status.
4. Content script responds with a StatusResponse that has an updated content script state.

If a background scripts wants to change a content script state, it sends a StatusRequest to a content script.
Content script responds with a StatusResponse that has an updated content script state.

If a content script changes its state, it sends a StatusMessage to a background script.

### Stateful Functions
The functions that are monitored should be stateful. They should have a `Statefull` word in their names
by convention. For more information on stateful functions please check "Stateful Functions" section in
Experience Monitor documentation.

## WebExtension ID
Explicit WebExtension ID is not necessary ([https://developer.mozilla.org/en-US/Add-ons/WebExtensions/WebExtensions_and_the_Add-on_ID]).

However, Mozilla Firefox does not support `storage.local` and `storage.sync` for extensions with a temporary ID
(i.e. for temporary extensions that are used during development, [https://bugzil.la/1323228]). Because of
that, ID must be provided in the `applications` section of `manifest.json`. However, Google Chrome will ignore it and produce a warning (but `storage.local` and `storage.sync` will work in Chrome even with a temporary extension's ID
so not a big deal).

`applications` section can be removed once development is complete.

## `sendResponse` callback in `onMessage`
It seems that sendResponse is not supported by webextension-polyfill:
[https://github.com/mozilla/webextension-polyfill/issues/16/#issuecomment-296693219]
The reason seems to be that a response callback might be removed from `onMessage` some time later.
Because of that, we have to implement our own request-response matching mechanism with `MessagingService`.

## Default parameters

### Webextension state (active or inactive)
Default webextension state is "inactive".

### Panel state (open or closed)
Default panel state is determined by a setting in configuration. If not configured by user explicitly,
it is "open".

### Selected panel tab
Default panel tab is "info".

## Usage Scenarios

Webextension uses a tab object to store state of an extension within a certain browser tab or window.
Because of this, each tab has its own state that is completely isolated from the state of the other tab.

Below are some scenarios that describe desired behavior of a webextension within a single tab.

### Activate for the first time in a tab
When an extension is activated in a tab for the first time, it uses default parameters to set its state.

### Activated, navigate to the new page
When an extension is activated, and user navigates to the other page, the webextension retains its
active state, as well as whether a panel is open or not and what tab is active within a panel.

### Activated, navigate to the new page with Alpheios embedded library
An Alpheios embedded library provides its own functionality that conflicts with webextension. Because of this,
on all pages where an embedded library is present and active, webextension will be deactivated. Webextension
UI will be updated to reflect the fact that it has been disabled.

### Activated, navigate to the new page with Alpheios embedded library, return to the previous page
Webextension should restore its state to what it had when the page was left. If webextension was
activated on a page and then disabled automatically after navigating to a page with embedded library, it should
restore its active state. Same applies to other settings such as panel open or closed status and
active tab name. Similar rules apply to scenarios when a webextension was deactivated initially.
After returning to a previous page a webextension state should be "inactive".

### Activated, navigate to the new page, deactivate, navigate back
In this case an extension should be deactivated on the initial page: it wll keep its inactive state
across pages.

### On the same page: activated, deactivated, then activated again
In this case an extension should should reset its state to a default one right before the second activation:
deactivation should always reset a webextension state to default.
