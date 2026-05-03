import { execSync } from 'child_process'
import * as core from '@actions/core'
import branch from 'git-branch'

/**
 * Mirror of the build-info shape produced by the legacy
 * `node_modules/alpheios-node-build/dist/support/build-info.mjs`. Inlined here
 * so this script no longer needs to import alpheios-node-build's `Builder`.
 */
function generateBuildInfo (datetime = Date.now()) {
  let branchName
  try {
    branchName = branch.sync()
  } catch {
    branchName = 'headless'
  }
  if (branchName === 'master') branchName = 'dev'
  const branchPart = (branchName === 'production') ? '' : branchName + '.'

  const now = new Date(datetime)
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString(10).padStart(2, '0')
  const day = now.getDate().toString(10).padStart(2, '0')
  const counter = Math.round((now.getHours() * 60 + now.getMinutes()) / 2)
    .toString(10).padStart(3, '0')
  const timestamp = `${year}${month}${day}${counter}`

  return {
    branch: branchName,
    number: timestamp,
    name: `${branchPart}${timestamp}`
  }
}

(async function () {
  const buildDT = Date.now()
  const buildInfo = generateBuildInfo(buildDT)

  try {
    if (buildInfo.branch === 'qa' || buildInfo.branch === 'production') {
      console.info(`Installing alpheios-core from #${buildInfo.branch} branch`)
      execSync(
        `npm install https://github.com/alpheios-project/alpheios-core#${buildInfo.branch} --legacy-peer-deps`,
        { stdio: 'inherit' }
      )
    }
  } catch (error) {
    console.error('alpheios-core install failed:', error)
    process.exit(1)
  }

  console.info('Rebuilding the webextension (Chrome/Firefox + Safari). This may take a while.')
  try {
    // `npm run build` runs build-prod (Chrome/Firefox webpack) + Safari webpack +
    // a final update-styles. Both webpack configs (webpack.config.mjs /
    // webpack.config.safari.mjs) regenerate build info themselves, so the
    // BUILD_NAME they emit will match the one we set as the GitHub Actions
    // output below (rounded to the same minute counter).
    execSync('npm run build', { stdio: 'inherit' })
  } catch (error) {
    console.error('Build process failed:', error)
    process.exit(1)
  }
  console.info('Rebuilding of a webextension has been completed')

  try {
    core.default.setOutput('buildName', buildInfo.name)
  } catch (error) {
    console.error('Failed to set output variable:', error)
    process.exit(1)
  }
})()
