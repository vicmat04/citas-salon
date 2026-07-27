import 'server-only'

import prisma from '@/lib/db'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const INVALID_CONFIG_MESSAGE = 'Invalid trial configuration'

export function getTrialConfig(): { planName: string; durationDays: number } {
  const planName = process.env.TRIAL_PLAN_NAME?.trim()
  const rawDuration = process.env.TRIAL_DURATION_DAYS?.trim()

  if (!planName || !rawDuration || !/^[1-9]\d*$/.test(rawDuration)) {
    throw new Error(INVALID_CONFIG_MESSAGE)
  }

  const durationDays = Number(rawDuration)
  if (!Number.isSafeInteger(durationDays)) throw new Error(INVALID_CONFIG_MESSAGE)

  return { planName, durationDays }
}

export function getCalendarDateInTimezone(now: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)))
}

export function addCalendarDays(date: Date, days: number): Date {
  if (!Number.isInteger(days)) throw new TypeError('Calendar days must be an integer')
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  )
}

export function getTrialDaysRemaining(
  endDate: Date,
  timezone: string,
  now = new Date(),
): number {
  const currentDate = getCalendarDateInTimezone(now, timezone)
  const endDay = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  )
  const currentDay = Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate(),
  )

  return Math.max(0, Math.round((endDay - currentDay) / DAY_IN_MILLISECONDS))
}

export function getTrialBannerDays(
  status: string,
  endDate: Date | null,
  timezone: string,
  now = new Date(),
): number | null {
  if (status !== 'trial' || !endDate) return null
  return getTrialDaysRemaining(endDate, timezone, now)
}

export async function getCurrentTrialEndDate(salonId: string): Promise<Date | null> {
  const subscription = await prisma.subscription.findFirst({
    where: { salonId, status: 'trial', endDate: { not: null } },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    select: { endDate: true },
  })

  return subscription?.endDate ?? null
}
