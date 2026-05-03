/**
 * URL support helpers shared between the background script and tests.
 *
 * Each browser bans content-script injection on a set of internal URLs
 * (browser settings, the extension's own pages, view-source, etc.).
 * The list grows over time, so it lives here as a single source of truth
 * instead of being duplicated next to every executeScript() call.
 */

const UNSUPPORTED_URL_SCHEMES = /^(chrome|edge|about|moz-extension|chrome-extension|view-source):/i

/**
 * Return true if the URL is a regular http(s) page (or empty/unknown) that
 * extension content scripts are allowed to run on. Returns false for
 * browser-internal pages where injection is silently blocked.
 *
 * @param {string} [url=''] tab URL as reported by `tabs.query` / `webNavigation`
 * @returns {boolean}
 */
export function isSupportedTabUrl (url = '') {
  return !UNSUPPORTED_URL_SCHEMES.test(url)
}

export { UNSUPPORTED_URL_SCHEMES }
