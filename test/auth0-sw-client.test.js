/* eslint-env jest */
import { buildQueryString, extractAuthCode } from '../src/lib/auth/auth0-sw-client.js'

describe('buildQueryString', () => {
  test('encodes simple key-value pairs', () => {
    expect(buildQueryString({ client_id: 'abc', scope: 'openid profile' }))
      .toBe('client_id=abc&scope=openid%20profile')
  })

  test('skips undefined and null values', () => {
    expect(buildQueryString({ a: 1, b: undefined, c: null, d: 'hi' }))
      .toBe('a=1&d=hi')
  })

  test('encodes special characters in values', () => {
    expect(buildQueryString({ redirect_uri: 'https://example.com/auth0' }))
      .toBe('redirect_uri=https%3A%2F%2Fexample.com%2Fauth0')
  })

  test('returns empty string for empty object', () => {
    expect(buildQueryString({})).toBe('')
  })
})

describe('extractAuthCode', () => {
  test('extracts code from a well-formed callback URL', () => {
    const url = 'https://abc.chromiumapp.org/auth0?code=xyz789&state=123'
    expect(extractAuthCode(url)).toBe('xyz789')
  })

  test('throws if error query param is present', () => {
    const url = 'https://abc.chromiumapp.org/auth0?error=access_denied&error_description=User%20denied'
    expect(() => extractAuthCode(url)).toThrow('User denied')
  })

  test('throws error_description if error exists without description text', () => {
    const url = 'https://abc.chromiumapp.org/auth0?error=invalid_request'
    expect(() => extractAuthCode(url)).toThrow('invalid_request')
  })

  test('throws if code parameter is missing', () => {
    const url = 'https://abc.chromiumapp.org/auth0?state=123'
    expect(() => extractAuthCode(url)).toThrow('code')
  })

  test('throws for an empty URL', () => {
    expect(() => extractAuthCode('')).toThrow('empty')
  })

  test('throws if URL is not a valid URL string', () => {
    expect(() => extractAuthCode('not-a-url')).toThrow('Invalid URL')
  })
})
