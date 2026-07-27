# Especificación: Actualización del README.md (Citas Salón)

## 1. Título y Descripción del Proyecto

- **Título**: Citas Salón (o MisCitasApp)
- **Subtítulo/Descripción**: Plataforma SaaS para la gestión de reservas y citas de salones de belleza, estéticas y barberías, desarrollada con Next.js y Supabase.

## 2. Características Principales y Roles

El README debe listar las funcionalidades según los roles del sistema:

- **Clientes Finales**: Reserva de citas online, visualización de servicios, selección de staff y disponibilidad.
- **Dueños/Staff (Negocios)**: Gestión de calendario de citas, panel de administración (dashboard), confirmación y cancelación de reservas.
- **SuperAdmin (Opcional)**: Administración general del SaaS, gestión de cuentas de los salones.

## 3. Stack Tecnológico

Enumerar las tecnologías principales de forma clara:

- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript
- **Estilos y Componentes**: Tailwind CSS, shadcn/ui
- **Base de Datos y ORM**: PostgreSQL, Prisma ORM
- **Autenticación y Backend**: Supabase

## 4. Requisitos Previos (Prerequisites)

Especificar lo que el desarrollador necesita tener instalado:

- Node.js (v18+)
- Administrador de paquetes (npm/yarn/pnpm)
- Proyecto en Supabase configurado (con Auth y Base de Datos)

## 5. Configuración de Variables de Entorno

Explicar la creación del archivo `.env` o `.env.local`. Listar las variables requeridas (sin secretos reales):

```env
# Prisma
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="ey..."
```

## 6. Guía de Inicio Rápido (Quickstart)

Proporcionar comandos concretos para ejecutar el proyecto:

```bash
# Clonar el repositorio
git clone <url-repo>
cd citas-salon

# Instalar dependencias
npm install

# Generar cliente de Prisma
npx prisma generate

# Ejecutar el servidor de desarrollo
npm run dev
```

## 7. Comandos de Base de Datos

- `npx prisma db push` o `npx prisma migrate dev` para aplicar cambios en el esquema.
- `npx prisma studio` para explorar la base de datos localmente.

## 8. Estructura de Carpetas

Incluir un árbol simplificado para ayudar a la navegación:

```text
citas-salon/
├── app/            # Rutas de Next.js (App Router)
│   ├── [slug]/     # Páginas de reserva de cada salón
│   ├── admin/      # Panel de control de negocios
│   └── auth/       # Pantallas de login/registro
├── components/     # Componentes UI (React, shadcn)
├── lib/            # Utilidades (config. Prisma, Supabase)
├── prisma/         # Esquema de la base de datos (schema.prisma)
└── docs/           # Documentación técnica adicional
```
