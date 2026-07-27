import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getDbUser: vi.fn(),
  redirect: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/auth/session', () => ({ getDbUser: mocks.getDbUser }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

import { loginWithEmail } from './auth'

function credentials(extra: Record<string, string> = {}) {
  const formData = new FormData()
  formData.set('email', 'owner@example.com')
  formData.set('password', 'secret-value')
  for (const [key, value] of Object.entries(extra)) formData.set(key, value)
  return formData
}

function dbUser(role: string, ownedSalons: Array<{ slug: string; status: string }> = []) {
  return { id: 'db-user', role, ownedSalons }
}

describe('loginWithEmail', () => {
  beforeEach(() => {
    mocks.createClient.mockResolvedValue({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signOut: mocks.signOut,
      },
    })
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-user' } },
      error: null,
    })
    mocks.signOut.mockResolvedValue({ error: null })
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`)
    })
  })

  it('server-validates credentials before calling the provider', async () => {
    const formData = new FormData()
    formData.set('email', 'not-an-email')
    formData.set('password', '')

    const result = await loginWithEmail(formData)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('VALIDATION')
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })

  it('returns a fixed safe error for provider authentication failure', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'provider internals secret-value' },
    })

    const result = await loginWithEmail(credentials())

    expect(result).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Correo o contraseña incorrectos.',
    })
    expect(JSON.stringify(result)).not.toContain('provider internals')
    expect(JSON.stringify(result)).not.toContain('secret-value')
  })

  it('routes a generic owner by its database role and ignores forged destinations', async () => {
    mocks.getDbUser.mockResolvedValue(dbUser('salon_owner'))

    await expect(
      loginWithEmail(credentials({ next: 'https://evil.example', role: 'platform_admin' })),
    ).rejects.toThrow('REDIRECT:/my-salons')
  })

  it('routes a database platform admin to the admin dashboard', async () => {
    mocks.getDbUser.mockResolvedValue(dbUser('platform_admin'))
    await expect(loginWithEmail(credentials())).rejects.toThrow('REDIRECT:/admin/dashboard')
  })

  it('returns an owning operational tenant user to a safe same-tenant destination', async () => {
    mocks.getDbUser.mockResolvedValue(
      dbUser('salon_owner', [{ slug: 'acme', status: 'active' }]),
    )

    await expect(
      loginWithEmail(
        credentials({ tenantSlug: 'acme', next: '/s/acme/settings?tab=hours' }),
      ),
    ).rejects.toThrow('REDIRECT:/s/acme/settings?tab=hours')
  })

  it('falls back for a forged tenant next destination', async () => {
    mocks.getDbUser.mockResolvedValue(
      dbUser('salon_owner', [{ slug: 'acme', status: 'trial' }]),
    )

    await expect(
      loginWithEmail(credentials({ tenantSlug: 'acme', next: '/s/other/settings' })),
    ).rejects.toThrow('REDIRECT:/s/acme/dashboard')
  })

  it('rejects cross-tenant login without exposing ownership details', async () => {
    mocks.getDbUser.mockResolvedValue(
      dbUser('salon_owner', [{ slug: 'other', status: 'active' }]),
    )

    const result = await loginWithEmail(
      credentials({ tenantSlug: 'acme', next: '/s/acme/settings' }),
    )

    expect(result).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'No fue posible iniciar sesión para este salón.',
    })
  })

  it.each(['suspended', 'cancelled'])('routes an owning %s salon to inactive', async (status) => {
    mocks.getDbUser.mockResolvedValue(dbUser('salon_owner', [{ slug: 'acme', status }]))

    await expect(
      loginWithEmail(credentials({ tenantSlug: 'acme', next: '/s/acme/settings' })),
    ).rejects.toThrow('REDIRECT:/s/acme/inactive')
  })

  it('fails closed for a pending tenant by routing to the owner hub', async () => {
    mocks.getDbUser.mockResolvedValue(
      dbUser('salon_owner', [{ slug: 'acme', status: 'pending' }]),
    )

    await expect(
      loginWithEmail(credentials({ tenantSlug: 'acme', next: '/s/acme/settings' })),
    ).rejects.toThrow('REDIRECT:/my-salons')
  })

  it('signs out an authenticated provider identity missing from the database', async () => {
    mocks.getDbUser.mockResolvedValue(null)

    const result = await loginWithEmail(credentials())

    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(result).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'No fue posible iniciar sesión.',
    })
  })
})
