# Diseño Técnico: Gestión de Clientes y CRM del Salón (Fase 6)

## Arquitectura y Flujo de Datos

Este módulo implementa la gestión centralizada de clientes (CRM) del salón, agregando métricas de gasto, historial de citas, cumpleaños y notas de preferencia desde PostgreSQL con Prisma.

```text
+-----------------------------------------------------------------------------------+
|                        Panel del Salón (/s/[slug]/customers)                      |
|      CustomersView (Todos / Cumpleañeros / Frecuentes) | CustomerDetailDialog     |
+-----------------------------------------------------------------------------------+
                                         |
                                (Server Actions)
                                         v
+-----------------------------------------------------------------------------------+
|                         app/actions/customers.ts                                  |
|  - createCustomer(formData, slug)                                                 |
|  - updateCustomer(customerId, formData, slug)                                     |
|  - deleteCustomer(customerId, slug)                                               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                     lib/auth/helpers.ts (requireSalonOwner)                       |
|                       Enforces Tenant Isolation & Security                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       Prisma ORM & PostgreSQL Database                            |
|                 (Customer, Appointment, AppointmentService)                       |
+-----------------------------------------------------------------------------------+
```

---

## Módulos y Responsabilidades

### 1. Server Actions (`app/actions/customers.ts`)

- `createCustomer(formData: FormData, slug: string)`:
  - Ejecuta `requireSalonOwner(slug)`.
  - Extrae `fullName`, `phone`, `email`, `birthday`, `notes`.
  - Verifica si existe `Customer` en `salon.id` por `phone` o `email`. Si existe, retorna:
    `{ conflict: true, existingCustomerId: existing.id, message: 'Ya existe un cliente con este teléfono o correo en tu salón.' }`.
  - Si no existe, crea `Customer`.
  - Revalida `/s/${slug}/customers` y `/s/${slug}/appointments`.

- `updateCustomer(customerId: string, formData: FormData, slug: string)`:
  - Ejecuta `requireSalonOwner(slug)`.
  - Verifica que el cliente pertenezca a `salon.id`.
  - Actualiza `fullName`, `phone`, `email`, `birthday`, `notes`.
  - Revalida la ruta.

- `deleteCustomer(customerId: string, slug: string)`:
  - Ejecuta `requireSalonOwner(slug)`.
  - Elimina el `Customer` de `salon.id`. Prisma desvincula las citas poniendo `customerId = null` sin borrarlas.

---

### 2. Vistas y Componentes de Usuario

#### `app/s/[slug]/(protected)/layout.tsx` (Actualización)

- Agrega la ruta `{ href: '/s/${slug}/customers', label: 'Clientes', icon: UserCheck }` en la navegación de la barra lateral y móvil.

#### `app/s/[slug]/(protected)/customers/page.tsx`

- Servidor: Ejecuta `requireSalonOwner(slug)`.
- Consulta Prisma:
  - Busca todos los `Customer` del salón incluyendo sus `appointments` (`status`, `totalPriceSnapshot`, `appointmentDate`, `appointmentServices`).
- Calcula para cada cliente:
  - `totalSpent`: Suma de `totalPriceSnapshot` donde `status === 'completed'`.
  - `completedCount`: Conteo de citas `completed`.
  - `noShowCount`: Conteo de citas `no_show`.
  - `lastVisit`: Fecha más reciente entre citas `completed` y `confirmed`.
- Renderiza `CustomersView`.

#### `app/s/[slug]/(protected)/customers/customers-view.tsx`

- Componente de cliente responsivo `mobile-first`.
- Buscador interactivo en tiempo real por Nombre, Teléfono o Correo.
- Pestañas rápidas:
  - **Todos los Clientes**: Lista completa.
  - **Cumpleañeros del Mes**: Clientes nacidos en el mes en curso, con botón de felicitación por WhatsApp.
  - **Clientes Frecuentes**: Clientes con 3 o más citas completadas.
- Diálogo de Detalle / Ficha del Cliente (`CustomerDetailDialog`):
  - Ficha de datos personales y notas de preferencia.
  - Historial de todas las citas del cliente en el salón.
  - Formulario de edición rápida.

---

## Plan de Pruebas

- `app/actions/customers.test.ts`: Pruebas de integración para creación de clientes, detección de duplicados, edición de notas, eliminación conservando citas y aislación multi-tenant.
