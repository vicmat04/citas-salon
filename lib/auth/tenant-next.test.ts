import { describe, expect, it } from 'vitest'

import { sanitizeTenantNext } from './tenant-next'

const fallback = '/s/acme/dashboard'

describe('sanitizeTenantNext', () => {
  it.each([null, '', '   '])('uses the dashboard fallback for %j', (value) => {
    expect(sanitizeTenantNext(value, 'acme')).toBe(fallback)
  })

  it('preserves a valid same-tenant path and query', () => {
    expect(sanitizeTenantNext('/s/acme/settings?tab=hours&day=1', 'acme')).toBe(
      '/s/acme/settings?tab=hours&day=1',
    )
  })

  it('preserves encoded values in a valid query and drops fragments', () => {
    expect(
      sanitizeTenantNext('/s/acme/settings?return=%2Fbook%2Facme#private', 'acme'),
    ).toBe('/s/acme/settings?return=%2Fbook%2Facme')
  })

  it.each([
    'https://evil.example/s/acme/settings',
    '//evil.example/s/acme/settings',
    '/s/other/settings',
    '/s/acme/login',
    '/s/acme/login?next=/s/acme/settings',
    '/s/acme/login/',
    '/s/acme/../admin',
    '/s/acme/./settings',
    '/s/acme/%2e%2e/admin',
    '/s/acme/%2E/settings',
    '/s/acme%2fsettings',
    '/s/acme/%2Fsettings',
    '/s/acme/%5csettings',
    '/s/acme/%252fsettings',
    '/s//acme/settings',
    '/s/acme//settings',
    '/s/acme\\settings',
    '/s/acme/settings\u0000',
    '/s/acme/%00settings',
    '/s/acme/%E0%A4%A',
  ])('rejects unsafe tenant return value %j', (value) => {
    expect(sanitizeTenantNext(value, 'acme')).toBe(fallback)
  })
})
