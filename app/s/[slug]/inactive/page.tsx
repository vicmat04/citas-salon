import { MessageCircle, Store } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import prisma from '@/lib/db'
import {
  isInactiveSalonStatus,
  isOperationalSalonStatus,
} from '@/lib/salons/lifecycle'

export const dynamic = 'force-dynamic'

export default async function InactiveSalonPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true, slug: true, status: true },
  })

  if (!salon) notFound()
  if (isOperationalSalonStatus(salon.status)) redirect(`/${salon.slug}`)
  if (!isInactiveSalonStatus(salon.status)) notFound()

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="items-center space-y-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Store className="size-8" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">{salon.name} no está disponible</CardTitle>
            <p className="text-muted-foreground">
              Este salón no está disponible temporalmente y no puede recibir reservas en este momento.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Si administras este salón y necesitas ayuda, comunícate con la administración de Citas Salón.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="https://wa.me/50767005805"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants()}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Contactar por WhatsApp
            </Link>
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              Volver al inicio
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
