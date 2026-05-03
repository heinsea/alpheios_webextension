import Browser from '../lib/browser'
import Process from './background-process'

// Detect browser features. In MV3 the `browser` namespace is provided by the
// webextension-polyfill bundle, but we keep feature detection here so this
// background entry can still recover gracefully on unusual environments
// (older Firefox temporary loads or non-polyfilled Chromiums).
const browserFeatures = new Browser().inspect().getFeatures()
if (!browserFeatures.browserNamespace) {
  try {
    globalThis.browser = require('webextension-polyfill')
  } catch (error) {
    console.warn('Unable to load webextension-polyfill, fallback to chrome namespace', error)
    globalThis.browser = globalThis.chrome
  }
}

let backgroundProcess = new Process(browserFeatures) // eslint-disable-line prefer-const
backgroundProcess.initialize()
