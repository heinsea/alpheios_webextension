import { existsSync, readFileSync, statSync } from 'fs'
import path from 'path'

const root = process.cwd()
const distDir = path.join(root, 'dist')
const manifestPath = path.join(distDir, 'manifest.json')
const backgroundPath = path.join(distDir, 'background.js')

function fail (message) {
  console.error(`P0 verify failed: ${message}`)
  process.exit(1)
}

function ok (message) {
  console.log(`P0 verify ok: ${message}`)
}

if (!existsSync(distDir)) {
  fail('dist directory does not exist. Run `npm run build-dev` first.')
}
ok('dist directory exists')

if (!existsSync(manifestPath)) {
  fail('dist/manifest.json is missing')
}
ok('dist/manifest.json exists')

let manifest
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
} catch (error) {
  fail(`manifest.json is not valid JSON: ${error.message}`)
}
ok('manifest.json is valid JSON')

if (manifest.manifest_version !== 3) {
  fail(`manifest_version must be 3, got ${manifest.manifest_version}`)
}
ok('manifest_version is 3')

if (!manifest.background || manifest.background.service_worker !== 'background.js') {
  fail('background.service_worker must be "background.js"')
}
ok('background.service_worker is configured')

if (!manifest.action) {
  fail('action must be configured')
}
// The toolbar action no longer uses a popup; clicking the icon directly
// dispatches `browser.action.onClicked` which the background service
// worker handles via `browserActionListener` (toggle activation).
if (manifest.action.default_popup) {
  fail(`action.default_popup must NOT be set (direct-click toggle), got "${manifest.action.default_popup}"`)
}
ok('action is configured for direct-click toggle (no default_popup)')

if (!existsSync(backgroundPath)) {
  fail('dist/background.js is missing')
}
if (statSync(backgroundPath).size <= 0) {
  fail('dist/background.js is empty')
}
ok('dist/background.js exists and is non-empty')

console.log('P0 verify passed.')
