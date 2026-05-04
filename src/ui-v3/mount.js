/**
 * mount.js — boots a Vue 3 app for Alpheios v3 inside a ShadowRoot.
 *
 * Returns a `dispose` function that the caller (content-v3.js) wires to
 * `beforeunload` so the app cleans up if the user navigates away mid-session.
 *
 * Stage 4a: now accepts an optional `appController` (alpheios-core
 * AppController instance with AuthModule registered). When provided, the
 * controller is `app.provide()`-d under `APP_CONTROLLER_KEY` so the v3
 * surfaces / pages / composables can `inject()` it. content-v3.js owns
 * the controller's lifecycle; mount.js only wires it through.
 */

import { createApp } from 'vue'
import { App, APP_CONTROLLER_KEY } from 'alpheios-components-v3'
import { createShadowHost, destroyShadowHost } from './shadow-host.js'

export async function mount ({ hostId, appController = null } = {}) {
  const { mountPoint, isNew } = createShadowHost(hostId)
  if (!isNew) {
    // Re-entry safeguard: if the host already exists from an earlier
    // injection in the same frame, don't double-mount.
    return () => {}
  }
  const app = createApp(App)
  if (appController) {
    app.provide(APP_CONTROLLER_KEY, appController)
  }
  app.mount(mountPoint)
  return function dispose () {
    try { app.unmount() } catch { /* ignore */ }
    destroyShadowHost(hostId)
  }
}
