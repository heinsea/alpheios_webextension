/*
 * Inline webpack config for the Safari content-script build.
 *
 * This file replaces alpheios-node-build's `vue` preset + custom config-content-safari.mjs
 * pair. Inputs are intentionally similar to webpack.config.mjs — the differences are:
 *   - Single entry: src/content/content-safari.js (Safari-specific runtime path)
 *   - Output filename: content-safari.js (no chunked code-splitting)
 *   - Extra alias: @safari → src/content-safari (kept from prior config)
 *   - PlistPlugin injects build info into the Safari Info.plist files
 *   - devtool intentionally false (source maps not consumed by Safari shell)
 *
 * Scope notes:
 *   - content-safari.js does NOT import .vue or .css files (verified by grep on src/);
 *     the prior `vue` preset's vue-loader / mini-css-extract / sass-loader rules were
 *     dead code for our actual build and are not reproduced here.
 *   - alpheios-components is still aliased to the prebuilt UMD blob.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import webpack from 'webpack'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import branch from 'git-branch'
import PlistPlugin from './build/plist-plugin.mjs'

const __filename = fileURLToPath(import.meta.url)
const projectRoot = path.dirname(__filename)

/**
 * Mirror of the build-info shape produced by alpheios-node-build/dist/support/build-info.mjs.
 * Kept identical so the PlistPlugin (which reads buildInfo.name) keeps writing the
 * same `branch.YYYYMMDDCCC` string into Info.plist's CFBundleVersion field.
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

export default (env, argv) => {
  const isProd = argv.mode === 'production'
  const buildInfo = generateBuildInfo()

  return {
    mode: argv.mode || 'production',
    context: path.join(projectRoot, 'src/content'),
    entry: './content-safari.js',
    output: {
      path: path.join(projectRoot, 'dist'),
      filename: 'content-safari.js',
      clean: false
    },
    // Safari extension shell does not consume source maps from this bundle.
    devtool: false,
    resolve: {
      fallback: {
        crypto: path.resolve(projectRoot, 'node_modules/crypto-browserify'),
        stream: path.resolve(projectRoot, 'node_modules/stream-browserify')
      },
      alias: {
        'alpheios-components$': path.join(
          projectRoot,
          isProd
            ? 'node_modules/alpheios-core/packages/components/dist/alpheios-components.min.js'
            : 'node_modules/alpheios-core/packages/components/dist/alpheios-components.js'
        ),
        '@': path.join(projectRoot, 'src'),
        '@safari': path.join(projectRoot, 'src/content-safari')
      }
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['content-safari*.js*']
      }),
      new webpack.DefinePlugin({
        BUILD_BRANCH: JSON.stringify(buildInfo.branch),
        BUILD_NUMBER: JSON.stringify(buildInfo.number),
        BUILD_NAME: JSON.stringify(buildInfo.name),
        PRODUCTION_MODE_BUILD: JSON.stringify(isProd),
        DEVELOPMENT_MODE_BUILD: JSON.stringify(!isProd)
      }),
      new PlistPlugin({ buildInfo })
    ]
  }
}
