## Safari App Extension Build Instructions

**1. Install Dependencies**

**Prerequisites**:

* Node **20 LTS or newer** (enforced by `package.json.engines.node >= 20.0.0`)
* npm **10 or newer** (enforced by `package.json.engines.npm >= 10.0.0`)
* XCode 11.3.1 or higher
* Swift 5.1.3 or higher
* Developer Certificate Registered with the Alpheios Apple Developer Account
  installed in your XCode environment

The Node 14 / npm 6 baseline used to be required because of the
`--openssl-legacy-provider` / `--experimental-modules` flags on the older
build pipeline. Both flags were removed during the 2026-05-04 toolchain
unification (see
[`../migration/DEPENDENCY-NOTES.md`](../migration/DEPENDENCY-NOTES.md)
"第三轮"); modern webpack 5.106+ and Node 20+ no longer need them.

```
npm install
```

If you hit `peerDependencies` resolution failures against the private
`alpheios-core` / `alpheios-node-build` git packages, fall back to:

```
npm run install:dev-safe
```

**2. Build the distribution Javascript and CSS files**

```
npm run update-dist && npm run update-styles
bash scripts/update_env.sh <AUTH0_CLIENT_ID>
npm run build-safari
```

`build-safari` invokes Webpack 5 directly via the in-repo
[`webpack.config.safari.mjs`](../../webpack.config.safari.mjs) — the script
chain is `update-dist` → `update-styles` → `lint` →
`webpack --config webpack.config.safari.mjs --mode production` →
`update-styles`. The Safari config inlines `build/plist-plugin.mjs`, which
writes the build number into `src/safari-app-extension/AlpheiosSafari/Info.plist`
and `AlpheiosReadingTools/Info.plist` at the `compiler.hooks.done` stage —
the same Plist injection logic the legacy `alpheios-node-build` Vue preset
provided.

For a development-mode Safari build (skips lint, faster turnaround):

```
npm run build-safari-dev
```

**3. Build Safari Package**

***If producing a development build:***

In **XCode**

* Choose menu **Product** -> **Clean Build Folder**
* Choose menu **Product** -> **Archive**
* Click **Distribute App**, Select **Development** and click **Next**
* Click **Automatically Manage Signing**
* Click **Export**

This *should* create an archive that is signed using the Alpheios Development
Distribution profile, enabled for installation on registered development device ids.

A development build can be packaged using the MacOS **Disk Utility** application:

* Choose menu **File** ->  **New Image** -> **Image From Folder**
* Choose the archive directory exported from XCode
* Click **Save**

This creates a .dmg file which can be opened directly to mount the application disk image.

An installation package for a development build can be produced:

In **XCode**

* if you haven't already, create a Developer ID Installer Signing Certificate
(choose menu **Preferences** -> **Accounts** ->  **+** -> **Developer ID Installer**

From a terminal:

```
cd <location of location of archive directory exported from XCode>
productbuild --component "Alpheios Reading Tools.app" /Applications --sign “<name of developer id installer certificate>" Alpheios.pkg
```

This packgae should be installable using

```
sudo installer -store -pkg Alpheios.pkg -target /
```

***If producing an AppStore build:***

In **XCode**

* Choose menu **Product** -> **Clean Build Folder**
* Choose menu **Product** -> **Archive**
* Click **Distribute App**
* Select **Mac App Store**
* Click **Next**
* Click **Upload**



