import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ findFirst: vi.fn() }))

vi.mock('@/lib/db', () => ({
  default: { subscription: { findFirst: mocks.findFirst } },
}))

import {
  addCalendarDays,
  getCalendarDateInTimezone,
  getCurrentTrialEndDate,
  getTrialBannerDays,
  getTrialConfig,
  getTrialDaysRemaining,
} from './trial'

const originalPlanName = process.env.TRIAL_PLAN_NAME
const originalDuration = process.env.TRIAL_DURATION_DAYS

afterEach(() => {
  if (originalPlanName === undefined) delete process.env.TRIAL_PLAN_NAME
  else process.env.TRIAL_PLAN_NAME = originalPlanName
  if (originalDuration === undefined) delete process.env.TRIAL_DURATION_DAYS
  else process.env.TRIAL_DURATION_DAYS = originalDuration
})

describe('trusted trial configuration', () => {
  it('returns trimmed trusted server configuration', () => {
    process.env.TRIAL_PLAN_NAME = ' Free Trial '
    process.env.TRIAL_DURATION_DAYS = '14'

    expect(getTrialConfig()).toEqual({ planName: 'Free Trial', durationDays: 14 })
  })

  it.each([
    [undefined, '14'],
    ['', '14'],
    ['Free Trial', undefined],
    ['Free Trial', '0'],
    ['Free Trial', '-1'],
    ['Free Trial', '1.5'],
    ['Free Trial', 'abc'],
  ])('rejects invalid plan/duration configuration', (planName, duration) => {
    if (planName === undefined) delete process.env.TRIAL_PLAN_NAME
    else process.env.TRIAL_PLAN_NAME = planName
    if (duration === undefined) delete process.env.TRIAL_DURATION_DAYS
    else process.env.TRIAL_DURATION_DAYS = duration

    expect(() => getTrialConfig()).toThrow('Invalid trial configuration')
  })
})

describe('trial calendar helpers', () => {
  it('derives the current calendar date in Panama rather than UTC', () => {
    expect(
      getCalendarDateInTimezone(
        new Date('2026-07-23T04:30:00.000Z'),
        'America/Panama',
      ).toISOString(),
    ).toBe('2026-07-22T00:00:00.000Z')
  })

  it('adds calendar days using SQL-DATE-compatible UTC parts', () => {
    expect(addCalendarDays(new Date('2026-07-23T00:00:00.000Z'), 10).toISOString()).toBe(
      '2026-08-02T00:00:00.000Z',
    )
  })

  it('counts Panama calendar-day boundaries from a SQL DATE', () => {
    expect(
      getTrialDaysRemaining(
        new Date('2026-07-23T00:00:00.000Z'),
        'America/Panama',
        new Date('2026-07-23T04:30:00.000Z'),
      ),
    ).toBe(1)
  })

  it('returns zero on the end date and after expiry', () => {
    const endDate = new Date('2026-07-23T00:00:00.000Z')
    expect(
      getTrialDaysRemaining(endDate, 'America/Panama', new Date('2026-07-23T15:00:00Z')),
    ).toBe(0)
    expect(
      getTrialDaysRemaining(endDate, 'America/Panama', new Date('2026-07-25T15:00:00Z')),
    ).toBe(0)
  })

  it('uses calendar days across a DST transition', () => {
    const endDate = new Date('2026-03-09T00:00:00.000Z')
    expect(
      getTrialDaysRemaining(endDate, 'America/New_York', new Date('2026-03-08T04:30:00Z')),
    ).toBe(2)
    expect(
      getTrialDaysRemaining(endDate, 'America/New_York', new Date('2026-03-09T03:30:00Z')),
    ).toBe(1)
  })

  it('returns banner days only for trial salons with an authoritative end date', () => {
    const endDate = new Date('2026-07-28T00:00:00.000Z')
    const now = new Date('2026-07-23T15:00:00.000Z')

    expect(getTrialBannerDays('trial', endDate, 'America/Panama', now)).toBe(5)
    expect(getTrialBannerDays('active', endDate, 'America/Panama', now)).toBeNull()
    expect(getTrialBannerDays('trial', null, 'America/Panama', now)).toBeNull()
  })
})

describe('getCurrentTrialEndDate', () => {
  it('returns the authoritative newest trial end date', async () => {
    const endDate = new Date('2026-08-06T00:00:00.000Z')
    mocks.findFirst.mockResolvedValue({ endDate })

    await expect(getCurrentTrialEndDate('salon-1')).resolves.toBe(endDate)
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { salonId: 'salon-1', status: 'trial', endDate: { not: null } },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      select: { endDate: true },
    })
  })

  it.each([null, { endDate: null }])('does not invent a missing trial end date', async (record) => {
    mocks.findFirst.mockResolvedValue(record)
    await expect(getCurrentTrialEndDate('salon-1')).resolves.toBeNull()
  })
})
