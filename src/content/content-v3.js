/* global browser, BUILD_NUMBER, BUILD_NAME, BUILD_BRANCH */
/**
 * Alpheios v3 (Scholarly Glass) content-script entry.
 *
 * Stage 0 scope: ShadowRoot + Vue 3 mount of the v3 UI.
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

  // background-process.js now defaults to injecting this script (v3 is the
  // default UI). The URL gate is removed — only a guard against the explicit
  // legacy override (?alpheios=v2) remains, in case of manual injection.
  let mode = 'production'
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.get('alpheios') === 'v2') {
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

    // ── Compatibility shims for the missing UIController ────────────────
    // v3 deliberately omits Panel/Popup/Toolbar/ActionPanel UI modules — but
    // alpheios-core internals call `this.api.ui.*` from several data-flow
    // entry points (newLexicalRequest, onTextSelected, sendFeature, etc.).
    // Without a stub, any of those paths throws TypeError mid-flight, leaving
    // the store in a half-committed state. No-op every method we have ever
    // seen referenced from app-controller.js so the data flow can complete.
    if (!appController.api.ui) {
      appController.api.ui = {
        openLexQueryUI () {},
        openPanel () {},
        closePanel () {},
        closeUI () {},
        hasModule () { return false },
        changeTab () {},
        showLookupResultsUI () {},
        isPopupVisible () { return false }
      }
    }

    // ── Helper: kick off a lookup from the v3 search box ────────────────
    // `api.app.newLexicalRequest` only commits store mutations — it does
    // NOT actually issue a LexicalQuery. The real entry point is
    // `api.lexis.lookupText(textSelector)` (the same path v2's lookup.vue
    // uses). We construct a duck-typed TextSelector with the six fields the
    // LOOKUP source path reads (text / languageID / model / data / location
    // / normalizedText) — TextSelector is an internal alpheios-components
    // class, but its surface used by the LOOKUP flow is small enough to
    // synthesize without importing the class.
    appController.runLookup = function (text, langCode) {
      if (!text || !text.trim()) return
      const lookupLanguage = this.api.settings &&
        this.api.settings.getFeatureOptions().items.lookupLanguage
      const code = langCode ||
        (lookupLanguage && lookupLanguage.currentValue) ||
        'lat'
      // Use AppController's own LanguageModelFactory instance. The UMD
      // alpheios-components bundle carries its own data-models copy; creating
      // Symbols from a separately imported alpheios-data-models bundle makes
      // typed lookup subtly diverge from v2.
      const langDetails = this.constructor.getLanguageName(code)
      const languageID = langDetails && langDetails.id
      if (!languageID || !langDetails.code || langDetails.code === 'undefined') return
      const t = text.trim()
      const textSelector = {
        text: t,
        languageID,
        data: {},
        location: '',
        get normalizedText () { return normalizeLookupText(this.text, langDetails.code) },
        get languageCode () { return langDetails.code },
        isEmpty () { return !this.text }
      }
      return this.api.lexis.lookupText(textSelector)
    }
  } catch (err) {
    logger.error(`[alpheios-v3] AppController init/activate failed: ${err && err.message ? err.message : err}`)
    appController = null // mount() will render explicit data-layer unavailable states
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

function normalizeLookupText (text, langCode) {
  if (!text) return text
  if (langCode === 'grc') {
    return text.normalize('NFC').replace(/\u2019$/, '\u1fbd')
  }
  if (langCode === 'lat') {
    return text
      .replace(/[\u00c0\u00c1\u00c2\u00c3\u00c4\u0100\u0102]/g, 'A')
      .replace(/[\u00c8\u00c9\u00ca\u00cb\u0112\u0114]/g, 'E')
      .replace(/[\u00cc\u00cd\u00ce\u00cf\u012a\u012c]/g, 'I')
      .replace(/[\u00d2\u00d3\u00d4\u00df\u00d6\u014c\u014e]/g, 'O')
      .replace(/[\u00d9\u00da\u00db\u00dc\u016a\u016c]/g, 'U')
      .replace(/[\u00c6\u01e2]/g, 'AE')
      .replace(/[\u0152]/g, 'OE')
      .replace(/[\u00e0\u00e1\u00e2\u00e3\u00e4\u0101\u0103]/g, 'a')
      .replace(/[\u00e8\u00e9\u00ea\u00eb\u0113\u0115]/g, 'e')
      .replace(/[\u00ec\u00ed\u00ee\u00ef\u012b\u012d\u0129]/g, 'i')
      .replace(/[\u00f2\u00f3\u00f4\u00f5\u00f6\u014d\u014f]/g, 'o')
      .replace(/[\u00f9\u00fa\u00fb\u00fc\u016b\u016d]/g, 'u')
      .replace(/[\u00e6\u01e3]/g, 'ae')
      .replace(/[\u0153]/g, 'oe')
  }
  return text
}
