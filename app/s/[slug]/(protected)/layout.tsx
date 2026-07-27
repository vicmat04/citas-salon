import { Calendar, LayoutDashboard, LogOut, Scissors, Settings, Store, Users } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { signOut } from '@/app/actions/auth'
import { TrialBanner } from '@/components/salons/trial-banner'
import { requireSalonOwner } from '@/lib/auth/helpers'
import { getCurrentTrialEndDate, getTrialBannerDays } from '@/lib/salons/trial'

export default async function SalonLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { dbUser, salon } = await requireSalonOwner(slug)

  let remainingTrialDays: number | null = null
  if (salon.status === 'trial') {
    try {
      const endDate = await getCurrentTrialEndDate(salon.id)
      remainingTrialDays = getTrialBannerDays(salon.status, endDate, salon.timezone)
      if (remainingTrialDays === null) {
        console.warn('Trial subscription end date unavailable for a verified trial salon')
      }
    } catch {
      console.warn('Trial subscription lookup unavailable for a verified trial salon')
    }
  }

  const navigation = [
    { href: `/s/${slug}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/s/${slug}/appointments`, label: 'Citas', icon: Calendar },
    { href: `/s/${slug}/services`, label: 'Servicios', icon: Scissors },
    { href: `/s/${slug}/specialists`, label: 'Especialistas', icon: Users },
    { href: `/s/${slug}/settings`, label: 'Configuración', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-bold text-primary">{salon.name}</span>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t p-4">
          <Link href="/my-salons" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
            <Store className="h-4 w-4" />
            Cambiar de salón
          </Link>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex flex-1 flex-col pb-16 md:pb-0">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <h1 className="text-lg font-semibold md:hidden">{salon.name}</h1>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/my-salons" className="text-sm font-medium hover:underline">Mis salones</Link>
            <Link href={`/book/${slug}`} target="_blank" className="hidden text-sm font-medium text-primary hover:underline sm:block">
              Ver página pública
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
              {dbUser.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        {remainingTrialDays !== null && (
          <TrialBanner salonName={salon.name} remainingDays={remainingTrialDays} />
        )}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-card md:hidden">
        {navigation.slice(0, 3).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex h-full w-full flex-col items-center justify-center text-muted-foreground hover:text-primary">
            <Icon className="h-5 w-5" />
            <span className="mt-1 text-[10px]">{label}</span>
          </Link>
        ))}
        <Link href={`/s/${slug}/settings`} className="flex h-full w-full flex-col items-center justify-center text-muted-foreground hover:text-primary">
          <Settings className="h-5 w-5" />
          <span className="mt-1 text-[10px]">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}
