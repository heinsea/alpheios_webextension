## Webextension Build Instructions (Chrome and Firefox)

**1. Install Dependencies**

**Prerequisites**: Node 18+ (Node 20 LTS recommended), npm 9+.

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
and Firefox.

Note: this repository is in an active modernization process. Current build output
is still based on Manifest V2 and is being refactored toward Manifest V3 support.

If you only want to test UI behavior (including the new popup) and do not need
login testing yet, you can skip setting a real Auth0 client id:

```
npm run update-dist && npm run update-styles
npm run set-auth0
npm run build-dev
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

