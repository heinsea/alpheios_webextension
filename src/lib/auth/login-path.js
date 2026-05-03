/**
 * Decide which login path the background script should follow given the
 * current Auth0 environment configuration. Pure function so it can be
 * unit-tested without instantiating the BackgroundProcess class or
 * loading auth0-chrome.
 *
 * The historical bug this guards against: an earlier version of
 * BackgroundProcess.loginRequestHandler checked TEST_ID first, so any
 * leftover `TEST_ID: 'mock-token'` from a previous test-mode build
 * silently short-circuited real Auth0 login as a mock test user. The
 * priority must be: real Client ID > TEST_ID fallback > missing config
 * error.
 *
 * @param {object} authEnv The auth0Env object loaded from env-webext-config.js.
 * @returns {'real'|'mock'|'missing-config'}
 *   - 'real': real Auth0 OAuth flow should run.
 *   - 'mock': use the TEST_ID test-user fallback.
 *   - 'missing-config': neither configured; the handler should respond
 *     with an actionable error.
 */
export function decideLoginPath (authEnv) {
  const clientId = authEnv && authEnv.AUTH0_CLIENT_ID
  const hasRealClientId = typeof clientId === 'string' &&
    clientId.length > 0 &&
    clientId !== 'LOCAL_DEV_NO_AUTH' &&
    !clientId.includes('PLACE_AUTH0_CLIENT_ID_HERE')

  if (hasRealClientId) {
    return 'real'
  }

  if (authEnv && authEnv.TEST_ID) {
    return 'mock'
  }

  return 'missing-config'
}
