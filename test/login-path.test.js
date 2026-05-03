/* eslint-env jest */
import { decideLoginPath } from '../src/lib/auth/login-path.js'

describe('decideLoginPath', () => {
  // Each row is a comment about the scenario, plus an env shape and an
  // expected verdict. The first three rows are the scenarios that the
  // 2026-05-03 priority bug specifically broke.
  test.each([
    [
      'real Client ID + leftover TEST_ID → real (was the bug: used to return mock)',
      { AUTH0_CLIENT_ID: 'real_client_xyz', TEST_ID: 'mock-token' },
      'real'
    ],
    [
      'real Client ID, no TEST_ID → real',
      { AUTH0_CLIENT_ID: 'real_client_xyz', TEST_ID: '' },
      'real'
    ],
    [
      'LOCAL_DEV_NO_AUTH + TEST_ID → mock',
      { AUTH0_CLIENT_ID: 'LOCAL_DEV_NO_AUTH', TEST_ID: 'mock-token' },
      'mock'
    ],
    [
      'placeholder still in file + TEST_ID → mock (placeholder is not a real ID)',
      { AUTH0_CLIENT_ID: 'PLACE_AUTH0_CLIENT_ID_HERE', TEST_ID: 'mock-token' },
      'mock'
    ],
    [
      'LOCAL_DEV_NO_AUTH and no TEST_ID → missing-config',
      { AUTH0_CLIENT_ID: 'LOCAL_DEV_NO_AUTH', TEST_ID: '' },
      'missing-config'
    ],
    [
      'empty Client ID, no TEST_ID → missing-config',
      { AUTH0_CLIENT_ID: '', TEST_ID: '' },
      'missing-config'
    ],
    [
      'undefined Client ID and TEST_ID → missing-config',
      {},
      'missing-config'
    ]
  ])('%s', (_label, env, expected) => {
    expect(decideLoginPath(env)).toBe(expected)
  })

  test('null env does not throw', () => {
    expect(decideLoginPath(null)).toBe('missing-config')
    expect(decideLoginPath(undefined)).toBe('missing-config')
  })

  test('non-string Client ID is not treated as real', () => {
    // Defends against bizarre config corruption (e.g. someone wrote
    // AUTH0_CLIENT_ID: null in env-webext-config.js).
    expect(decideLoginPath({ AUTH0_CLIENT_ID: null, TEST_ID: 'mock-token' })).toBe('mock')
    expect(decideLoginPath({ AUTH0_CLIENT_ID: 12345, TEST_ID: 'mock-token' })).toBe('mock')
  })
})
