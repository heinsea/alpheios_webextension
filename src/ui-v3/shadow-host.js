/**
 * ShadowRoot host for Alpheios v3 UI.
 *
 * Why ShadowRoot:
 *   - Isolates v3's CSS variable scope and Material-Symbols icon font from
 *     whatever the host page ships, so token migrations (DESIGN.md §4) never
 *     leak both ways.
 *   - Lets us coexist with the legacy v2 light-DOM mount on the same page
 *     during the parallel-development period without selector collisions.
 *
 * The CSS bundle and tokens are inlined as <style> nodes (not <link>) because
 * MV3 service-worker injection from background does not get
 * `web_accessible_resources` for its own bundled files when fetched as URLs;
 * inlining the text via a webpack `?raw` import avoids that whole class of
 * issue.
 */

import componentsStyle from 'alpheios-components-v3/style.css?raw'

export function createShadowHost (hostId) {
  // If a previous injection created this host with a CLOSED shadow root,
  // `host.shadowRoot` is always null and calling attachShadow() again throws
  // a DOMException. In that case we must replace the host node.
  let host = document.getElementById(hostId)
  if (host) {
    if (host.shadowRoot) {
      return { host, shadow: host.shadowRoot, isNew: false }
    }
    if (host.parentNode) {
      host.parentNode.removeChild(host)
    }
    host = null
  }

  if (!host) {
    host = document.createElement('div')
    host.id = hostId
    // The host itself stays out of layout. The Vue app inside the shadow
    // controls its own positioning (fixed FAB / drawer / popup overlay).
    host.style.cssText = [
      'all: initial',
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 0',
      'height: 0',
      'pointer-events: none',
      'z-index: 2147483646'
    ].join(';') + ';'
    document.documentElement.appendChild(host)
  }
  const shadow = host.attachShadow({ mode: 'closed' })

  // Inject the components-v3 stylesheet (tokens + primitive styles) once.
  const styleEl = document.createElement('style')
  styleEl.setAttribute('data-alpheios-v3-style', '')
  styleEl.textContent = componentsStyle
  shadow.appendChild(styleEl)

  // Mount point inside the shadow. Vue takes over from here.
  const mountPoint = document.createElement('div')
  mountPoint.id = 'alpheios-v3-root'
  // Make the root itself transparent / non-blocking; child surfaces opt in
  // to pointer events on a per-element basis.
  mountPoint.style.cssText = 'pointer-events: auto; all: initial;'
  shadow.appendChild(mountPoint)

  return { host, shadow, mountPoint, isNew: true }
}

export function destroyShadowHost (hostId) {
  const host = document.getElementById(hostId)
  if (host && host.parentNode) {
    host.parentNode.removeChild(host)
  }
}
