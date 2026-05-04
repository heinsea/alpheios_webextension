/* global browser, BUILD_NUMBER, BUILD_NAME, BUILD_BRANCH */
/**
 * Alpheios v3 (Scholarly Glass) content-script entry.
 *
 * Stage 0 scope: ShadowRoot + Vue 3 mount of static UI fixtures.
 *
 * Stage 4a scope: also instantiate the alpheios-core AppController with
 * ONLY AuthModule registered (no PanelModule / PopupModule / ToolbarModule /
 * ActionPanelModule — the v3 UI replaces them entirely). The controller is
 * provided into the Vue 3 tree via `mount.js`, where `useAppController()`
 * picks it up. Stage 4b will start consuming it through composables.
 *
 * Notes:
 *   - URL gate `?alpheios=v3` is double-checked here even though
 *     background-process.js's `loadContentScript` already gates the
 *     injection — DevTools manual injection bypasses that path.
 *   - Hard mutex with v2: background only ever injects ONE of
 *     content.js / content-v3.js per tab, so we never run alongside the
 *     legacy AppController on the same page.
 *   - The MessagingService is created so BgAuthenticator can ping the
 *     background's auth flow. The inbound listener is wired so auth
 *     responses come back, but we deliberately DO NOT register a
 *     STATE_REQUEST handler (icon-click activation is a v2-only flow).
 */

import {
  TabScript, AppController, ExtensionSyncStorage, HTMLPage,
  AuthModule, Platform, Logger
} from 'alpheios-components'
import MessagingService from '@/lib/messaging/service.js'
import BgAuthenticator from '@/lib/auth/bg-authenticator.js'
import { mount } from '@/ui-v3/mount.js'

const V3_FLAG = '__ALPHEIOS_V3_ACTIVE__'
const HOST_ID = 'alpheios-v3-host'

// eslint-disable-next-line no-unused-expressions
typeof BUILD_NUMBER // referenced so DefinePlugin keeps the constant alive

;(async function bootV3 () {
  if (window[V3_FLAG]) {
    // Already mounted in this frame — re-injection is a no-op.
    return
  }

  // Query gate. background-process.js only injects this file when the URL
  // contains ?alpheios=v3, but a manual injection (e.g. via DevTools) might
  // bypass that path, so we re-check here.
  let mode = 'production'
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.get('alpheios') !== 'v3') {
      return
    }
    const m = url.searchParams.get('mode')
    mode = ['dev', 'development'].includes(m) ? 'development' : 'production'
  } catch {
    return
  }

  window[V3_FLAG] = true
  const logger = Logger.getInstance()
  // eslint-disable-next-line no-console
  console.log(`[alpheios-v3] mounting · build=${typeof BUILD_NAME !== 'undefined' ? BUILD_NAME : 'dev'}`)

  // ── AppController boot (data-only, no UI modules) ─────────────────────
  let appController = null
  let messagingService = null
  try {
    messagingService = new MessagingService()
    const browserManifest = browser.runtime.getManifest()

    // TabScript state — flagged ACTIVE up-front so AuthModule's data
    // module activate() runs without us depending on a STATE_REQUEST from
    // background. v3 self-activates (URL gate IS the activation signal).
    const state = new TabScript()
    state.status = TabScript.statuses.script.ACTIVE
    state.setPanelDefault()
    state.setTabDefault()

    appController = AppController.create(state, {
      storageAdapter: ExtensionSyncStorage,
      app: {
        name: browserManifest.name,
        version: browserManifest.version,
        buildBranch: BUILD_BRANCH,
        buildNumber: BUILD_NUMBER,
        buildName: BUILD_NAME
      },
      appType: Platform.appTypes.WEBEXTENSION,
      mode
    })

    // Register ONLY the AuthModule. Panel / Popup / Toolbar / ActionPanel
    // are v2 UI surfaces — v3 replaces them. AppController.create() has
    // already attached the data-side L10nModule + LexisModule.
    appController.registerModule(AuthModule, { auth: new BgAuthenticator(messagingService) })

    await appController.init()
    appController.state.setEmbedLibStatus(HTMLPage.isEmbedLibActive)

    // Wire the inbound message listener so auth callbacks delivered by
    // background reach BgAuthenticator. We don't add a STATE_REQUEST
    // handler — the icon-click activation flow is v2-only.
    browser.runtime.onMessage.addListener(messagingService.listener.bind(messagingService))

    await appController.activate()
    // eslint-disable-next-line no-console
    console.log('[alpheios-v3] AppController active · auth module ready')
  } catch (err) {
    logger.error(`[alpheios-v3] AppController init/activate failed: ${err && err.message ? err.message : err}`)
    appController = null // mount() will fall back to fixtures
  }

  // ── Vue 3 UI mount ────────────────────────────────────────────────────
  try {
    const dispose = await mount({ hostId: HOST_ID, appController })
    window.addEventListener('beforeunload', () => {
      try { dispose && dispose() } catch { /* swallow */ }
      try {
        if (appController) appController.deactivate()
      } catch { /* swallow */ }
      window[V3_FLAG] = false
    }, { once: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[alpheios-v3] mount failed', err)
    window[V3_FLAG] = false
  }
})()
