import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

import { RegistrationForm } from './registration-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SalonRegistrationPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/10 to-background px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <section className="space-y-6 pt-6">
          <Link href="/" className="text-lg font-bold text-primary">Citas Salón</Link>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">Empieza a gestionar tu salón hoy</h1>
            <p className="text-lg text-muted-foreground">
              Crea tu cuenta, recibe tu período de prueba y entra directamente a tu panel.
            </p>
          </div>
          <ul className="space-y-3 text-sm">
            {['Agenda disponible 24/7', 'Página pública para tus clientes', 'Gestión de servicios y especialistas'].map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {benefit}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes una cuenta? <Link href="/login" className="font-medium text-primary hover:underline">Inicia sesión</Link>
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Registra tu salón</CardTitle>
            <CardDescription>La duración y el plan de prueba se asignan de forma segura al completar el registro.</CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
