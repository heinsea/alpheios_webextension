import { readFileSync } from 'fs'
import path from 'path'

const root = process.cwd()

const filesToCheck = [
  'src/background/background.js',
  'src/background/background-process.js',
  'src/background/background-models.js',
  'src/lib/messaging/service.js',
  'src/lib/messaging/request/state-request.js'
]

const windowPattern = /\bwindow\./
const uiPackagePattern = /from\s+['"]alpheios-components['"]/

function fail (message) {
  console.error(`Worker-safe verify failed: ${message}`)
  process.exit(1)
}

function ok (message) {
  console.log(`Worker-safe verify ok: ${message}`)
}

for (const relativePath of filesToCheck) {
  const fullPath = path.join(root, relativePath)
  const content = readFileSync(fullPath, 'utf8')

  if (windowPattern.test(content)) {
    fail(`${relativePath} contains "window." usage`)
  }

  if (uiPackagePattern.test(content)) {
    fail(`${relativePath} still imports alpheios-components`)
  }

  ok(`${relativePath} passed`)
}

console.log('Worker-safe verify passed.')
