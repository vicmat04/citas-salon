import { requireSalonOwner } from '@/lib/auth/helpers'
import { SettingsForm } from './settings-form'

export default async function SalonSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { salon } = await requireSalonOwner(slug)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">Ajustes generales de tu salón.</p>
      </div>
      <SettingsForm salon={salon} slug={slug} />
    </div>
  )
}
