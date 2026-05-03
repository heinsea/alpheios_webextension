/* eslint-env jest */
import { isSupportedTabUrl } from '../src/lib/url-support.js'

describe('isSupportedTabUrl', () => {
  // Real browser pages where the extension SHOULD inject.
  test.each([
    ['https://example.com/', true],
    ['http://example.com/path?q=1', true],
    ['https://en.wikipedia.org/wiki/Latin', true],
    ['', true], // empty/unknown URL is treated as allowed; the executeScript call itself filters
    ['file:///tmp/test.html', true] // P0 does not block file:// here; OS-level rules still apply
  ])('allows %s', (url, expected) => {
    expect(isSupportedTabUrl(url)).toBe(expected)
  })

  // Browser-internal pages that block content-script injection.
  test.each([
    ['chrome://extensions', false],
    ['chrome://settings/', false],
    ['CHROME://EXTENSIONS', false], // case-insensitive
    ['edge://favorites', false],
    ['about:blank', false],
    ['about:debugging', false],
    ['moz-extension://abcd-efgh/popup.html', false],
    ['chrome-extension://abcdef/options.html', false],
    ['view-source:https://example.com/', false]
  ])('blocks %s', (url, expected) => {
    expect(isSupportedTabUrl(url)).toBe(expected)
  })
})
