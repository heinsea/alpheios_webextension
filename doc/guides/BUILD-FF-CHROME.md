## Webextension Build Instructions (Chrome and Firefox)

**1. Install Dependencies**

**Prerequisites**: Node **20 LTS or newer**, npm **10 or newer** (enforced by
`package.json.engines`). The `--openssl-legacy-provider` /
`--experimental-modules` flags that older docs may reference are **no longer
required and have been removed from every npm script** — modern webpack 5.106+
no longer hashes via OpenSSL MD4, and Node 20+ has stable native ESM.

**Browser support targets** (see [`../migration/PENDING-DECISIONS.md`](../migration/PENDING-DECISIONS.md) decision 1):

- Chrome / Chromium: Manifest V3 only.
- Firefox: **115 ESR or newer** (set via `browser_specific_settings.gecko.strict_min_version`
  in `src/manifest/manifest.json`). Older Firefox releases lack reliable MV3
  service-worker support and are no longer targeted.
- Safari: built separately from `src/safari-app-extension/`; see [`BUILD-SAFARI.md`](BUILD-SAFARI.md).

A single MV3 `manifest.json` is shipped to both Chrome Web Store and Mozilla AMO.

Standard install:

```
npm install
```

If you see install failures from `peerDependencies` resolution against the
private `alpheios-core` / `alpheios-node-build` git packages, use the
compatibility install command (delegates to
`npm install --legacy-peer-deps --ignore-scripts`):

```
npm run install:dev-safe
```

**2. Build the distribution Javascript and CSS files**

```
npm run update-dist && npm run update-styles
npm run set-auth0 -- <AUTH0_CLIENT_ID>
npm run prod
```

This invokes Webpack 5 **directly** via the in-repo
[`webpack.config.mjs`](../../webpack.config.mjs)
(`npm run prod` resolves to `webpack --config webpack.config.mjs --mode production`).

As of 2026-05-04 the build no longer goes through the
`alpheios-node-build` `Builder` + preset chain. The repo keeps
`alpheios-node-build` in `devDependencies` purely as a file-ops helper
(`dist/files.mjs` for the `update-styles` / `webext-polyfill-update` /
`dist` scripts; `dist/zip.mjs` for the dist zip). Webpack-side preset
peer-dependencies (`webpack-cleanup-plugin`, `mini-css-extract-plugin`,
`vue-svg-loader`, the imagemin pipeline, etc.) have been removed in the
same round — see
[`../migration/DEPENDENCY-NOTES.md`](../migration/DEPENDENCY-NOTES.md)
"第三轮 — 工具链统一升级" for the full ~30-package removal table and the
byte-level equivalence check against the previous output.

A future toolchain swap (e.g. to Vite) is still tracked in
[`../migration/PENDING-DECISIONS.md`](../migration/PENDING-DECISIONS.md)
decision 2 (路线 B); the 2026-05-04 work landed 路线 C 修订版 — direct
webpack CLI — without bringing in Vite.

If you only want to test UI behavior (including the toolbar action) and do not need
login testing yet, you can skip setting a real Auth0 client id:

```
npm run update-dist && npm run update-styles
npm run set-auth0
npm run build-dev
```

`build-dev` is the development-mode pipeline:
`update-dist` → `update-styles` → `dev` (which is
`webpack --config webpack.config.mjs --mode development`).

Optional test-mode auth config (for message flow validation without real Auth0 UI):

```
npm run set-auth0 -- LOCAL_DEV_NO_AUTH LOCAL_DEV_NO_AUTH <TEST_ACCESS_TOKEN>
```

## See It In Browser (Direct-Click Activation)

**Chrome**
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repo's `dist` folder.
4. Pin the extension and click its toolbar icon.
5. Verify:
   - Click toggles Alpheios on/off (no popup is shown).
   - Badge text shows `On` while active.
   - Right-click on the toolbar icon → context menu offers `Activate / Deactivate / Open Info Panel`.

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `dist/manifest.json`.
4. Click the extension icon in toolbar and verify the same direct-click toggle behavior.

**3. Build Firefox and Chrome Package**
```
npm run zip <version>
```
Creates the extension zip file.

