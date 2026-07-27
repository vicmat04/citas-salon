import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  default: { salon: { findUnique: mocks.findUnique } },
}))
vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}))

import {
  isInactiveSalonStatus,
  isOperationalSalonStatus,
  requireOperationalPublicSalon,
} from './lifecycle'

function salon(status: string) {
  return { id: 'salon-1', slug: 'acme', status }
}

describe('salon lifecycle status', () => {
  it.each(['trial', 'active'])('classifies %s as operational', (status) => {
    expect(isOperationalSalonStatus(status)).toBe(true)
    expect(isInactiveSalonStatus(status)).toBe(false)
  })

  it.each(['suspended', 'cancelled'])('classifies %s as inactive', (status) => {
    expect(isOperationalSalonStatus(status)).toBe(false)
    expect(isInactiveSalonStatus(status)).toBe(true)
  })

  it.each(['pending', '', 'ACTIVE', 'unknown'])('fails closed for %j', (status) => {
    expect(isOperationalSalonStatus(status)).toBe(false)
    expect(isInactiveSalonStatus(status)).toBe(false)
  })
})

describe('requireOperationalPublicSalon', () => {
  beforeEach(() => {
    mocks.notFound.mockImplementation(() => {
      throw new Error('NOT_FOUND')
    })
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`)
    })
  })

  it.each(['trial', 'active'])('returns a freshly loaded %s salon', async (status) => {
    const currentSalon = salon(status)
    mocks.findUnique.mockResolvedValue(currentSalon)

    await expect(requireOperationalPublicSalon('acme')).resolves.toBe(currentSalon)
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { slug: 'acme' } })
  })

  it.each(['suspended', 'cancelled'])('redirects a %s salon to inactive', async (status) => {
    mocks.findUnique.mockResolvedValue(salon(status))

    await expect(requireOperationalPublicSalon('acme')).rejects.toThrow(
      'REDIRECT:/s/acme/inactive',
    )
  })

  it.each([null, salon('pending')])('not-founds a missing or unsupported salon', async (value) => {
    mocks.findUnique.mockResolvedValue(value)

    await expect(requireOperationalPublicSalon('acme')).rejects.toThrow('NOT_FOUND')
  })
})
