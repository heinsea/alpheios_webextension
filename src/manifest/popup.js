(function () {
  const extApi = window.browser || window.chrome
  const LOG_PREFIX = '[alpheios-popup]'
  const ui = {
    title: document.getElementById('status-title'),
    text: document.getElementById('status-text'),
    toggleBtn: document.getElementById('toggle-btn'),
    infoBtn: document.getElementById('info-btn')
  }

  function logWarn (label, error) {
    // Errors that surface in the popup UI should also leave a trace in the
    // popup devtools console. Without this, anything that fails between the
    // popup and the background service worker is invisible to the developer.
    if (error && error.stack) {
      console.warn(`${LOG_PREFIX} ${label}:`, error.message, error.stack)
    } else {
      console.warn(`${LOG_PREFIX} ${label}:`, error)
    }
  }

  function setLoading (isLoading) {
    ui.toggleBtn.disabled = isLoading
    ui.infoBtn.disabled = isLoading
  }

  function setErrorState (message) {
    ui.title.textContent = 'Unavailable on this page'
    ui.text.textContent = message
    ui.toggleBtn.disabled = true
    ui.infoBtn.disabled = true
  }

  function setStatusState (status) {
    if (!status.supportedUrl) {
      setErrorState('This browser page does not allow extension script injection.')
      return
    }

    if (status.isEmbedded) {
      ui.title.textContent = 'Embedded version active'
      ui.text.textContent = 'Alpheios is already provided by this site and the extension is disabled here.'
      ui.toggleBtn.disabled = true
      ui.infoBtn.disabled = true
      return
    }

    if (status.isDisabled) {
      ui.title.textContent = 'Temporarily disabled'
      ui.text.textContent = 'The extension is currently disabled for this tab.'
      ui.toggleBtn.textContent = 'Try Activate'
      ui.toggleBtn.disabled = false
      ui.infoBtn.disabled = true
      return
    }

    if (status.isActive) {
      ui.title.textContent = 'Reading tools are active'
      ui.text.textContent = status.title ? `Current page: ${status.title}` : 'Alpheios is running on this page.'
      ui.toggleBtn.textContent = 'Deactivate'
      ui.infoBtn.disabled = false
      return
    }

    ui.title.textContent = 'Ready to activate'
    ui.text.textContent = status.title ? `Current page: ${status.title}` : 'Enable Alpheios for this tab.'
    ui.toggleBtn.textContent = 'Activate'
    ui.infoBtn.disabled = true
  }

  function sendMessage (payload) {
    return new Promise((resolve, reject) => {
      let settled = false
      const settle = (fn, value) => {
        if (!settled) {
          settled = true
          fn(value)
        }
      }

      try {
        const maybePromise = extApi.runtime.sendMessage(payload, (response) => {
          if (window.chrome && window.chrome.runtime && window.chrome.runtime.lastError) {
            settle(reject, new Error(window.chrome.runtime.lastError.message))
          } else {
            settle(resolve, response)
          }
        })
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then((response) => settle(resolve, response)).catch((error) => settle(reject, error))
        }
      } catch (error) {
        settle(reject, error)
      }
    })
  }

  async function refreshStatus () {
    setLoading(true)
    try {
      const response = await sendMessage({ source: 'alpheios-popup', command: 'get-status' })
      if (!response || !response.ok || !response.status) {
        const reason = response && response.error ? response.error : 'Background status is unavailable.'
        logWarn('get-status returned non-ok response', { response, reason })
        setErrorState(reason)
        return
      }
      setStatusState(response.status)
    } catch (error) {
      logWarn('get-status threw', error)
      setErrorState(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function executeAction (command) {
    setLoading(true)
    try {
      const response = await sendMessage({ source: 'alpheios-popup', command })
      if (!response || !response.ok || !response.status) {
        const reason = response && response.error ? response.error : 'Action failed.'
        logWarn(`command "${command}" returned non-ok response`, { response, reason })
        setErrorState(reason)
        return
      }
      setStatusState(response.status)
    } catch (error) {
      logWarn(`command "${command}" threw`, error)
      setErrorState(error.message)
    } finally {
      setLoading(false)
    }
  }

  ui.toggleBtn.addEventListener('click', () => executeAction('toggle'))
  ui.infoBtn.addEventListener('click', () => executeAction('open-info'))
  refreshStatus()
})()
