/*
 * Inline webpack config for the Alpheios webextension (Chrome / Firefox).
 *
 * This file replaces the alpheios-node-build `Builder` + preset chain that
 * was the long-standing toolchain bottleneck (deprecated peer-deps locked at
 * pwa-vue.mjs / vue.mjs preset level — see doc/migration/DEPENDENCY-NOTES.md).
 *
 * Scope:
 *   - Two entry points: src/background/background.js and src/content/content.js
 *   - alpheios-components UMD blob aliased (dev: source-mapped, prod: minified)
 *   - DefinePlugin injects BUILD_BRANCH / BUILD_NUMBER / BUILD_NAME constants
 *     that the source code references at the top of content.js / content-safari.js
 *   - Node fallbacks for `crypto` and `stream` (webpack 5 dropped auto-polyfills)
 *
 * The build does NOT compile .vue / .css / .scss / images: src/ contains zero
 * such imports, and CSS is copied to dist/ by the `update-styles` npm script.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import webpack from 'webpack'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import branch from 'git-branch'

const __filename = fileURLToPath(import.meta.url)
const projectRoot = path.dirname(__filename)

/**
 * Generate build info compatible with the previous alpheios-node-build behavior.
 * Format: { branch: 'branch-name', number: 'YYYYMMDDCCC', name: 'branch.YYYYMMDDCCC' }
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
    mode: argv.mode || 'development',
    context: path.join(projectRoot, 'src'),
    entry: {
      background: './background/background.js',
      content: './content/content.js',
      // v3 (Scholarly Glass) parallel content script. Selected at injection
      // time by `loadContentScript` in background-process.js based on the
      // tab URL's `?alpheios=v3` query. See doc/ui/REFACTOR-V3-PLAN.md.
      'content-v3': './content/content-v3.js',
      'grammar-reader': './content/grammar-reader.js'
    },
    output: {
      path: path.join(projectRoot, 'dist'),
      filename: '[name].js',
      clean: false // CleanWebpackPlugin (cleanOnceBeforeBuildPatterns) handles this
    },
    devtool: isProd ? false : 'source-map',
    module: {
      rules: [
        {
          // `import css from 'foo.css?raw'` returns the raw text. Used by
          // src/ui-v3/shadow-host.js to inline the components-v3 stylesheet
          // into the closed ShadowRoot (avoids needing
          // web_accessible_resources for the dist css path).
          resourceQuery: /raw/,
          type: 'asset/source'
        }
      ]
    },
    resolve: {
      // webpack 5 stopped auto-polyfilling Node core modules.
      // crypto-browserify / stream-browserify provide in-browser equivalents
      // for the small surface auth0-sw-client.js needs (subtle, randomBytes).
      fallback: {
        crypto: path.resolve(projectRoot, 'node_modules/crypto-browserify'),
        stream: path.resolve(projectRoot, 'node_modules/stream-browserify')
      },
      alias: {
        // The `$` suffix forces an exact match: only `import 'alpheios-components'`
        // is aliased; the package's internal sub-paths (if any) are unaffected.
        'alpheios-components$': path.join(
          projectRoot,
          isProd
            ? '../alpheios_alpheios-core/packages/components/dist/alpheios-components.min.js'
            : '../alpheios_alpheios-core/packages/components/dist/alpheios-components.js'
        ),
        // v3 UI: pre-built ESM bundle from the fork (Vite library mode).
        // We alias both the bare specifier and the `/style.css` subpath so
        // shadow-host.js can `?raw`-import the stylesheet.
        'alpheios-components-v3$': path.resolve(
          projectRoot,
          '../alpheios_alpheios-core/packages/components-v3/dist/components-v3.js'
        ),
        'alpheios-components-v3/grammar-reader$': path.resolve(
          projectRoot,
          '../alpheios_alpheios-core/packages/components-v3/src/grammar-reader/grammar-reader.js'
        ),
        'alpheios-components-v3/style.css$': path.resolve(
          projectRoot,
          '../alpheios_alpheios-core/packages/components-v3/dist/style.css'
        ),
        // Vue 3 runtime — pinned to the bundler build so component templates
        // compiled by Vite-side @vitejs/plugin-vue can render at runtime
        // without needing a template compiler in the webextension bundle.
        vue$: path.join(projectRoot, 'node_modules/vue/dist/vue.runtime.esm-bundler.js'),
        '@': path.join(projectRoot, 'src')
      }
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['background*.js*', 'content*.js*']
      }),
      new webpack.DefinePlugin({
        BUILD_BRANCH: JSON.stringify(buildInfo.branch),
        BUILD_NUMBER: JSON.stringify(buildInfo.number),
        BUILD_NAME: JSON.stringify(buildInfo.name),
        // These constants exist in alpheios-components-aware code paths; keep
        // injecting them so the prebuilt UMD blob's runtime checks behave.
        PRODUCTION_MODE_BUILD: JSON.stringify(isProd),
        DEVELOPMENT_MODE_BUILD: JSON.stringify(!isProd),
        // Vue 3 feature flags — see https://link.vuejs.org/feature-flags
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
      })
    ]
  }
}
