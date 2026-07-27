import { MessageCircle } from 'lucide-react'

export const TRIAL_UPGRADE_URL = 'https://wa.me/50767005805'

export function TrialBanner({
  salonName,
  remainingDays,
}: {
  salonName: string
  remainingDays: number
}) {
  const days = Math.max(0, Math.floor(remainingDays))

  return (
    <aside className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-amber-950" aria-label="Estado del período de prueba">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">
          {salonName} tiene <strong>{days} {days === 1 ? 'día' : 'días'}</strong> restantes de prueba.
        </p>
        <a
          href={TRIAL_UPGRADE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Mejorar mi plan por WhatsApp
        </a>
      </div>
    </aside>
  )
}
