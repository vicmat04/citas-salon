import { ReactNode } from "react"
import Link from "next/link"
import { Calendar, LayoutDashboard, Settings, Users, Scissors, Store, Home, LogOut } from "lucide-react"
import { requireSalonOwner } from "@/lib/auth/helpers"
import { signOut } from "@/app/actions/auth"

export default async function SalonLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { dbUser, salon } = await requireSalonOwner(slug)


  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <span className="font-bold text-lg text-primary capitalize">{slug.replace('-', ' ')}</span>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <Link href={`/s/${slug}/dashboard`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link href={`/s/${slug}/appointments`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
            <Calendar className="h-4 w-4" />
            Citas
          </Link>
          <Link href={`/s/${slug}/services`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
            <Scissors className="h-4 w-4" />
            Servicios
          </Link>
          <Link href={`/s/${slug}/specialists`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
            <Users className="h-4 w-4" />
            Especialistas
          </Link>
          <Link href={`/s/${slug}/settings`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground">
            <Settings className="h-4 w-4" />
            Configuración
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col pb-16 md:pb-0">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold md:hidden capitalize">{slug.replace('-', ' ')}</h1>
          <div className="ml-auto flex items-center gap-4">
            <Link href={`/book/${slug}`} target="_blank" className="text-sm font-medium text-primary hover:underline hidden sm:block">
              Ver página pública
            </Link>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              PR
            </div>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around z-50">
        <Link href={`/s/${slug}/dashboard`} className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary">
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] mt-1">Inicio</span>
        </Link>
        <Link href={`/s/${slug}/appointments`} className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary">
          <Calendar className="h-5 w-5" />
          <span className="text-[10px] mt-1">Citas</span>
        </Link>
        <Link href={`/s/${slug}/services`} className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary">
          <Scissors className="h-5 w-5" />
          <span className="text-[10px] mt-1">Servicios</span>
        </Link>
        <Link href={`/s/${slug}/settings`} className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary">
          <Settings className="h-5 w-5" />
          <span className="text-[10px] mt-1">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}
