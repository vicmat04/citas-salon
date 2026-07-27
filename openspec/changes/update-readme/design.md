# Diseño: Actualización del README.md (Citas Salón)

Este documento representa el texto exacto que será aplicado al archivo `README.md` principal del proyecto en la fase Apply.

```markdown
# Citas Salón (MisCitasApp)

Plataforma SaaS para la gestión de reservas y citas de salones de belleza, estéticas y barberías, desarrollada con Next.js y Supabase.

## Características Principales y Roles

- **Clientes Finales**: Reserva pública de citas sin necesidad de registro ni autenticación (solo ingresan nombre, email y teléfono). Visualización de servicios, selección de personal y disponibilidad en tiempo real.
- **Dueños/Staff (Negocios)**: Requieren autenticación. Panel de administración exclusivo para la gestión de su salón (calendario de citas, personal, horarios, servicios y reservas). Sin acceso ni visibilidad a funciones globales del SaaS.
- **SuperAdmin**: Requiere autenticación de nivel administrador. Gestión global del SaaS, salones y suscripciones (completamente aislado e invisible para dueños de salones y clientes).

## Stack Tecnológico

- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript
- **Estilos y Componentes**: Tailwind CSS, shadcn/ui
- **Base de Datos y ORM**: PostgreSQL, Prisma ORM
- **Autenticación y Backend**: Supabase

## Requisitos Previos

- Node.js (v18+)
- Administrador de paquetes (npm / yarn / pnpm)
- Proyecto en Supabase configurado (con Auth y Base de Datos)

## Configuración de Variables de Entorno

Crea un archivo `.env` o `.env.local` en la raíz del proyecto y añade las siguientes variables con tus propias credenciales:

\`\`\`env
# Prisma
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="ey..."
\`\`\`

## Guía de Inicio Rápido

Ejecuta los siguientes comandos para levantar el entorno de desarrollo:

\`\`\`bash
# Clonar el repositorio
git clone <url-repo>
cd citas-salon

# Instalar dependencias
npm install

# Generar cliente de Prisma
npx prisma generate

# Ejecutar el servidor de desarrollo
npm run dev
\`\`\`

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

## Comandos de Base de Datos

- \`npx prisma db push\` o \`npx prisma migrate dev\`: Aplicar cambios en el esquema de la base de datos a tu proyecto local/remoto.
- \`npx prisma studio\`: Explorar la base de datos localmente.

## Estructura de Carpetas

\`\`\`text
citas-salon/
├── app/            # Rutas de Next.js (App Router)
│   ├── [slug]/     # Páginas de reserva de cada salón
│   ├── admin/      # Panel de control de negocios
│   └── auth/       # Pantallas de login/registro
├── components/     # Componentes UI (React, shadcn)
├── lib/            # Utilidades (config. Prisma, Supabase)
├── prisma/         # Esquema de la base de datos (schema.prisma)
└── docs/           # Documentación técnica adicional
\`\`\`
```
