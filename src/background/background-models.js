export class Tab {
  constructor (tabId, windowId) {
    this.tabId = tabId
    this.windowId = windowId
    this.status = 'attached'
  }

  get uniqueId () {
    return Tab.createUniqueId(this.tabId, this.windowId)
  }

  get isDeattached () {
    return this.status === 'deattached'
  }

  deattach () {
    this.status = 'deattached'
  }

  attach (newWinId) {
    this.windowId = newWinId
    this.status = 'attached'
  }

  clone () {
    return new Tab(this.tabId, this.windowId)
  }

  static createUniqueId (tabId, windowId) {
    return Symbol.for(`Alpheios_tabId:${tabId.toString()},windowId:${windowId.toString()}`)
  }
}

export class TabScript {
  constructor (tabObj) {
    this.tabID = tabObj ? tabObj.uniqueId : undefined
    this.tabObj = tabObj
    this.status = undefined
    this.panelStatus = undefined
    this.tab = undefined
    this.embedLibStatus = undefined
    this.uiActive = false
  }

  static get props () {
    return {
      tab: {
        values: {
          INFO: 'info',
          DEFAULT: 'default'
        }
      }
    }
  }

  static get statuses () {
    return {
      script: {
        PENDING: Symbol.for('Alpheios_Status_Pending'),
        ACTIVE: Symbol.for('Alpheios_Status_Active'),
        DEACTIVATED: Symbol.for('Alpheios_Status_Deactivated'),
        DISABLED: Symbol.for('Alpheios_Status_Disabled')
      },
      embedLib: {
        ACTIVE: Symbol.for('Embedded_Lib_Status_Active'),
        INACTIVE: Symbol.for('Embedded_Lib_Status_Inactive')
      },
      panel: {
        OPEN: Symbol.for('Alpheios_Status_PanelOpen'),
        CLOSED: Symbol.for('Alpheios_Status_PanelClosed'),
        DEFAULT: Symbol.for('Alpheios_Status_PanelDefault')
      }
    }
  }

  static create (source) {
    const copy = new TabScript()
    Object.assign(copy, source)
    return copy
  }

  updateTabObject (tabId, windowId) {
    this.tabObj = new Tab(tabId, windowId)
    this.tabID = this.tabObj.uniqueId
    return this
  }

  setEmbedLibStatus (isActive) {
    this.embedLibStatus = isActive ? TabScript.statuses.embedLib.ACTIVE : TabScript.statuses.embedLib.INACTIVE
    return this
  }

  setPanelDefault () {
    this.panelStatus = TabScript.statuses.panel.DEFAULT
    return this
  }

  setTabDefault () {
    this.tab = TabScript.props.tab.values.DEFAULT
    return this
  }

  activate () {
    this.status = TabScript.statuses.script.ACTIVE
    return this
  }

  deactivate () {
    this.status = TabScript.statuses.script.DEACTIVATED
    return this
  }

  setPanelOpen () {
    this.panelStatus = TabScript.statuses.panel.OPEN
    return this
  }

  changeTab (tabName) {
    this.tab = tabName
    return this
  }

  update (source) {
    for (const key of Object.keys(source)) {
      if (source[key] !== undefined) {
        this[key] = source[key]
      }
    }
    return this
  }

  isActive () {
    return this.status === TabScript.statuses.script.ACTIVE
  }

  isDeactivated () {
    return this.status === TabScript.statuses.script.DEACTIVATED
  }

  isDisabled () {
    return this.status === TabScript.statuses.script.DISABLED
  }

  isPending () {
    return this.status === TabScript.statuses.script.PENDING
  }

  isEmbedLibActive () {
    return this.embedLibStatus === TabScript.statuses.embedLib.ACTIVE
  }

  isPanelOpen () {
    return this.panelStatus === TabScript.statuses.panel.OPEN
  }

  hasSameID (tabID) {
    return Symbol.keyFor(this.tabID) === Symbol.keyFor(tabID)
  }

  deattach () {
    if (this.tabObj) {
      this.tabObj.deattach()
    }
  }

  get isDeattached () {
    return this.tabObj ? this.tabObj.isDeattached : false
  }

  static serializable (source) {
    const serializable = {}
    serializable.tabID = typeof source.tabID === 'symbol' ? Symbol.keyFor(source.tabID) : source.tabID
    serializable.tabObj = source.tabObj ? source.tabObj.clone() : undefined
    const keys = ['status', 'embedLibStatus', 'panelStatus', 'tab', 'uiActive']
    for (const key of keys) {
      const value = source[key]
      if (value !== undefined) {
        serializable[key] = typeof value === 'symbol' ? Symbol.keyFor(value) : value
      }
    }
    return serializable
  }

  static readObject (jsonObject) {
    const tabObj = (jsonObject.tabObj && jsonObject.tabObj.tabId && jsonObject.tabObj.windowId)
      ? new Tab(jsonObject.tabObj.tabId, jsonObject.tabObj.windowId)
      : undefined
    const tabScript = new TabScript(tabObj)
    if (jsonObject.tabID) {
      tabScript.tabID = Symbol.for(jsonObject.tabID)
    }
    if (jsonObject.status) {
      tabScript.status = Symbol.for(jsonObject.status)
    }
    if (jsonObject.embedLibStatus) {
      tabScript.embedLibStatus = Symbol.for(jsonObject.embedLibStatus)
    }
    if (jsonObject.panelStatus) {
      tabScript.panelStatus = Symbol.for(jsonObject.panelStatus)
    }
    if (jsonObject.tab) {
      tabScript.tab = jsonObject.tab
    }
    if (Object.prototype.hasOwnProperty.call(jsonObject, 'uiActive')) {
      tabScript.uiActive = jsonObject.uiActive
    }
    return tabScript
  }
}

export class AuthData {
  constructor () {
    this.isAuthenticated = false
    this.accessToken = ''
    this.expirationDateTime = new Date(0)
    this.hasSessionExpired = false
    this.userId = ''
    this.userName = ''
    this.userNickname = ''
  }

  serializable () {
    const serializable = Object.assign({}, this)
    serializable.expirationDateTime = this.expirationDateTime.toJSON()
    return serializable
  }

  setAuthStatus (authStatus) {
    this.isAuthenticated = authStatus
    return this
  }

  setSessionDuration (interval) {
    this.expirationDateTime = new Date(Date.now() + interval)
    return this
  }
}
