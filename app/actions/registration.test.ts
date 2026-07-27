import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  provisionOwnerAndSalon: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/lib/salons/provision-owner', () => ({
  ProvisioningError: class ProvisioningError extends Error {
    constructor(public code: string) {
      super(code)
    }
  },
  provisionOwnerAndSalon: mocks.provisionOwnerAndSalon,
}))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

import { registerOwnerAndSalon } from './registration'

function registrationForm(extra: Record<string, string> = {}) {
  const formData = new FormData()
  formData.set('ownerName', '  Ada Owner  ')
  formData.set('email', '  ADA@Example.COM ')
  formData.set('phone', '')
  formData.set('password', 'safe-password')
  formData.set('salonName', '  Salón Ámbar  ')
  formData.set('salonPhone', '  +507 6111-1111  ')
  for (const [key, value] of Object.entries(extra)) formData.set(key, value)
  return formData
}

describe('registerOwnerAndSalon', () => {
  beforeEach(() => {
    mocks.provisionOwnerAndSalon.mockResolvedValue({ slug: 'salon-ambar' })
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`)
    })
  })

  it('returns safe field validation errors without calling provisioning', async () => {
    const formData = registrationForm()
    formData.set('ownerName', '')
    formData.set('email', 'not-an-email')
    formData.set('password', '')

    const result = await registerOwnerAndSalon(formData)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION')
      expect(result.fieldErrors).toEqual(expect.objectContaining({
        ownerName: expect.any(Array),
        email: expect.any(Array),
        password: expect.any(Array),
      }))
      expect(JSON.stringify(result)).not.toContain('safe-password')
    }
    expect(mocks.provisionOwnerAndSalon).not.toHaveBeenCalled()
  })

  it('normalizes accepted fields and ignores privileged client values', async () => {
    await expect(
      registerOwnerAndSalon(registrationForm({
        role: 'platform_admin',
        status: 'active',
        slug: 'forged-slug',
        planId: 'forged-plan',
        trialDuration: '9999',
      })),
    ).rejects.toThrow('REDIRECT:/s/salon-ambar/dashboard')

    expect(mocks.provisionOwnerAndSalon).toHaveBeenCalledWith({
      ownerName: 'Ada Owner',
      email: 'ada@example.com',
      phone: undefined,
      password: 'safe-password',
      salonName: 'Salón Ámbar',
      salonPhone: '+507 6111-1111',
    })
  })

  it.each([
    ['CONFLICT', 'CONFLICT'],
    ['CONFIG', 'INTERNAL'],
    ['PROVIDER', 'INTERNAL'],
    ['INTERNAL', 'INTERNAL'],
  ] as const)('maps %s provisioning failures to safe %s results', async (provisionCode, actionCode) => {
    const { ProvisioningError } = await import('@/lib/salons/provision-owner')
    mocks.provisionOwnerAndSalon.mockRejectedValue(new ProvisioningError(provisionCode))

    const result = await registerOwnerAndSalon(registrationForm())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe(actionCode)
      expect(result.message).not.toContain(provisionCode)
      expect(result.message).not.toContain('safe-password')
    }
  })

  it('does not swallow the successful framework redirect', async () => {
    await expect(registerOwnerAndSalon(registrationForm())).rejects.toThrow(
      'REDIRECT:/s/salon-ambar/dashboard',
    )
  })
})
