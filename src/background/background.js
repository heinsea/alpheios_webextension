import Browser from '../lib/browser'
import Process from './background-process'

// Detect browser features
const browserFeatures = new Browser().inspect().getFeatures()
console.log(`Support of a "browser" namespace: ${browserFeatures.browserNamespace}`)
if (!browserFeatures.browserNamespace) {
  console.log('"browser" namespace is not supported, will load a WebExtensions polyfill into the background script')
  try {
    globalThis.browser = require('webextension-polyfill')
  } catch (error) {
    console.warn('Unable to load webextension-polyfill, fallback to chrome namespace', error)
    globalThis.browser = globalThis.chrome
  }
}

let backgroundProcess = new Process(browserFeatures) // eslint-disable-line prefer-const
backgroundProcess.initialize()
