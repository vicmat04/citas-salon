import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAuth } from '@/lib/auth/helpers'
import {
  isInactiveSalonStatus,
  isOperationalSalonStatus,
} from '@/lib/salons/lifecycle'

export const dynamic = 'force-dynamic'

export default async function MySalonsPage() {
  const { dbUser } = await requireAuth()

  if (dbUser.role === 'platform_admin') redirect('/admin/dashboard')
  if (dbUser.role !== 'salon_owner') redirect('/login')

  const salons = [...dbUser.ownedSalons].sort((left, right) =>
    left.name.localeCompare(right.name, 'es'),
  )

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-primary">Panel de propietario</p>
          <h1 className="text-3xl font-bold tracking-tight">Mis salones</h1>
          <p className="text-muted-foreground">
            Selecciona un salón para administrar su agenda y configuración.
          </p>
        </header>

        {salons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 py-10">
              <div>
                <h2 className="text-xl font-semibold">No tienes salones registrados</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Registra tu primer salón para comenzar a gestionar tus citas.
                </p>
              </div>
              <Link href="/registro-salon" className={buttonVariants()}>
                Registrar un salón
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {salons.map((salon) => {
              const operational = isOperationalSalonStatus(salon.status)
              const inactive = isInactiveSalonStatus(salon.status)
              const destination = operational
                ? `/s/${salon.slug}/dashboard`
                : inactive
                  ? `/s/${salon.slug}/inactive`
                  : null

              const card = (
                <Card className={destination ? 'h-full transition-colors hover:border-primary/50' : 'h-full opacity-75'}>
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <CardTitle className="text-lg">{salon.name}</CardTitle>
                    {inactive ? (
                      <Badge variant="destructive">Suspendido</Badge>
                    ) : operational ? (
                      <Badge variant="secondary">
                        {salon.status === 'trial' ? 'Prueba' : 'Activo'}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {operational
                        ? 'Abrir panel del salón'
                        : inactive
                          ? 'Ver información de disponibilidad'
                          : 'Este salón todavía no está disponible.'}
                    </p>
                  </CardContent>
                </Card>
              )

              return destination ? (
                <Link key={salon.id} href={destination} className="block">
                  {card}
                </Link>
              ) : (
                <div key={salon.id}>{card}</div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
