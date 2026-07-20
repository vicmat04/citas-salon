import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { SettingsForm } from "./settings-form"

export default async function SalonSettingsPage({ params }: { params: { slug: string } }) {
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug }
  })

  if (!salon) return notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">Ajustes generales de tu salón.</p>
      </div>

      <SettingsForm salon={salon} slug={params.slug} />
    </div>
  )
}
