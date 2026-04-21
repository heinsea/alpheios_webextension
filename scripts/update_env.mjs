import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

const [, , webextClientIdArg, safariClientIdArg] = process.argv

const webextClientId = webextClientIdArg || 'LOCAL_DEV_NO_AUTH'
const safariClientId = safariClientIdArg || webextClientId

const targets = [
  { path: 'dist/env-webext.js', clientId: webextClientId },
  { path: 'src/lib/auth/env-safari-app-ext.js', clientId: safariClientId }
]

async function updateFile (targetPath, clientId) {
  if (!existsSync(targetPath)) {
    return false
  }

  const original = await readFile(targetPath, 'utf8')
  const updated = original.replace(/PLACE_AUTH0_CLIENT_ID_HERE/g, clientId)
  await writeFile(targetPath, updated, 'utf8')
  return true
}

async function main () {
  const results = await Promise.all(targets.map(target => updateFile(target.path, target.clientId)))
  const updatedCount = results.filter(Boolean).length
  if (!updatedCount) {
    console.warn('No environment files were updated. Run `npm run update-dist` first.')
    process.exit(0)
  }
  console.log(`Updated ${updatedCount} environment file(s).`)
}

main().catch((error) => {
  console.error('Failed to update environment files:', error)
  process.exit(1)
})
