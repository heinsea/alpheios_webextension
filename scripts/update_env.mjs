import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

const [, , webextClientIdArg, safariClientIdArg, testIdArg] = process.argv

const webextClientId = webextClientIdArg || 'LOCAL_DEV_NO_AUTH'
const safariClientId = safariClientIdArg || webextClientId
const testId = testIdArg || ''

const targets = [
  { path: 'dist/env-webext.js', clientId: webextClientId, testId },
  { path: 'src/env/env-webext-config.js', clientId: webextClientId, testId },
  { path: 'src/lib/auth/env-safari-app-ext.js', clientId: safariClientId, testId: '' }
]

/**
 * Replace the AUTH0_CLIENT_ID / TEST_ID assignments in a config file.
 *
 * The original implementation only swapped the literal strings
 * `PLACE_AUTH0_CLIENT_ID_HERE` and `PLACE_TEST_ID_HERE`. That worked for the
 * very first run against an untouched template but became a one-way trip:
 * once the placeholders were substituted, a later
 *   `npm run set-auth0 -- <real-client-id>`
 * could not flip the file back from a previous test-mode value (e.g. it
 * could not clear `TEST_ID: 'mock-token'` once it had been written). That
 * stale `TEST_ID` then short-circuited the real-Auth0 login path in
 * `BackgroundProcess.loginRequestHandler`.
 *
 * The current implementation rewrites the assignments by field name and is
 * idempotent across repeated invocations and across A↔B mode switches.
 */
function replaceAssignment (source, fieldName, newValue) {
  // Match: AUTH0_CLIENT_ID: '...whatever...'
  // Tolerates single or double quotes and any current value.
  const pattern = new RegExp(`(${fieldName}\\s*:\\s*)(['"])[^'"]*\\2`)
  if (!pattern.test(source)) {
    return source
  }
  const escaped = newValue.replace(/'/g, "\\'")
  return source.replace(pattern, `$1'${escaped}'`)
}

async function updateFile (targetPath, clientId, testIdValue) {
  if (!existsSync(targetPath)) {
    return false
  }

  const original = await readFile(targetPath, 'utf8')
  let updated = original

  // Back-compat: keep the placeholder substitution so first-run on a fresh
  // template still works (the template file itself contains the placeholders).
  updated = updated
    .replace(/PLACE_AUTH0_CLIENT_ID_HERE/g, clientId)
    .replace(/PLACE_TEST_ID_HERE/g, testIdValue)

  // Real fix: rewrite the assignment by field name, so we can move from any
  // current value to any target value (including clearing TEST_ID back to '').
  updated = replaceAssignment(updated, 'AUTH0_CLIENT_ID', clientId)
  updated = replaceAssignment(updated, 'TEST_ID', testIdValue)

  if (updated === original) {
    return false
  }

  await writeFile(targetPath, updated, 'utf8')
  return true
}

async function main () {
  const results = await Promise.all(targets.map(target => updateFile(target.path, target.clientId, target.testId)))
  const updatedCount = results.filter(Boolean).length
  if (!updatedCount) {
    console.warn('No environment files were updated. Run `npm run update-dist` first.')
    process.exit(0)
  }
  console.log(`Updated ${updatedCount} environment file(s).`)
  console.log(`AUTH0_CLIENT_ID set to: ${webextClientId}`)
  console.log(`TEST_ID set to: ${testId === '' ? '<empty>' : testId}`)
  if (testId) {
    console.log('TEST_ID is non-empty: real-Auth0 login will still take precedence when AUTH0_CLIENT_ID is a real value.')
  }
}

main().catch((error) => {
  console.error('Failed to update environment files:', error)
  process.exit(1)
})
