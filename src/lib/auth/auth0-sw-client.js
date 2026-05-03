/**
 * Manifest V3 service-worker-safe Auth0 PKCE OAuth client.
 *
 * Why this exists
 * ===============
 * The original code imported `auth0-chrome` (npm package) lazily inside the
 * background service worker:
 *
 *     const authModule = await import('auth0-chrome')
 *
 * `auth0-chrome` itself is small and DOM-free, but its published `dist/`
 * bundle (the file `package.json#main` points at) is a webpack-4 build that
 * embeds Node.js polyfills like `setimmediate` and `vm-browserify`. Those
 * polyfills reference `document` and `window` to fall back to DOM-based
 * implementations. In an MV3 service worker neither exists, so the very
 * first `import('auth0-chrome')` throws
 *
 *     ReferenceError: document is not defined
 *
 * Worse, the throw happens inside an async chain whose rejection nobody
 * watches, so the popup just sits on "Please be patient while we are
 * logging you in...".
 *
 * This module reimplements just enough of `PKCEClient` + `ChromeClient` to
 * cover the four things the app uses (constructor, `authenticate`,
 * `logout`, redirect URL), using only APIs available natively in service
 * workers: `crypto.subtle`, `fetch`, and `chrome.identity.launchWebAuthFlow`.
 * No DOM, no Node polyfills, no transpiled `regenerator-runtime`.
 *
 * Public surface mirrors `auth0-chrome` so `BackgroundProcess` can swap
 * implementations without changes to the call sites:
 *
 *     new Auth0SwClient(domain, clientId).authenticate(options)
 *     new Auth0SwClient(domain, clientId).logout(options, interactive=false)
 *
 * Both return Promises that resolve to the same shape `auth0-chrome`
 * produced (an object with `access_token`, `expires_in`, `id_token`,
 * `scope`, `token_type`).
 */

/* global chrome */

// TextEncoder is globally available in service workers and all modern
// browsers. The jest/jsdom test environment (Node) may not polyfill it;
// the lazy getter below avoids a top-level ReferenceError so unit tests
// that only exercise buildQueryString / extractAuthCode still work.
const textEncoder = (() => {
  try {
    return typeof TextEncoder !== 'undefined' ? new TextEncoder() : null
  } catch (_) {
    return null
  }
})()

/**
 * RFC-7636 base64url encoding of an ArrayBuffer / Uint8Array.
 */
function base64UrlEncode (bytes) {
  // btoa() takes a binary string. For SW-portability we go via
  // Uint8Array → binary string → btoa, then strip RFC-7636 padding.
  let binary = ''
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  for (let i = 0; i < view.length; i++) {
    binary += String.fromCharCode(view[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

/**
 * Generate a PKCE (verifier, challenge) pair. The verifier is 32 random
 * bytes base64url-encoded; the challenge is SHA-256 of the verifier
 * (also base64url). Matches `auth0-chrome`'s `generateRandomChallengePair`.
 */
export async function generatePkcePair () {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32))
  const verifier = base64UrlEncode(verifierBytes)
  const challengeBytes = await crypto.subtle.digest(
    'SHA-256',
    textEncoder.encode(verifier)
  )
  const challenge = base64UrlEncode(new Uint8Array(challengeBytes))
  return { verifier, challenge }
}

/**
 * Build a query string from a flat object. Avoids depending on a URL
 * parser library; values are URI-encoded individually.
 */
export function buildQueryString (params) {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
}

/**
 * Pull the `code` (or surface an `error`) out of the redirect URL Auth0
 * sends back after the user authorizes the app.
 */
export function extractAuthCode (resultUrl) {
  if (!resultUrl) {
    throw new Error('Auth0 returned an empty callback URL')
  }
  const parsed = new URL(resultUrl)
  const params = parsed.searchParams
  const error = params.get('error')
  if (error) {
    const description = params.get('error_description')
    throw new Error(description || error)
  }
  const code = params.get('code')
  if (!code) {
    throw new Error('Auth0 callback URL did not contain a code parameter')
  }
  return code
}

/**
 * Run a `chrome.identity.launchWebAuthFlow` call as a Promise.
 * `chrome.identity` is callback-only on MV2; on MV3 some Chromiums also
 * support a Promise-returning form, but to stay portable we always use
 * the callback form and adapt it.
 */
function launchWebAuthFlow ({ url, interactive }) {
  return new Promise((resolve, reject) => {
    try {
      chrome.identity.launchWebAuthFlow({ url, interactive }, (callbackUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve(callbackUrl)
      })
    } catch (e) {
      reject(e)
    }
  })
}

class Auth0SwClient {
  constructor (domain, clientId) {
    if (!domain) {
      throw new Error('Auth0SwClient: AUTH0_DOMAIN is required')
    }
    if (!clientId) {
      throw new Error('Auth0SwClient: AUTH0_CLIENT_ID is required')
    }
    this.domain = domain
    this.clientId = clientId
  }

  /**
   * The redirect URL that needs to be on Auth0's "Allowed Callback URLs"
   * list. Format is `https://<extensionId>.chromiumapp.org/auth0` on
   * Chromium-based browsers. On Firefox `chrome.identity.getRedirectURL`
   * yields the `*.extensions.mozilla.org` form instead.
   */
  getRedirectURL () {
    return chrome.identity.getRedirectURL('auth0')
  }

  /**
   * Run the full authorization-code-with-PKCE flow.
   *
   * @param {object} options   Extra Auth0 authorize parameters
   *                           (audience, scope, prompt, ...).
   * @returns {Promise<object>} The full token response from /oauth/token,
   *                           including `access_token` and `expires_in`.
   */
  async authenticate (options = {}) {
    const { verifier, challenge } = await generatePkcePair()

    const authorizeParams = {
      ...options,
      client_id: this.clientId,
      code_challenge: challenge,
      redirect_uri: this.getRedirectURL(),
      code_challenge_method: 'S256',
      response_type: 'code'
    }
    const authorizeUrl = `https://${this.domain}/authorize?${buildQueryString(authorizeParams)}`

    const callbackUrl = await launchWebAuthFlow({ url: authorizeUrl, interactive: true })
    const code = extractAuthCode(callbackUrl)

    const tokenBody = JSON.stringify({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code_verifier: verifier,
      redirect_uri: this.getRedirectURL(),
      code
    })

    const response = await fetch(`https://${this.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: tokenBody
    })
    if (!response.ok) {
      // Try to surface Auth0's error description; fall back to status text.
      let detail = response.statusText
      try {
        const body = await response.json()
        if (body && (body.error_description || body.error)) {
          detail = body.error_description || body.error
        }
      } catch (_) { /* response body wasn't JSON; keep statusText */ }
      throw new Error(`Auth0 token exchange failed: ${detail}`)
    }
    return response.json()
  }

  /**
   * Mirror of `auth0-chrome`'s `logout`: silent (non-interactive) call to
   * `/v2/logout`. The "User interaction required" error that Chromium /
   * Firefox return when no UI is shown is swallowed and treated as
   * success, because logging out without UI is the desired behavior.
   */
  async logout (options = {}, interactive = false) {
    const INTERACTION_MSG_CHROME = 'User interaction required.'
    const INTERACTION_MSG_FF = 'Requires user interaction'
    const url = `https://${this.domain}/v2/logout`
    try {
      await launchWebAuthFlow({ url, interactive })
    } catch (error) {
      const message = error && error.message ? error.message : String(error)
      if (message !== INTERACTION_MSG_CHROME && message !== INTERACTION_MSG_FF) {
        throw error
      }
    }
  }
}

export default Auth0SwClient
