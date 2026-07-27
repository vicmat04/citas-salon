import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getDbUser: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('./session', () => ({ getUser: mocks.getUser, getDbUser: mocks.getDbUser }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect, notFound: mocks.notFound }))

import { requireSalonOwner } from './helpers'

function owner(status: string, slug = 'acme') {
  return {
    id: 'db-user-1',
    role: 'salon_owner',
    ownedSalons: [{ id: 'salon-1', slug, status, name: 'Acme' }],
    salonMemberships: [],
  }
}

describe('requireSalonOwner', () => {
  beforeEach(() => {
    mocks.getUser.mockResolvedValue({ id: 'auth-user-1', email: 'owner@example.com' })
    mocks.getDbUser.mockResolvedValue(owner('active'))
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`)
    })
    mocks.notFound.mockImplementation(() => {
      throw new Error('NOT_FOUND')
    })
  })

  it.each(['trial', 'active'])('returns the verified owned %s salon', async (status) => {
    const dbUser = owner(status)
    mocks.getDbUser.mockResolvedValue(dbUser)

    await expect(requireSalonOwner('acme')).resolves.toEqual({
      user: { id: 'auth-user-1', email: 'owner@example.com' },
      dbUser,
      salon: dbUser.ownedSalons[0],
    })
    expect(mocks.getDbUser).toHaveBeenCalledWith('auth-user-1')
  })

  it('fails closed before returning data for a cross-owner slug', async () => {
    mocks.getDbUser.mockResolvedValue(owner('active', 'other'))
    await expect(requireSalonOwner('acme')).rejects.toThrow('NOT_FOUND')
  })

  it.each(['suspended', 'cancelled'])('redirects an owned %s salon to inactive', async (status) => {
    mocks.getDbUser.mockResolvedValue(owner(status))
    await expect(requireSalonOwner('acme')).rejects.toThrow('REDIRECT:/s/acme/inactive')
  })

  it('fails closed for legacy pending status', async () => {
    mocks.getDbUser.mockResolvedValue(owner('pending'))
    await expect(requireSalonOwner('acme')).rejects.toThrow('NOT_FOUND')
  })
})
