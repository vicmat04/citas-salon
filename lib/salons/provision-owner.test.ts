import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  listAdminUsers: vi.fn(),
  createCookieClient: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getTrialConfig: vi.fn(),
  planFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: mocks.createAdminUser,
        deleteUser: mocks.deleteAdminUser,
        listUsers: mocks.listAdminUsers,
      },
    },
  },
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createCookieClient }))
vi.mock('@/lib/salons/trial', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./trial')>()
  return { ...actual, getTrialConfig: mocks.getTrialConfig }
})
vi.mock('@/lib/db', () => ({
  default: {
    plan: { findFirst: mocks.planFindFirst },
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.transaction,
  },
}))

import {
  ProvisioningError,
  generateSalonSlugBase,
  provisionOwnerAndSalon,
  slugCandidate,
} from './provision-owner'

const validInput = {
  ownerName: 'Ada Owner',
  email: ' Ada@Example.COM ',
  phone: '+50760000000',
  password: 'safe-password',
  salonName: 'Salón Ámbar',
  salonPhone: '+50761111111',
}

function transactionClient() {
  return {
    user: {
      create: vi.fn().mockResolvedValue({ id: 'db-user-1' }),
    },
    salon: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'salon-1', slug: data.slug }),
      ),
    },
    subscription: {
      create: vi.fn().mockResolvedValue({ id: 'subscription-1' }),
    },
  }
}

function expectProvisioningCode(error: unknown, code: ProvisioningError['code']) {
  expect(error).toBeInstanceOf(ProvisioningError)
  expect((error as ProvisioningError).code).toBe(code)
}

describe('salon slug generation', () => {
  it('normalizes names and keeps reserved application roots unavailable', () => {
    expect(generateSalonSlugBase('Salón Ámbar & Spa')).toBe('salon-ambar-and-spa')
    expect(generateSalonSlugBase('admin')).toBe('admin-salon')
    expect(generateSalonSlugBase('___')).toBe('salon')
  })

  it('creates deterministic collision candidates', () => {
    expect(slugCandidate('salon-ambar', 0)).toBe('salon-ambar')
    expect(slugCandidate('salon-ambar', 1)).toBe('salon-ambar-2')
    expect(slugCandidate('salon-ambar', 9)).toBe('salon-ambar-10')
  })
})

describe('provisionOwnerAndSalon', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-23T15:00:00.000Z'))
    mocks.getTrialConfig.mockReturnValue({ planName: 'Free Trial', durationDays: 14 })
    mocks.planFindFirst.mockResolvedValue({ id: 'plan-1' })
    mocks.userFindUnique.mockResolvedValue(null)
    mocks.createAdminUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1', email: 'ada@example.com', user_metadata: {} } },
      error: null,
    })
    mocks.listAdminUsers.mockResolvedValue({ data: { users: [] }, error: null })
    mocks.deleteAdminUser.mockResolvedValue({ data: {}, error: null })
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
      error: null,
    })
    mocks.signOut.mockResolvedValue({ error: null })
    mocks.createCookieClient.mockResolvedValue({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signOut: mocks.signOut,
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('validates trial configuration before any external identity write', async () => {
    mocks.getTrialConfig.mockImplementation(() => {
      throw new Error('Invalid trial configuration')
    })

    await provisionOwnerAndSalon(validInput).then(
      () => expect.fail('expected configuration failure'),
      (error: unknown) => expectProvisioningCode(error, 'CONFIG'),
    )

    expect(mocks.planFindFirst).not.toHaveBeenCalled()
    expect(mocks.createAdminUser).not.toHaveBeenCalled()
  })

  it('requires a configured active trial plan before creating an identity', async () => {
    mocks.planFindFirst.mockResolvedValue(null)

    await provisionOwnerAndSalon(validInput).then(
      () => expect.fail('expected configuration failure'),
      (error: unknown) => expectProvisioningCode(error, 'CONFIG'),
    )

    expect(mocks.planFindFirst).toHaveBeenCalledWith({
      where: { name: 'Free Trial', isActive: true },
      select: { id: true },
    })
    expect(mocks.createAdminUser).not.toHaveBeenCalled()
  })

  it('normalizes duplicate database email and never attaches a new salon', async () => {
    mocks.userFindUnique.mockResolvedValueOnce({ id: 'existing-user' })

    await provisionOwnerAndSalon(validInput).then(
      () => expect.fail('expected conflict'),
      (error: unknown) => expectProvisioningCode(error, 'CONFLICT'),
    )

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
      select: { id: true },
    })
    expect(mocks.createAdminUser).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('creates User, trial Salon, and matching Subscription atomically with deterministic dates', async () => {
    const tx = transactionClient()
    mocks.transaction.mockImplementation((callback) => callback(tx))

    await expect(provisionOwnerAndSalon(validInput)).resolves.toEqual({
      authUserId: 'auth-user-1',
      dbUserId: 'db-user-1',
      salonId: 'salon-1',
      slug: 'salon-ambar',
    })

    expect(mocks.createAdminUser).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'safe-password',
      email_confirm: true,
      user_metadata: {
        provisioning_source: 'citas-salon-owner-registration',
        provisioning_state: 'pending',
      },
    })
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'safe-password',
    })
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Ada Owner',
        email: 'ada@example.com',
        phone: '+50760000000',
        role: 'salon_owner',
        supabaseUid: 'auth-user-1',
      },
      select: { id: true },
    })
    expect(tx.salon.create).toHaveBeenCalledWith({
      data: {
        ownerId: 'db-user-1',
        name: 'Salón Ámbar',
        slug: 'salon-ambar',
        phone: '+50761111111',
        status: 'trial',
        planId: 'plan-1',
      },
      select: { id: true, slug: true },
    })
    expect(tx.subscription.create).toHaveBeenCalledWith({
      data: {
        salonId: 'salon-1',
        planId: 'plan-1',
        status: 'trial',
        startDate: new Date('2026-07-23T00:00:00.000Z'),
        endDate: new Date('2026-08-06T00:00:00.000Z'),
      },
    })
  })

  it('retries only a transactional slug P2002 collision with the next candidate', async () => {
    const firstTx = transactionClient()
    const secondTx = transactionClient()
    const collision = Object.assign(new Error('unique'), {
      code: 'P2002',
      meta: { target: ['slug'] },
    })
    mocks.transaction
      .mockImplementationOnce(async (callback) => {
        await callback(firstTx)
        throw collision
      })
      .mockImplementationOnce((callback) => callback(secondTx))

    await expect(provisionOwnerAndSalon(validInput)).resolves.toMatchObject({
      slug: 'salon-ambar-2',
    })
    expect(firstTx.salon.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'salon-ambar' }) }),
    )
    expect(secondTx.salon.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'salon-ambar-2' }) }),
    )
  })

  it('signs out and deletes the pending identity after relational rollback', async () => {
    mocks.transaction.mockRejectedValue(new Error('transaction failed'))

    await provisionOwnerAndSalon(validInput).then(
      () => expect.fail('expected provisioning failure'),
      (error: unknown) => expectProvisioningCode(error, 'INTERNAL'),
    )

    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.deleteAdminUser).toHaveBeenCalledWith('auth-user-1')
  })

  it('compensates a newly created identity when cookie-aware sign-in fails', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: 'invalid_credentials' },
    })

    await provisionOwnerAndSalon(validInput).then(
      () => expect.fail('expected provider failure'),
      (error: unknown) => expectProvisioningCode(error, 'PROVIDER'),
    )

    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.deleteAdminUser).toHaveBeenCalledWith('auth-user-1')
  })

  it('turns a repeated non-slug P2002 submission into conflict and cleans up its identity', async () => {
    mocks.transaction.mockRejectedValue(Object.assign(new Error('unique'), {
      code: 'P2002',
      meta: { target: ['email'] },
    }))

    await provisionOwnerAndSalon(validInput).then(
      () => expect.fail('expected conflict'),
      (error: unknown) => expectProvisioningCode(error, 'CONFLICT'),
    )

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.deleteAdminUser).toHaveBeenCalledWith('auth-user-1')
  })

  it('fails safely when identity deletion is unavailable after rollback', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.transaction.mockRejectedValue(new Error('transaction secret safe-password'))
    mocks.deleteAdminUser.mockRejectedValue(new Error('provider deletion unavailable'))

    await provisionOwnerAndSalon(validInput).then(
      () => expect.fail('expected internal failure'),
      (error: unknown) => expectProvisioningCode(error, 'INTERNAL'),
    )

    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.deleteAdminUser).toHaveBeenCalledWith('auth-user-1')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('safe-password')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('ada@example.com')
    consoleError.mockRestore()
  })

  it('recovers only an app-created pending identity after password proof and no DB user', async () => {
    mocks.createAdminUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists', status: 422 },
    })
    mocks.listAdminUsers.mockResolvedValue({
      data: {
        users: [{
          id: 'pending-auth-user',
          email: 'ada@example.com',
          user_metadata: {
            provisioning_source: 'citas-salon-owner-registration',
            provisioning_state: 'pending',
          },
        }],
      },
      error: null,
    })
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'pending-auth-user' } },
      error: null,
    })
    const tx = transactionClient()
    mocks.transaction.mockImplementation((callback) => callback(tx))

    await expect(provisionOwnerAndSalon(validInput)).resolves.toMatchObject({
      authUserId: 'pending-auth-user',
      salonId: 'salon-1',
    })

    expect(mocks.userFindUnique).toHaveBeenNthCalledWith(2, {
      where: { supabaseUid: 'pending-auth-user' },
      select: { id: true },
    })
    expect(mocks.deleteAdminUser).not.toHaveBeenCalled()
  })

  it('does not recover an unrelated existing auth identity', async () => {
    mocks.createAdminUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists', status: 422 },
    })
    mocks.listAdminUsers.mockResolvedValue({
      data: {
        users: [{
          id: 'existing-auth-user',
          email: 'ada@example.com',
          user_metadata: { provisioning_state: 'pending' },
        }],
      },
      error: null,
    })

    await provisionOwnerAndSalon(validInput).then(
      () => expect.fail('expected conflict'),
      (error: unknown) => expectProvisioningCode(error, 'CONFLICT'),
    )

    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
