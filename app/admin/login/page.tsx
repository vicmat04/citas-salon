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

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Citas Glam</CardTitle>
          <CardDescription>Panel de administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm submitLabel="Ingresar al panel" />
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
