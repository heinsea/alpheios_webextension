import { existsSync, readFileSync, statSync } from 'fs'
import path from 'path'

const root = process.cwd()
const distDir = path.join(root, 'dist')
const manifestPath = path.join(distDir, 'manifest.json')
const backgroundPath = path.join(distDir, 'background.js')
const popupPath = path.join(distDir, 'popup.html')

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

if (!manifest.action || manifest.action.default_popup !== 'popup.html') {
  fail('action.default_popup must be "popup.html"')
}
ok('action.default_popup is configured')

if (!existsSync(backgroundPath)) {
  fail('dist/background.js is missing')
}
if (statSync(backgroundPath).size <= 0) {
  fail('dist/background.js is empty')
}
ok('dist/background.js exists and is non-empty')

if (!existsSync(popupPath)) {
  fail('dist/popup.html is missing')
}
ok('dist/popup.html exists')

console.log('P0 verify passed.')
