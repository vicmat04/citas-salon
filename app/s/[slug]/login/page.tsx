import Link from 'next/link'

import { LoginForm } from '@/app/login/login-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { sanitizeTenantNext } from '@/lib/auth/tenant-next'

export default async function SalonLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const { slug } = await params
  const requestedNext = (await searchParams).next
  const next = sanitizeTenantNext(
    Array.isArray(requestedNext) ? requestedNext[0] ?? null : requestedNext ?? null,
    slug,
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold capitalize text-primary">
            {slug.replaceAll('-', ' ')}
          </CardTitle>
          <CardDescription>Acceso para propietarios</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            tenantSlug={slug}
            next={next}
            submitLabel="Ingresar al panel"
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            Volver a la plataforma
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
