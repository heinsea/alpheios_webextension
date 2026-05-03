## Webextension Build Instructions (Chrome and Firefox)

**1. Install Dependencies**

**Prerequisites**: Node 18+ (Node 20 LTS recommended), npm 9+.

**Browser support targets** (see [`../migration/PENDING-DECISIONS.md`](../migration/PENDING-DECISIONS.md) decision 1):

- Chrome / Chromium: Manifest V3 only.
- Firefox: **115 ESR or newer** (set via `browser_specific_settings.gecko.strict_min_version`
  in `src/manifest/manifest.json`). Older Firefox releases lack reliable MV3
  service-worker support and are no longer targeted.
- Safari: built separately from `src/safari-app-extension/`; see [`BUILD-SAFARI.md`](BUILD-SAFARI.md).

A single MV3 `manifest.json` is shipped to both Chrome Web Store and Mozilla AMO.

If you are on Node 22 and see install/build failures from legacy dependencies,
use the compatibility install command:

```
npm run install:dev-safe
```

```
npm install
npm update
```

For legacy dependency trees, prefer:

```
npm run install:dev-safe
```

**2. Build the distribution Javascript and CSS files**

```
npm run update-dist && npm run update-styles
npm run set-auth0 -- <AUTH0_CLIENT_ID>
npm run prod
```

This uses Webpack to build the distribution Javascript and CSS files for Chrome
and Firefox. The build output is now Manifest V3 (service worker background,
`action` API, `browser.scripting.*` for content/CSS injection); the Webpack +
`alpheios-node-build` toolchain is retained for compatibility with the existing
QA / release pipeline. A future toolchain swap (e.g. to Vite) is tracked in
[`../migration/MIGRATION-CHECKLIST.md`](../migration/MIGRATION-CHECKLIST.md).

If you only want to test UI behavior (including the new popup) and do not need
login testing yet, you can skip setting a real Auth0 client id:

```
npm run update-dist && npm run update-styles
npm run set-auth0
npm run build-dev
```

Optional test-mode auth config (for message flow validation without real Auth0 UI):

```
npm run set-auth0 -- LOCAL_DEV_NO_AUTH LOCAL_DEV_NO_AUTH <TEST_ACCESS_TOKEN>
```

## See It In Browser (Popup + Activation)

**Chrome**
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repo's `dist` folder.
4. Pin the extension and click its toolbar icon.
5. Verify:
   - New popup visual style is shown.
   - `Activate` / `Deactivate` button toggles state.
   - `Open Info Panel` is enabled once active.

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `dist/manifest.json`.
4. Click the extension icon in toolbar and verify the same popup behavior.

**3. Build Firefox and Chrome Package**
```
npm run zip <version>
```
Creates the extension zip file.

