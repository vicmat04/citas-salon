import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
  requireAuth: vi.fn(),
  requireOperationalPublicSalon: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  default: { salon: { findUnique: mocks.findUnique } },
}))
vi.mock('@/lib/auth/helpers', () => ({ requireAuth: mocks.requireAuth }))
vi.mock('@/lib/salons/lifecycle', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/salons/lifecycle')>()
  return {
    ...original,
    requireOperationalPublicSalon: mocks.requireOperationalPublicSalon,
  }
})
vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}))

import PublicSalonLandingPage from './[slug]/page'
import PublicBookingWizardPage from './book/[slug]/page'
import PublicConfirmationPage from './book/[slug]/confirmacion/page'
import MySalonsPage from './my-salons/page'
import InactiveSalonPage from './s/[slug]/inactive/page'

const params = Promise.resolve({ slug: 'acme' })

function salon(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Salón Acme',
    slug: 'acme',
    status,
    ...overrides,
  }
}

describe('/my-salons', () => {
  beforeEach(() => {
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`)
    })
  })

  it('renders only relation-derived salons with lifecycle-appropriate actions', async () => {
    mocks.requireAuth.mockResolvedValue({
      dbUser: {
        role: 'salon_owner',
        ownedSalons: [
          salon('active', { name: 'Activo', slug: 'activo' }),
          salon('trial', { name: 'Prueba', slug: 'prueba' }),
          salon('suspended', { name: 'Suspendido Uno', slug: 'suspendido' }),
          salon('cancelled', { name: 'Cancelado', slug: 'cancelado' }),
          salon('pending', { name: 'Pendiente Uno', slug: 'pendiente' }),
        ],
      },
    })

    const markup = renderToStaticMarkup(await MySalonsPage())

    expect(markup).toContain('href="/s/activo/dashboard"')
    expect(markup).toContain('href="/s/prueba/dashboard"')
    expect(markup).toContain('href="/s/suspendido/inactive"')
    expect(markup).toContain('href="/s/cancelado/inactive"')
    expect(markup.match(/Suspendido/g)).toHaveLength(3) // one salon name plus two badges
    expect(markup).toContain('Pendiente')
    expect(markup).not.toContain('href="/s/pendiente/dashboard"')
  })

  it('renders an explicit empty state without inventing a tenant', async () => {
    mocks.requireAuth.mockResolvedValue({
      dbUser: { role: 'salon_owner', ownedSalons: [] },
    })

    const markup = renderToStaticMarkup(await MySalonsPage())

    expect(markup).toContain('No tienes salones registrados')
    expect(markup).not.toContain('/s/demo')
  })

  it('routes platform admins to their own area', async () => {
    mocks.requireAuth.mockResolvedValue({
      dbUser: { role: 'platform_admin', ownedSalons: [] },
    })

    await expect(MySalonsPage()).rejects.toThrow('REDIRECT:/admin/dashboard')
  })
})

describe('/s/[slug]/inactive', () => {
  beforeEach(() => {
    mocks.notFound.mockImplementation(() => {
      throw new Error('NOT_FOUND')
    })
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`)
    })
  })

  it.each(['suspended', 'cancelled'])('renders a non-sensitive %s notice and support action', async (status) => {
    mocks.findUnique.mockResolvedValue(salon(status))

    const markup = renderToStaticMarkup(await InactiveSalonPage({ params }))

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { slug: 'acme' },
      select: { name: true, slug: true, status: true },
    })
    expect(markup).toContain('Salón Acme')
    expect(markup).toContain('no está disponible')
    expect(markup).toContain('administración')
    expect(markup).toContain('href="https://wa.me/50767005805"')
    expect(markup).not.toContain('Reservar')
    expect(markup).not.toContain('subscription')
  })

  it.each([null, salon('pending')])('not-founds unknown and pending salons', async (value) => {
    mocks.findUnique.mockResolvedValue(value)
    await expect(InactiveSalonPage({ params })).rejects.toThrow('NOT_FOUND')
  })

  it.each(['trial', 'active'])('redirects an operational %s salon to its public page', async (status) => {
    mocks.findUnique.mockResolvedValue(salon(status))
    await expect(InactiveSalonPage({ params })).rejects.toThrow('REDIRECT:/acme')
  })
})

describe('public salon and booking route guards', () => {
  beforeEach(() => {
    mocks.requireOperationalPublicSalon.mockResolvedValue(salon('active'))
  })

  it.each([
    ['landing', PublicSalonLandingPage],
    ['booking', PublicBookingWizardPage],
    ['confirmation', PublicConfirmationPage],
  ])('guards the %s page before rendering public mock content', async (_name, Page) => {
    const markup = renderToStaticMarkup(await Page({ params }))

    expect(mocks.requireOperationalPublicSalon).toHaveBeenCalledWith('acme')
    expect(markup).toContain('Salón Acme')
  })

  it.each([
    ['landing', PublicSalonLandingPage],
    ['booking', PublicBookingWizardPage],
    ['confirmation', PublicConfirmationPage],
  ])('terminates the %s page when a fresh guard observes suspension', async (_name, Page) => {
    mocks.requireOperationalPublicSalon.mockRejectedValue(
      new Error('REDIRECT:/s/acme/inactive'),
    )

    await expect(Page({ params })).rejects.toThrow('REDIRECT:/s/acme/inactive')
  })

  it('enforces a status change on the next request instead of retaining prior route state', async () => {
    mocks.requireOperationalPublicSalon
      .mockResolvedValueOnce(salon('active'))
      .mockRejectedValueOnce(new Error('REDIRECT:/s/acme/inactive'))

    await expect(PublicSalonLandingPage({ params })).resolves.toBeTruthy()
    await expect(PublicBookingWizardPage({ params })).rejects.toThrow(
      'REDIRECT:/s/acme/inactive',
    )
    expect(mocks.requireOperationalPublicSalon).toHaveBeenCalledTimes(2)
  })
})
