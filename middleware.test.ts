import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  refreshCookie: false,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(
    (_url: string, _key: string, options: { cookies: { setAll: (cookies: object[]) => void } }) => ({
      auth: {
        getUser: async () => {
          if (state.refreshCookie) {
            options.cookies.setAll([
              { name: 'refreshed', value: 'yes', options: { httpOnly: true } },
            ])
          }
          return { data: { user: state.user } }
        },
      },
    }),
  ),
}))

import { config, middleware } from './middleware'

function request(path: string) {
  return new NextRequest(`https://app.example${path}`)
}

describe('tenant-aware middleware', () => {
  beforeEach(() => {
    state.user = null
    state.refreshCookie = false
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  })

  it('matches admin, tenant, and owner-hub routes', () => {
    expect(config.matcher).toEqual(['/admin/:path*', '/s/:path*', '/my-salons'])
  })

  it('preserves tenant path and query in the tenant login redirect', async () => {
    const response = await middleware(request('/s/acme/settings?tab=hours&day=1'))
    const location = new URL(response.headers.get('location')!)

    expect(location.pathname).toBe('/s/acme/login')
    expect(location.searchParams.get('next')).toBe('/s/acme/settings?tab=hours&day=1')
  })

  it.each(['/s/acme/login', '/s/acme/inactive'])('leaves exact public tenant route %s loop-free', async (path) => {
    const response = await middleware(request(path))
    expect(response.headers.get('location')).toBeNull()
  })

  it.each(['/s/acme/login/extra', '/s/acme/private/login', '/s/acme/inactive/details'])(
    'does not exempt non-exact route %s',
    async (path) => {
      const response = await middleware(request(path))
      expect(new URL(response.headers.get('location')!).pathname).toBe('/s/acme/login')
    },
  )

  it('routes the unauthenticated owner hub to generic login', async () => {
    const response = await middleware(request('/my-salons'))
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe('/my-salons')
  })

  it('routes unauthenticated admin pages to admin login', async () => {
    const response = await middleware(request('/admin/salons'))
    expect(new URL(response.headers.get('location')!).pathname).toBe('/admin/login')
  })

  it('leaves admin login public', async () => {
    const response = await middleware(request('/admin/login'))
    expect(response.headers.get('location')).toBeNull()
  })

  it('allows authenticated protected requests', async () => {
    state.user = { id: 'auth-user' }
    const response = await middleware(request('/s/acme/dashboard'))
    expect(response.headers.get('location')).toBeNull()
  })

  it('copies refreshed auth cookies onto redirects', async () => {
    state.refreshCookie = true
    const response = await middleware(request('/s/acme/dashboard'))
    expect(response.cookies.get('refreshed')?.value).toBe('yes')
  })
})
