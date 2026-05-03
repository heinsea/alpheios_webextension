/* eslint-env jest */
import { Tab, TabScript, AuthData } from '../src/background/background-models.js'

describe('background-models', () => {
  describe('Tab', () => {
    test('createUniqueId returns a stable Symbol for the same (tabId, windowId)', () => {
      const a = Tab.createUniqueId(7, 12)
      const b = Tab.createUniqueId(7, 12)
      expect(typeof a).toBe('symbol')
      expect(a).toBe(b)
    })

    test('different (tabId, windowId) pairs produce distinct symbols', () => {
      const a = Tab.createUniqueId(1, 1)
      const b = Tab.createUniqueId(1, 2)
      const c = Tab.createUniqueId(2, 1)
      expect(a).not.toBe(b)
      expect(a).not.toBe(c)
    })

    test('uniqueId getter matches createUniqueId', () => {
      const tab = new Tab(3, 9)
      expect(tab.uniqueId).toBe(Tab.createUniqueId(3, 9))
    })

    test('attach/deattach lifecycle flips status correctly', () => {
      const tab = new Tab(1, 1)
      expect(tab.status).toBe('attached')
      expect(tab.isDeattached).toBe(false)

      tab.deattach()
      expect(tab.isDeattached).toBe(true)

      tab.attach(42)
      expect(tab.windowId).toBe(42)
      expect(tab.isDeattached).toBe(false)
    })

    test('clone produces an independent Tab with same coordinates', () => {
      const tab = new Tab(5, 6)
      tab.deattach()
      const copy = tab.clone()
      expect(copy).not.toBe(tab)
      expect(copy.tabId).toBe(5)
      expect(copy.windowId).toBe(6)
      // clone() resets to a fresh attached state — verify we did not leak the
      // detached marker into the copy.
      expect(copy.isDeattached).toBe(false)
    })
  })

  describe('TabScript', () => {
    test('activate / deactivate set the right script status', () => {
      const tab = new Tab(1, 1)
      const script = new TabScript(tab)
      script.activate()
      expect(script.isActive()).toBe(true)
      expect(script.isDeactivated()).toBe(false)

      script.deactivate()
      expect(script.isActive()).toBe(false)
      expect(script.isDeactivated()).toBe(true)
    })

    test('embed-lib status reflects setEmbedLibStatus', () => {
      const script = new TabScript(new Tab(1, 1))
      script.setEmbedLibStatus(true)
      expect(script.isEmbedLibActive()).toBe(true)
      script.setEmbedLibStatus(false)
      expect(script.isEmbedLibActive()).toBe(false)
    })

    test('panel default vs open distinguishes states', () => {
      const script = new TabScript(new Tab(1, 1))
      script.setPanelDefault()
      expect(script.isPanelOpen()).toBe(false)
      script.setPanelOpen()
      expect(script.isPanelOpen()).toBe(true)
    })

    test('serializable + readObject is a round-trip for Symbol fields', () => {
      const tab = new Tab(11, 22)
      const original = new TabScript(tab)
      original.activate()
      original.setPanelOpen()
      original.setEmbedLibStatus(true)
      original.changeTab('info')
      original.uiActive = true

      const blob = TabScript.serializable(original)
      // After serialization the Symbol fields must be plain strings so the
      // payload can survive `runtime.sendMessage` (structured-clone-only).
      expect(typeof blob.tabID).toBe('string')
      expect(typeof blob.status).toBe('string')
      expect(typeof blob.embedLibStatus).toBe('string')
      expect(typeof blob.panelStatus).toBe('string')
      expect(blob.tab).toBe('info')
      expect(blob.uiActive).toBe(true)

      const restored = TabScript.readObject({
        ...blob,
        tabObj: { tabId: 11, windowId: 22 }
      })
      expect(restored.isActive()).toBe(true)
      expect(restored.isPanelOpen()).toBe(true)
      expect(restored.isEmbedLibActive()).toBe(true)
      expect(restored.tab).toBe('info')
      expect(restored.uiActive).toBe(true)
      expect(restored.tabObj.tabId).toBe(11)
      expect(restored.tabObj.windowId).toBe(22)
    })

    test('hasSameID compares the underlying tab id keys', () => {
      const a = new TabScript(new Tab(1, 1))
      const b = new TabScript(new Tab(1, 1))
      const c = new TabScript(new Tab(2, 1))
      expect(a.hasSameID(b.tabID)).toBe(true)
      expect(a.hasSameID(c.tabID)).toBe(false)
    })
  })

  describe('AuthData', () => {
    test('default state is unauthenticated', () => {
      const auth = new AuthData()
      expect(auth.isAuthenticated).toBe(false)
      expect(auth.accessToken).toBe('')
      expect(auth.userId).toBe('')
      expect(auth.expirationDateTime instanceof Date).toBe(true)
    })

    test('setAuthStatus and setSessionDuration are chainable', () => {
      const auth = new AuthData()
      const before = Date.now()
      const result = auth.setAuthStatus(true).setSessionDuration(60_000)
      expect(result).toBe(auth)
      expect(auth.isAuthenticated).toBe(true)
      expect(auth.expirationDateTime.getTime()).toBeGreaterThanOrEqual(before + 60_000 - 50)
    })

    test('serializable converts expirationDateTime to ISO string', () => {
      const auth = new AuthData().setAuthStatus(true).setSessionDuration(1000)
      auth.userId = 'auth0|abc'
      auth.userName = 'Example'
      const blob = auth.serializable()
      expect(typeof blob.expirationDateTime).toBe('string')
      expect(() => new Date(blob.expirationDateTime).toISOString()).not.toThrow()
      expect(blob.userId).toBe('auth0|abc')
      expect(blob.userName).toBe('Example')
    })
  })
})
