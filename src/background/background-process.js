import { Tab, TabScript, AuthData } from './background-models.js'
import Message from '../lib/messaging/message/message.js'
import MessagingService from '../lib/messaging/service.js'
import StateRequest from '../lib/messaging/request/state-request.js'
import LoginResponse from '../lib/messaging/response/login-response.js'
import LogoutResponse from '../lib/messaging/response/logout-response.js'
import UserProfileResponse from '../lib/messaging/response/user-profile-response.js'
import UserDataResponse from '../lib/messaging/response/user-data-response.js'
import UserSessionResponse from '../lib/messaging/response/user-session-response.js'
import EndpointsResponse from '../lib/messaging/response/endpoints-response.js'
import AuthError from '../lib/auth/errors/auth-error.js'
import ContextMenuItem from './context-menu-item.js'
import ContentMenuSeparator from './context-menu-separator.js'
import auth0Env from '../env/env-webext-config.js'
import { isSupportedTabUrl } from '../lib/url-support.js'
import { decideLoginPath } from '../lib/auth/login-path.js'
import Auth0SwClient from '../lib/auth/auth0-sw-client.js'

// Use a logger that outputs timestamps (but loses line numbers)
// import Logger from '../lib/logger'
// console.log = Logger.log

export default class BackgroundProcess {
  constructor (browserFeatures) {
    this.browserFeatures = browserFeatures
    this.settings = BackgroundProcess.defaults

    this.tabs = new Map() // A list of tabs that have content script loaded
    this.tab = undefined // A tab that is currently active in a browser window

    this.messagingService = new MessagingService()
    // MV3: `browser.action` is the only available API (browserAction was removed).
    this.browserAction = browser.action

    this.browserIcons = {
      active: {
        16: 'icons/alpheios_16.png',
        32: 'icons/alpheios_32.png'
      },
      nonactive: {
        16: 'icons/alpheios_black_16.png',
        32: 'icons/alpheios_black_32.png'
      }
    }

    /**
     * An authentication data object.
     *
     * @type {AuthData}
     */
    this.authData = new AuthData()

    this.authResult = null // A result of Auth0 authentication
    this.authClientClass = null
  }

  async getAuthClientClass () {
    // Why we no longer use the `auth0-chrome` npm package:
    //   Its published `dist/auth0chrome.js` is a webpack-4 bundle that
    //   embeds Node polyfills (`setimmediate`, `vm-browserify`) which
    //   reference `document` / `window`. Loading it in an MV3 service
    //   worker throws `ReferenceError: document is not defined` inside an
    //   async chain whose rejection nobody observed, so the login flow
    //   silently stalled at "Please be patient...". `Auth0SwClient` is a
    //   SW-safe drop-in: same constructor, `authenticate(options)`,
    //   `logout(options, interactive)` surface, but only uses
    //   crypto.subtle / fetch / chrome.identity.launchWebAuthFlow.
    return Auth0SwClient
  }

  initialize () {
    this.messagingService.addHandler(Message.types.CONTENT_READY_MESSAGE, this.contentReadyMessageHandler, this)
    this.messagingService.addHandler(Message.types.EMBED_LIB_MESSAGE, this.embedLibMessageHandler, this)
    this.messagingService.addHandler(Message.types.STATE_MESSAGE, this.stateMessageHandler, this)
    this.messagingService.addHandler(Message.types.LOGIN_REQUEST, this.loginRequestHandler, this)
    this.messagingService.addHandler(Message.types.USER_SESSION_REQUEST, this.sessionRequestHandler, this)
    this.messagingService.addHandler(Message.types.LOGOUT_REQUEST, this.logoutRequestHandler, this)
    this.messagingService.addHandler(Message.types.USER_PROFILE_REQUEST, this.userProfileRequestHandler, this)
    this.messagingService.addHandler(Message.types.ENDPOINTS_REQUEST, this.endpointsRequestHandler, this)
    this.messagingService.addHandler(Message.types.USER_DATA_REQUEST, this.userDataRequestHandler, this)
    browser.runtime.onMessage.addListener(this.messagingService.listener.bind(this.messagingService))
    browser.tabs.onActivated.addListener(this.tabActivationListener.bind(this))
    browser.tabs.onDetached.addListener(this.tabDetachedListener.bind(this))
    browser.tabs.onAttached.addListener(this.tabAttachedListener.bind(this))
    browser.tabs.onRemoved.addListener(this.tabRemovalListener.bind(this))
    browser.tabs.onCreated.addListener(this.tabCreatedListener.bind(this))
    browser.webNavigation.onCompleted.addListener(this.navigationCompletedListener.bind(this))
    browser.runtime.onUpdateAvailable.addListener(this.updateAvailableListener.bind(this))
    browser.runtime.onInstalled.addListener(this.handleOnInstalled.bind(this))

    // In an MV3 service worker, `initialize()` may be called multiple times
    // across worker restarts. The previous context menu items persist across
    // worker lifetimes, so we must remove them before creating new ones with
    // the same IDs. Otherwise Chrome logs:
    //   Unchecked runtime.lastError: Cannot create item with duplicate id ...
    browser.contextMenus.removeAll().catch(() => {
      // On first install there may be nothing to remove; suppress.
    })

    this.menuItems = {
      activate: new ContextMenuItem(BackgroundProcess.defaults.activateMenuItemId, BackgroundProcess.defaults.activateMenuItemText),
      deactivate: new ContextMenuItem(BackgroundProcess.defaults.deactivateMenuItemId, BackgroundProcess.defaults.deactivateMenuItemText),
      separatorOne: new ContentMenuSeparator(BackgroundProcess.defaults.separatorOneId),
      info: new ContextMenuItem(BackgroundProcess.defaults.infoMenuItemId, BackgroundProcess.defaults.infoMenuItemText),
      disabled: new ContextMenuItem(BackgroundProcess.defaults.disabledMenuItemId, BackgroundProcess.defaults.disabledMenuItemText)
    }
    this.menuItems.activate.enable() // This one will be enabled by default

    browser.contextMenus.onClicked.addListener(this.menuListener.bind(this))
    this.browserAction.onClicked.addListener(this.browserActionListener.bind(this))
  }

  updateIcon (active, tabId) {
    let params = { path: active ? this.browserIcons.active : this.browserIcons.nonactive } // eslint-disable-line prefer-const
    if (tabId) { params.tabId = tabId }
    this.browserAction.setIcon(params)
  }

  setIconState (tab) {
    const iconState = tab.isActive() && !tab.isEmbedLibActive()
    this.updateIcon(iconState, tab.tabObj.tabId)
  }

  setBadgeState (tab) {
    const badgeState = tab ? tab.isActive() && !tab.isEmbedLibActive() : false
    if (badgeState) {
      this.browserAction.setBadgeText({ text: 'On' })
      this.browserAction.setBadgeBackgroundColor({ color: [252, 20, 20, 255] })
      if (this.browserAction.setBadgeTextColor) {
        this.browserAction.setBadgeTextColor({ color: '#fff' })
      }
    } else {
      this.browserAction.setBadgeText({ text: '' })
    }
  }

  /**
   * handler for the runtime.onInstalled event
   */
  handleOnInstalled (details) {
    // if this is an update versus a fresh install we need to trigger reloads
    // of the previously loaded content scripts. Only tabs with Alpheios loaded
    // will respond to this event. Messaging between the new background script and the
    // old content scripts is broken so we just send a custom event on the body of
    // the page.
    if (details.previousVersion) {
      browser.tabs.query({}).then((tabs) => {
        tabs.forEach((t) => {
          BackgroundProcess.dispatchEvent(t.id, 'Alpheios_Reload')
        })
      })
    }
  }

  /**
   * UI controls were used to activate a webextension
   * @param tabObj
   * @returns {Promise<void>}
   */
  async activateContent (tabObj) {
    if (!this.tabs.has(tabObj.uniqueId)) {
      /*
      This is a first activation of an extension within the tab.
      `createTab` will load a content script into the tab.
      It will take time for content script JS file and other related resources to be loaded
      and content script code to be initialized. That's why we don't want to send
      a state request (`setContentState()`) here.
      Once content script is fully activated, it will send a ContentReadyMessage.
      In this message callback we send a state message to the content script.
      This way it will be guaranteed that the content script will be fully ready
      to enter the state we would like it to be.
       */
      await this.createTab(tabObj)
      const tab = this.tabs.get(tabObj.uniqueId)
      this.setDefaultTabState(tab)
      tab.activate()
      this.updateUI(tab)
      this.notifyPageActive(tab.tabObj.tabId)
    } else {
      /*
      This is an activation on a page where content script is already loaded.
      We can send a state request to it right away.
       */
      const tab = this.tabs.get(tabObj.uniqueId)
      this.setDefaultTabState(tab)
      tab.activate()
      this.updateUI(tab)
      // Require content script to update its state
      this.setContentState(tab)
      this.notifyPageActive(tab.tabObj.tabId)
    }
  }

  async deactivateContent (tabObj) {
    if (this.tabs.has(tabObj.uniqueId)) {
      /*
      This is a deactivation on a page where content script is already loaded.
      We can send a state request to it right away.
       */
      const tab = this.tabs.get(tabObj.uniqueId)
      this.setDefaultTabState(tab)

      tab.deactivate()
      this.updateUI(tab)
      // Require content script to update its state
      this.setContentState(tab)
      this.notifyPageInactive(tab.tabObj.tabId)
    }
  }

  async openPanel (tabObj) {
    if (!this.tabs.has(tabObj.uniqueId)) { await this.createTab(tabObj) }

    const tab = TabScript.create(this.tabs.get(tabObj.uniqueId)).activate().setPanelOpen()
    this.setContentState(tab)
  }

  async openInfoTab (tabObj) {
    if (!this.tabs.has(tabObj.uniqueId)) { await this.createTab(tabObj) }

    const tab = TabScript.create(this.tabs.get(tabObj.uniqueId)).activate().setPanelOpen().changeTab('info')
    this.setContentState(tab)
  }

  static async executeScript (tabId, details = {}) {
    try {
      // MV3: `browser.tabs.executeScript` was removed; only `browser.scripting` is available.
      if (details.file) {
        await browser.scripting.executeScript({
          target: { tabId },
          files: [details.file]
        })
        return
      }
      if (details.code) {
        const matchedEvent = details.code.match(/new Event\('([^']+)'\)/)
        if (matchedEvent && matchedEvent[1]) {
          await BackgroundProcess.dispatchEvent(tabId, matchedEvent[1])
        }
      }
    } catch (e) {
      /*
      Each browser has a set of pages on which `scripting.executeScript()` is not allowed
      to run (e.g. browser-internal pages, Chrome Web Store, restricted host pages).
      It is impossible to check if the script is allowed to run before running it.
      The only way to figure this out is to actually run the script.
      As a result, some scripts will fail to run, and, because of this,
      it can be expected for `executeScript()` to fail from time to time.
      So we will do nothing about it other than quietly catching an error here.
       */
    }
  }

  static async dispatchEvent (tabId, eventName) {
    // MV3: `tabs.executeScript` is gone; use the function-injection form of `scripting`.
    await browser.scripting.executeScript({
      target: { tabId },
      func: (name) => {
        if (document.body) {
          document.body.dispatchEvent(new Event(name))
        }
      },
      args: [eventName]
    })
  }

  loadPolyfill (tabId) {
    if (!this.browserFeatures.browserNamespace) {
      return BackgroundProcess.executeScript(tabId, { file: this.settings.browserPolyfillName })
    } else {
      // `browser` object is supported natively, no need to load a polyfill.
      return Promise.resolve()
    }
  }

  /**
   * Inject the content script into the tab. The compatibility shim is always
   * injected first; then either the legacy v2 entry (`content.js`) or the
   * v3 entry (`content-v3.js`).
   *
   * Decision order:
   *   1. URL param `?alpheios=v3`  → force v3
   *   2. URL param `?alpheios=v2`  → force legacy
   *   3. Storage key `useClassicUI` → classic when true
   *   4. Default                   → v3
   *
   * The two never coexist on the same page so we don't need cross-version
   * teardown logic. See doc/ui/REFACTOR-V3-PLAN.md.
   */
  async loadContentScript (tabId) {
    let useV3 = true // default to v3
    try {
      const tab = await browser.tabs.get(tabId)
      if (tab && tab.url) {
        const u = new URL(tab.url)
        const versionParam = u.searchParams.get('alpheios')
        if (versionParam === 'v2') {
          useV3 = false
        } else if (versionParam === 'v3') {
          useV3 = true
        } else {
          // No URL override — check the persistent setting.
          try {
            const stored = await browser.storage.local.get('useClassicUI')
            if (stored && stored.useClassicUI === true) {
              useV3 = false
            }
          } catch (_) { /* storage unavailable → stay with v3 */ }
        }
      }
    } catch (e) {
      // Some tab URLs (chrome://, file:// without permission) throw;
      // fall back to v3 silently.
    }
    const entryFile = useV3
      ? this.settings.contentV3ScriptFileName
      : this.settings.contentScriptFileName
    return Promise.all([
      BackgroundProcess.executeScript(tabId, { file: this.settings.compatibilityScriptFileName }),
      BackgroundProcess.executeScript(tabId, { file: entryFile })
    ])
  }

  loadContentCSS (tabId, fileName) {
    // MV3: `browser.tabs.insertCSS` was removed; use `browser.scripting.insertCSS`.
    return browser.scripting.insertCSS({
      target: { tabId },
      files: [fileName]
    })
  }

  /**
   * Creates a TabScript object and loads content script(s) into a corresponding browser tab
   * @param {object} tabObj - An object that represents a tab
   * @return {Promise.<TabScript>} A Promise that is resolved into a newly created TabScript object
   */
  async createTab (tabObj) {
    let newTab = new TabScript(tabObj) // eslint-disable-line prefer-const
    newTab.tab = TabScript.props.tab.values.INFO // Set active tab to `info` by default
    this.tabs.set(tabObj.uniqueId, newTab)

    try {
      await this.loadContentData(newTab)
    } catch (error) {
      console.error(`Cannot load content script for a tab with an ID of ${tabObj.uniqueId.toString()}`, error)
    }
    return newTab
  }

  /**
   * Changes state of a tab by sending it a state update request. Content script of a tab returns
   * its actual state after request it fulfilled. A warning will be produced if an actual
   * state does not match desired one.
   * @param {TabScript} tab - A TabScript object that represents a tab and it desired state
   */
  setContentState (tab) {
    this.messagingService.sendRequestToTab(new StateRequest(tab), 10000, tab.tabObj.tabId).then(
      message => {
        const contentState = TabScript.readObject(message.body)
        if (contentState.isDeactivated() && !contentState.isEmbedLibActive()) {
          /*
            If this is a user initiated deactivation (not the one caused by the presence
            of an embedded library), reset to default panel and tab status then.
             */
          this.setDefaultTabState(tab)
        } else {
          // This is an activation or forced deactivation (due to embedded library's presence)
          tab.update(contentState)
        }
        this.updateUI(tab)
      },
      error => {
        console.log(`No status confirmation from tab ${tab.tabObj.tabId}, windows ${tab.tabObj.windowId} on state request: ${error.message}`)
      }
    )
  }

  /**
   * Loads scripts and styles to a page that does not have them loaded yet.
   * @param tabScript
   * @return {Promise} Will be resolved when all scripts are loaded successfully.
   */
  loadContentData (tabScript) {
    const polyfillScript = this.loadPolyfill(tabScript.tabObj.tabId)
    const contentScript = this.loadContentScript(tabScript.tabObj.tabId)
    let contentCSS = [] // eslint-disable-line prefer-const
    for (const fileName of this.settings.contentCSSFileNames) { // eslint-disable-line no-unused-vars
      contentCSS.push(this.loadContentCSS(tabScript.tabObj.tabId, fileName))
    }
    return Promise.all([polyfillScript, contentScript, ...contentCSS])
  }

  /**
   * With this message content script informs us that it is ready and can execute background commands
   * @param message
   * @param sender
   */
  contentReadyMessageHandler (message, sender) {
    const contentState = TabScript.readObject(message.body)
    contentState.updateTabObject(sender.tab.id, sender.tab.windowId)
    const tab = this.tabs.get(contentState.tabID)
    // Update an embedded lib status
    tab.embedLibStatus = contentState.embedLibStatus

    if (!tab.isEmbedLibActive()) {
      // Send an activation state message to the content script
      this.setContentState(tab)
    }
    this.updateUI(tab)
  }

  embedLibMessageHandler (message, sender) {
    const contentState = TabScript.readObject(message.body)
    contentState.updateTabObject(sender.tab.id, sender.tab.windowId)
    const tab = this.tabs.get(contentState.tabID)
    // Update an embedded lib status
    tab.embedLibStatus = contentState.embedLibStatus
    this.updateUI(tab)
  }

  /**
   * Handles a state message from a content script
   * (content script notifies background of a content script state change)
   * @param message
   * @param sender
   */
  stateMessageHandler (message, sender) {
    const contentState = TabScript.readObject(message.body)
    contentState.updateTabObject(sender.tab.id, sender.tab.windowId)

    if (!contentState.isPending()) {
      /*
      If we receive a message with the PENDING state, this means that controller is not fully
      initialized yet. Because of this, it has no valid state at the moment and most of its state
      information presents no value and should be ignored. Except for the one piece: whether an
      embedded library is active on a page. Due to presence of an embedded library attribute
      content script can discover that early, and it's useful for us to pick up this info
      in order to update our UI.
       */
      if (!contentState.isEmbedLibActive()) {
        const tab = this.tabs.get(contentState.tabID)
        tab.update(contentState)
        this.updateUI(tab)
      }
    } else {
      const tab = this.tabs.get(contentState.tabID)
      tab.embedLibStatus = contentState.embedLibStatus
      this.updateUI(tab)
    }
  }

  /**
   * Authenticates user with Auth0.
   * If succeeds, sends a response to content with SUCCESS response code.
   * If fails, sends a response with ERROR code and Error-like object in the response body.
   * @param {RequestMessage} request - A request object received from a content script.
   * @param {Object} sender - A sender object
   */
  async loginRequestHandler (request, sender) {
    // scope
    //  - openid if you want an id_token returned
    //  - offline_access if you want a refresh_token returned
    //  - profile if you want an additional claims like name, nickname, picture and updated_at.
    // device
    //  - required if requesting the offline_access scope.

    const options = {
      scope: 'openid profile offline_access',
      device: 'chrome-extension',
      prompt: 'select_account'
    }
    // `audience` identifies the Auth0 API this token is for. It only makes
    // sense when the Auth0 tenant has a matching API registered. When
    // testing against a personal Auth0 tenant (see
    // doc/testing/P1-AUTH-SMOKE-STEPS.md appendix A), leave AUDIENCE empty
    // in your env config to skip it entirely.
    if (auth0Env.AUDIENCE) {
      options.audience = auth0Env.AUDIENCE
    }

    // The path decision lives in `src/lib/auth/login-path.js` so the
    // priority rule (real Client ID > TEST_ID fallback > missing config)
    // can be unit-tested without booting the whole BackgroundProcess.
    const path = decideLoginPath(auth0Env)

    if (path === 'real') {
      // Real Auth0 path. A leftover TEST_ID from a previous test-mode
      // build (e.g. 'mock-token') used to short-circuit this branch and
      // silently log the user in as the mock user; that bug is what
      // `decideLoginPath` exists to prevent regressing.
      const Auth0ChromeClass = await this.getAuthClientClass()
      new Auth0ChromeClass(auth0Env.AUTH0_DOMAIN, auth0Env.AUTH0_CLIENT_ID)
        .authenticate(options)
        .then(authResult => {
          /*
          authResult contains the following fields:
          access_token - An access token string;
          expires_in - An expiration time of a token, in seconds;
          id_token - An id token string;
          scope - A scope string containing scope names separated by spaces (e.g. "openid profile")
          token_type - A token type string (e.g. "Bearer")
           */
          this.authResult = authResult
          this.authData.setAuthStatus(true).setSessionDuration(this.authResult.expires_in * 1000)
          this.messagingService.sendResponseToTab(LoginResponse.Success(request, this.authData.serializable()), sender.tab.id)
            .catch(error => console.error(`Unable to send a response to a login request: ${error.message}`))
        }).catch(err => {
          console.error(`Authentication error: ${err}`)
          this.messagingService.sendResponseToTab(LoginResponse.Error(request, new AuthError(err.message)), sender.tab.id)
            .catch(error => console.error(`Unable to send an error response to a login request: ${error.message}`))
        })
    } else if (path === 'mock') {
      // Test/dev fallback — only kicks in when no real Client ID is configured.
      this.authResult = {
        access_token: auth0Env.TEST_ID,
        is_test_user: true
      }
      this.authData.setAuthStatus(true).setSessionDuration(3600000 /* One hour */)
      this.messagingService.sendResponseToTab(LoginResponse.Success(request, this.authData.serializable()), sender.tab.id)
        .catch(error => console.error(`Unable to send a response to a login request: ${error.message}`))
    } else {
      this.messagingService.sendResponseToTab(
        LoginResponse.Error(request, new AuthError('AUTH0_CLIENT_ID is not configured. Run: npm run set-auth0 -- <AUTH0_CLIENT_ID>')),
        sender.tab.id
      ).catch(error => console.error(`Unable to send an error response to a login request: ${error.message}`))
    }
  }

  sessionRequestHandler (request, sender) {
    if (!this.authResult) {
      this.messagingService.sendResponseToTab(
        UserSessionResponse.Error(request, new AuthError('Not Authenticated')),
        sender.tab.id
      ).catch(error => console.error(`Unable to send an error response to a user session request: ${error.message}`))
      return
    }

    if (this.authResult.is_test_user) {
      this.authData.userId = 'dev|mockUserId'
      this.authData.userName = 'Alpheios Test User'
      this.authData.userNickname = 'testuser'
      this.messagingService.sendResponseToTab(UserSessionResponse.Success(request, this.authData.serializable()), sender.tab.id)
        .catch(error => console.error(`Unable to send a response to a user session request: ${error.message}`))
      return
    }

    if (this.authResult && !this.authResult.is_test_user) {
      fetch(`https://${auth0Env.AUTH0_DOMAIN}/userinfo`, {
        headers: {
          Authorization: `Bearer ${this.authResult.access_token}`
        }
      }).then(resp => resp.json()).then((profile) => {
        // TODO: Eliminate duplicated code pieces in mulitple places
        this.authData.userId = profile.sub
        this.authData.userName = profile.name
        this.authData.userNickname = profile.nickname
        this.messagingService.sendResponseToTab(UserSessionResponse.Success(request, this.authData.serializable()), sender.tab.id)
          .catch(error => console.error(`Unable to send a response to a user profile request: ${error.message}`))
      }).catch(err => {
        // TODO this is where we could use a refresh_token
        console.log(`Invalid session: ${err.message}`)
        this.messagingService.sendResponseToTab(UserSessionResponse.Error(request, new AuthError(err.message)), sender.tab.id)
          .catch(error => console.error(`Unable to send an error response to a user profile request: ${error.message}`))
      })
    }
  }

  /**
   * Retrieves user profile data from Auth0.
   * If succeeds, sends a response to content with SUCCESS response code and user profile data in the response body.
   * If fails, sends a response with ERROR code and Error-like object in the response body.
   * @param {RequestMessage} request - A request object received from a content script.
   * @param {Object} sender - A sender object
   */
  userProfileRequestHandler (request, sender) {
    if (!this.authResult) {
      console.error('Get user info: not authenticated')
    }
    if (this.authResult.is_test_user) {
      this.authData.userId = 'dev|mockUserId'
      this.authData.userName = 'Alpheios Test User'
      this.authData.userNickname = 'testuser'
      this.messagingService.sendResponseToTab(UserProfileResponse.Success(request, this.authData.serializable()), sender.tab.id)
        .catch(error => console.error(`Unable to send a response to a user profile request: ${error.message}`))
    } else {
      fetch(`https://${auth0Env.AUTH0_DOMAIN}/userinfo`, {
        headers: {
          Authorization: `Bearer ${this.authResult.access_token}`
        }
      })
        .then(resp => resp.json()).then((profile) => {
          /*
          Auth0 usually returns the folloiwng profile data:
          name - A user name
          nickname - A user nickname (to be displayed when referencing the user)
          picture - A URL to the user's avatar image
          sub - An Auth0 user ID as a string
          updated_at - last date of a profile update (e.g. "2019-09-30T16:34:11.051Z")
           */
          this.authData.userId = profile.sub
          this.authData.userName = profile.name
          this.authData.userNickname = profile.nickname
          this.messagingService.sendResponseToTab(UserProfileResponse.Success(request, this.authData.serializable()), sender.tab.id)
            .catch(error => console.error(`Unable to send a response to a user profile request: ${error.message}`))
        })
        .catch(err => {
          console.log(`User data cannot be retrieved: ${err.message}`)
          this.messagingService.sendResponseToTab(UserProfileResponse.Error(request, new AuthError(err.message)), sender.tab.id)
            .catch(error => console.error(`Unable to send an error response to a user profile request: ${error.message}`))
        })
    }
  }

  /**
   * Retrieves service endpoint config from environment
   * If succeeds, sends a response to content with SUCCESS response code and user profile data in the response body.
   * If fails, sends a response with ERROR code and Error-like object in the response body.
   * @param {RequestMessage} request - A request object received from a content script.
   * @param {Object} sender - A sender object
   */
  endpointsRequestHandler (request, sender) {
    this.messagingService.sendResponseToTab(EndpointsResponse.Success(request, auth0Env.ENDPOINTS ? auth0Env.ENDPOINTS : { wordlist: auth0Env.ENDPOINT }), sender.tab.id)
      .catch(error => console.error(`Unable to send a response to a user profile request: ${error.message}`))
  }

  /**
   * Retrieves user data from a third-party service authorized via Auth0.
   * If succeeds, sends a response to content with SUCCESS response code and user data in the response body.
   * If fails, sends a response with ERROR code and Error-like object in the response body.
   * @param {RequestMessage} request - A request object received from a content script.
   * @param {Object} sender - A sender object
   */
  userDataRequestHandler (request, sender) {
    if (!this.authResult) {
      console.error('Get user info: not authenticated')
      this.messagingService.sendResponseToTab(UserDataResponse.Error(request, new AuthError('Not Authenticated')), sender.tab.id).catch(
        error => console.error(`Unable to send a response to a user data request: ${error.message}`)
      )
    } else {
      this.messagingService.sendResponseToTab(UserDataResponse.Success(request, this.authResult.access_token), sender.tab.id).catch(
        error => console.error(`Unable to send a response to a user data request: ${error.message}`)
      )
    }
  }

  /**
   * Logs the user out
   * If succeeds, sends a response to content with SUCCESS response code and user data in the response body.
   * If fails, sends a response with ERROR code and Error-like object in the response body.
   * @param {RequestMessage} request - A request object received from a content script.
   * @param {Object} sender - A sender object
   */
  async logoutRequestHandler (request, sender) {
    if (!this.authResult || this.authResult.is_test_user) {
      this.authResult = null
      this.authData = new AuthData()
      this.messagingService.sendResponseToTab(LogoutResponse.Success(request), sender.tab.id)
        .catch(error => console.error(`Unable to send a response to a logout request: ${error.message}`))
      return
    }

    const Auth0ChromeClass = await this.getAuthClientClass()
    new Auth0ChromeClass(auth0Env.AUTH0_DOMAIN, auth0Env.AUTH0_CLIENT_ID)
      .logout()
      .then(() => {
        this.authResult = null
        this.messagingService.sendResponseToTab(LogoutResponse.Success(request), sender.tab.id)
          .catch(error => console.error(`Unable to send a response to a logout request: ${error.message}`))
      })
      .catch(err => {
        this.messagingService.sendResponseToTab(LogoutResponse.Error(request, new AuthError(err.message)), sender.tab.id)
          .catch(error => console.error(`Unable to send an error response to a logout request: ${error.message}`))
      })
  }

  tabActivationListener (info) {
    const tmpUniqueTabId = Tab.createUniqueId(info.tabId, info.windowId)
    this.tab = tmpUniqueTabId
    const tab = this.tabs.has(tmpUniqueTabId) ? this.tabs.get(tmpUniqueTabId) : undefined

    this.setMenuForTab(tab)
    this.setBadgeState(tab)
  }

  tabDetachedListener (tabId, detachInfo) {
    const tmpUniqueTabObj = Tab.createUniqueId(tabId, detachInfo.oldWindowId)
    if (this.tabs.has(tmpUniqueTabObj)) {
      this.tabs.get(tmpUniqueTabObj).deattach()
    }
  }

  tabAttachedListener (tabId, attachInfo) {
    let keyForChange = null
    let valueForChange = null
    this.tabs.forEach((value, key) => {
      if (value.isDeattached) {
        keyForChange = key
        valueForChange = value
      }
    })

    if (!keyForChange) {
      this.tabs.forEach((value, key) => {
        if (value.tabObj.tabId === tabId) {
          keyForChange = key
          valueForChange = value
        }
      })
    }

    if (keyForChange) {
      this.tabs.delete(keyForChange)
      const newKey = Tab.createUniqueId(tabId, attachInfo.newWindowId)

      this.tabs.set(newKey, valueForChange.updateTabObject(tabId, attachInfo.newWindowId))
      this.setMenuForTab(valueForChange)
      this.setBadgeState(valueForChange)
    }
  }

  async tabCreatedListener (tab) {
    this.setBadgeState()
  }

  /**
   * Whether a URL is an Allen & Greenough grammar page that the grammar reader
   * should modernize. Kept narrow (matches the manifest content_script and the
   * reader's own path gate); extend the path set here to cover other grammars
   * (e.g. `/bennett/`, `/smyth/`) once the reader handles their markup.
   * @param {string} url
   * @return {boolean}
   */
  static isGrammarReaderUrl (url) {
    if (!url) return false
    try {
      const u = new URL(url)
      return u.hostname === 'grammars.alpheios.net' && u.pathname.startsWith('/allen-greenough/')
    } catch (e) {
      return false
    }
  }

  /**
   * Inject the grammar reader CSS + JS into a single frame. Used for the
   * embedded cross-origin grammar iframe, which the declarative content script
   * does not reliably reach. The reader script is idempotent, so this is safe
   * even when the declarative injection also fired in the same frame.
   * @param {number} tabId
   * @param {number} frameId
   */
  async injectGrammarReader (tabId, frameId) {
    const target = { tabId, frameIds: [frameId] }
    try {
      await browser.scripting.insertCSS({ target, files: [this.settings.grammarReaderCssFileName] })
      await browser.scripting.executeScript({ target, files: [this.settings.grammarReaderScriptFileName] })
    } catch (e) {
      // Restricted frame, navigation race, or the frame is already gone.
      // Declarative injection may still cover top-level visits; ignore quietly.
    }
  }

  /**
   * Called when a page is loaded.
   * Use this to listen on webNavigation.onCompleted rather than tabs.onUpdated
   * because you can't tell from the tabs.onUpdated event whether it's the main
   * browser window or an iframe that has been updated.
   * the webNavigation.onCompleted event is the equivalent of domLoaded and you
   * can distinguish iFrames from the main window in the details
   * @param details
   * @return {Promise.<void>}
   */
  async navigationCompletedListener (details) {
    // on Firefox, a click the download blob url for downloading
    // the user wordlist causes Firefox to issue a webNavigationCompleted
    // event. so we should ignore events whose urls are blob: urls
    if (details.url && details.url.match(/^blob:/)) {
      return
    }

    // Grammar reader: modernize the Allen & Greenough grammar pages. This runs
    // for ANY frame (top-level tab OR the cross-origin iframe embedded in the
    // v3 Resources panel) independently of Alpheios tab tracking, because the
    // declarative content script does not reliably reach that nested iframe.
    if (BackgroundProcess.isGrammarReaderUrl(details.url)) {
      this.injectGrammarReader(details.tabId, details.frameId)
    }

    const finalWindowId = this.defineCurrentWindowIdForActivation(details)
    const tmpTabUniqueId = Tab.createUniqueId(details.tabId, finalWindowId)

    if (this.tabs.has(tmpTabUniqueId)) {
      const tab = this.tabs.get(tmpTabUniqueId)
      // make sure this is a tab we know about
      if (details.frameId === 0) {
        // AND that it's not an iframe event
        try {
          await this.loadContentData(tab)
          this.setContentState(tab)
          this.checkEmbeddedContent(details.tabId)
          this.notifyPageLoad(details.tabId)
          if (tab.isActive()) {
            this.notifyPageActive(details.tabId)
          }
          this.setBadgeState(tab)
        } catch (error) {
          console.error(`Cannot load content script for a tab with an ID of tabId = ${details.tabId}, windowId = ${details.windowId}`)
        }
      // but if it is an iFrame event
      // firefox resets the browserAction icon and title when the user navigates to a new page
      // even when the navigation is in a frame so we need to be sure it's updated
      } else if (tab.isActive()) {
        this.setIconState(tab)
        this.setBadgeState(tab)
        this.updateBrowserActionForTab(this.tabs.get(tmpTabUniqueId))
      }
    }
  }

  defineCurrentWindowIdForActivation (details) {
    // try to get windowId from arguments - from details
    let finalWindowId = details.windowId

    // try to get windowId from the tab with the same tabId
    if (!finalWindowId && this.tabs.size > 0) {
      finalWindowId = Array.from(this.tabs.values()).filter(el => el.tabObj.tabId === details.tabId)
      finalWindowId = finalWindowId.length > 0 ? finalWindowId[0].windowId : null
    }

    // try to get windowId from the first tab from the saved tab array
    if (!finalWindowId && this.tabs.size > 0) {
      finalWindowId = this.tabs.values().next().value.tabObj.windowId
    }

    // if all tries fail get 0
    return finalWindowId || 0
  }

  checkEmbeddedContent (tabId) {
    BackgroundProcess.dispatchEvent(tabId, 'Alpheios_Embedded_Check')
  }

  notifyPageLoad (tabId) {
    BackgroundProcess.dispatchEvent(tabId, 'Alpheios_Page_Load')
  }

  /**
   * Dispatches an Alpheios_Active event to the page
   * @param {String} tabId  the id of the tab to notify
   */
  notifyPageActive (tabId) {
    BackgroundProcess.dispatchEvent(tabId, 'Alpheios_Active')
  }

  /**
   * Dispatches an Alpheios_Inactive event to the page
   * @param {String} tabId  the id of the tab to notify
   */
  notifyPageInactive (tabId) {
    BackgroundProcess.dispatchEvent(tabId, 'Alpheios_Inactive')
  }

  /**
   * Listen to extension updates. Need to define to prevent the browser
   * from applying updates and reloading while the extension is activated
   */
  updateAvailableListener (details) {
    console.log(`Update pending to version ${details.version} pending.`)
  }

  static isSupportedTabUrl (url = '') {
    // Delegate to the shared helper so tests can verify the rule without
    // importing the whole BackgroundProcess module.
    return isSupportedTabUrl(url)
  }

  tabRemovalListener (tabID, removeInfo) {
    const tmpTabUniqueId = Tab.createUniqueId(tabID, removeInfo.windowId)
    if (this.tabs.has(tmpTabUniqueId)) {
      this.tabs.delete(tmpTabUniqueId)
    }
  }

  async menuListener (info, tab) {
    if (info.menuItemId === this.settings.activateMenuItemId) {
      this.activateContent(new Tab(tab.id, tab.windowId))
    } else if (info.menuItemId === this.settings.deactivateMenuItemId) {
      this.deactivateContent(new Tab(tab.id, tab.windowId))
    } else if (info.menuItemId === this.settings.infoMenuItemId) {
      this.openInfoTab(new Tab(tab.id, tab.windowId))
    }
  }

  async browserActionListener (tab) {
    const tmpTabUniqueId = Tab.createUniqueId(tab.id, tab.windowId)

    if (this.tabs.has(tmpTabUniqueId) && this.tabs.get(tmpTabUniqueId).isActive()) {
      this.deactivateContent(new Tab(tab.id, tab.windowId))
    } else {
      this.activateContent(new Tab(tab.id, tab.windowId))
    }
  }

  setDefaultTabState (tab) {
    tab.setPanelDefault()
    tab.setTabDefault()
    return this
  }

  updateUI (tab) {
    // Menu and icon states should reflect a status of a content script
    this.updateBrowserActionForTab(tab)
    this.setMenuForTab(tab)
    this.setIconState(tab)
    this.setBadgeState(tab)
  }

  updateBrowserActionForTab (tab) {
    if (tab && tab.hasOwnProperty('status')) { // eslint-disable-line no-prototype-builtins
      if (tab.isEmbedLibActive() || tab.isDisabled()) {
        this.browserAction.setTitle({ title: BackgroundProcess.defaults.disabledBrowserActionTitle, tabId: tab.tabObj.tabId })
      } else if (tab.isActive()) {
        this.browserAction.setTitle({ title: BackgroundProcess.defaults.deactivateBrowserActionTitle, tabId: tab.tabObj.tabId })
      } else if (tab.isDeactivated()) {
        this.browserAction.setTitle({ title: BackgroundProcess.defaults.activateBrowserActionTitle, tabId: tab.tabObj.tabId })
      }
    }
  }

  setMenuForTab (tab) {
    //
    // Deactivate all previously activated menu items to keep an order intact
    this.menuItems.activate.disable()
    this.menuItems.deactivate.disable()
    this.menuItems.separatorOne.disable()
    this.menuItems.info.disable()
    this.menuItems.disabled.disable()

    if (tab) {
      const tabId = tab.tabObj.tabId
      // Menu state should reflect a status of a content script
      if (tab.hasOwnProperty('status')) { // eslint-disable-line no-prototype-builtins
        if (tab.isEmbedLibActive() || tab.isDisabled()) {
          this.menuItems.activate.disable()
          this.menuItems.deactivate.disable()
          this.menuItems.disabled.enable()
          this.menuItems.info.disable()
          this.updateIcon(false, tabId)
        } else if (tab.isActive()) {
          this.menuItems.activate.disable()
          this.menuItems.deactivate.enable()

          if (tab.isPanelOpen()) {
            this.menuItems.info.disable()
          } else {
            this.menuItems.info.enable()
          }

          this.updateIcon(true, tabId)
        } else if (tab.isDeactivated()) {
          this.menuItems.deactivate.disable()
          this.menuItems.activate.enable()
          this.menuItems.info.disable()

          this.updateIcon(false, tabId)
        }
      }
      this.menuItems.separatorOne.enable()
    } else {
      // If tab is not provided will set menu do an initial state
      this.menuItems.activate.enable()
      this.menuItems.deactivate.disable()
      this.menuItems.separatorOne.enable()
      this.menuItems.info.disable()
    }
  }
}

BackgroundProcess.defaults = {
  activateBrowserActionTitle: 'Activate Alpheios',
  deactivateBrowserActionTitle: 'Deactivate Alpheios',
  disabledBrowserActionTitle: 'Alpheios is disabled on this page',
  activateMenuItemId: 'activate-alpheios-content',
  activateMenuItemText: 'Activate Alpheios',
  deactivateMenuItemId: 'deactivate-alpheios-content',
  deactivateMenuItemText: 'Deactivate Alpheios',
  disabledMenuItemId: 'disabled-alpheios-content',
  disabledMenuItemText: 'Alpheios is disabled on this page',
  openPanelMenuItemId: 'open-alpheios-panel',
  openPanelMenuItemText: 'Open Alpheios Panel',
  infoMenuItemId: 'show-alpheios-panel-info',
  infoMenuItemText: 'Open Info Panel',
  separatorOneId: 'separator-one',
  sendExperiencesMenuItemId: 'send-experiences',
  sendExperiencesMenuItemText: 'Send experiences',
  contentCSSFileNames: ['style/style-components.css'],
  compatibilityScriptFileName: 'compatibility-fixes.js',
  contentScriptFileName: 'content.js',
  // v3 (Scholarly Glass) parallel content script. Gated by the
  // `?alpheios=v3` URL query in `loadContentScript`. See
  // doc/ui/REFACTOR-V3-PLAN.md.
  contentV3ScriptFileName: 'content-v3.js',
  // Grammar reader (Allen & Greenough modernization). Injected programmatically
  // into the grammar frame — including the cross-origin iframe embedded in the
  // v3 Resources panel — from `navigationCompletedListener`. The manifest also
  // declares it as a content script for top-level direct visits; the script is
  // idempotent so double-delivery into one frame is a no-op.
  grammarReaderScriptFileName: 'grammar-reader.js',
  grammarReaderCssFileName: 'styles/grammar-reader.css',
  browserPolyfillName: 'support/webextension-polyfill/browser-polyfill.min.js',
  experienceStorageCheckInterval: 10000,
  experienceStorageThreshold: 3,
  contentScriptLoaded: false
}
