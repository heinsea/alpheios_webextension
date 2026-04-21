# Alpheios WebExtension
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Overview

This repository contains the wrapper code for the Alpheios Reading Tools Browser
extensions for Chrome, Firefox and Safari.  The core functionality is provided
by the [`alpheios-components`](https://github.com/alpheios-project/alpheios-core/tree/master/packages/components)
library. The webextension wrapper code provides the implementation of the
[WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API) (Chrome/FF)
and [App Extension API](https://developer.apple.com/documentation/safariservices/safari_app_extensions) (Safari).

See also [DEVELOPMENT.md](DEVELOPMENT.md).

## Project Revival Status

This extension has a long-lived blocker tracked in
[issue #324](https://github.com/alpheios-project/webextension/issues/324):
`upgrade to Manifest V3 (Chrome and FF)` (opened on October 26, 2021, currently open).

Current code is still based on Manifest V2 APIs (for example `browser_action` and
`tabs.executeScript`), which is the main reason maintenance became difficult.

To restart active support, the project is being modernized in phases:

1. Restore maintainability and simplify local development.
2. Modernize extension shell UI (popup and control surface).
3. Migrate runtime architecture toward Manifest V3-compatible APIs.
4. Keep Firefox support aligned while maintaining Safari integration.

The new popup control UI is now included and provides:
- Active tab status visibility
- One-click activate/deactivate
- Quick open of the info panel

## Quick Local Preview

Run from repository root:

```bash
npm run install:dev-safe
npm run update-dist && npm run update-styles
npm run set-auth0
npm run build-dev
```

Notes for this legacy codebase:
- You may still see many `deprecated` warnings during install. This is expected
  until dependency modernization is completed in phases.
- `install:dev-safe` uses `--legacy-peer-deps --ignore-scripts` to avoid known
  transitive native-module failures on newer Node versions.

Then load `dist` as an unpacked extension:
- Chrome: `chrome://extensions` -> Developer mode -> Load unpacked -> select `dist`
- Firefox: `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> select `dist/manifest.json`

After loading, click the extension toolbar icon to see the new popup UI and test:
- Activate/Deactivate toggle
- Open Info Panel action (enabled when active)

## Development and Reviewer Build Instructions

See [BUILD-FF-CHROME.md](BUILD-FF-CHROME.md) and [BUILD-SAFARI.md](BUILD-SAFARI.md).

## QA Build Instructions

1. merge the `master` branch to the `qa` branch and push to GitHub
2. GitHub Actions will execute the release.yml workflow to inject the build
number, install the `qa` branch of alpheios-components,  
build the distribution files, and tag a pre-release in GitHub, with the dist files
packaged as a release artifact.
3. In the Safari build environment, pull the `qa` branch  and extract
the `dist.zip` from the Pre-release in GitHub to the local `dist` directory.
4. Create the Safari Package as described in BUILD-SAFARI.md

### Production Version and Build Instructions

1. merge the `master` branch to the `production` branch and push to GitHub
2. Update the version in `package.json` and `manifest.json`
3. Commit and push the change to GitHub
4. GitHub Actions will execute the release.yml workflow to inject the build
number, install the `production` branch of alpheios-components,  
build the distribution files, and tag a pre-release in GitHub, with the dist files
packaged as a release artifact.
5. In the Safari build environment, pull the `production` branch  and extract
the `dist.zip` from the Pre-release in GitHub to the local `dist` directory.
6. Create the Safari Package as described in BUILD-SAFARI.md
7. When ready to release the code remove the "Pre-release" flag from the
Release in GitHub.
8. Merge the version and any other code changes from `production` back to `master`

