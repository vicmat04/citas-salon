# Exploración: phase6-salon-customers-crm

## Análisis del Estado Actual

- **Navegación del Salón (`app/s/[slug]/(protected)/layout.tsx`):**
  - Actualmente tiene enlaces a `Dashboard`, `Citas`, `Servicios`, `Especialistas`, `Horarios` y `Configuración`.
  - No existe la pestaña ni la ruta `/s/[slug]/customers`.

- **Modelos en la Base de Datos (`prisma/schema.prisma`):**
  - `Customer`: `id`, `salonId`, `fullName`, `phone`, `email`, `notes`, `birthday`, `createdAt`, `updatedAt`.
  - Relación `appointments`: Un `Customer` tiene múltiples registros `Appointment` vinculados en el salón.
  - Cada `Appointment` tiene a su vez `status`, `totalPriceSnapshot`, `totalDurationMinutes`, `appointmentDate`, `startTime`, y `appointmentServices` (servicios consumidos).

## Análisis de Brechas (Reglas de Negocio)

1. **Directorio Unificado de Clientes (`/s/[slug]/customers`):**
   - **Necesidad:** Tabla/lista responsiva con todos los clientes registrados o capturados en el salón.
   - **Búsqueda y Filtros:** Búsqueda en tiempo real por nombre, teléfono o correo electrónico.
   - **Campos Principales:** Nombre completo, teléfono (con botón directo a WhatsApp), correo, total de citas agendadas, total consumido ($) y fecha de última visita.

2. **Ficha de Detalle e Historial del Cliente:**
   - **Necesidad:** Modal o panel lateral al hacer clic en un cliente para ver:
     - Información de contacto (`fullName`, `phone`, `email`, `birthday`).
     - **Métricas de Fidelización:** Total gastado acumulado, cantidad de citas completadas, canceladas y no-shows.
     - **Historial Completo de Citas:** Lista cronológica de todas las citas del cliente en este salón (fecha, hora, especialista, servicios contratados, total y estado).
     - **Notas de Preferencia:** Campo para guardar o editar observaciones del cliente (ej: "Alergia a tintes con amoníaco", "Le gusta el café sin azúcar").

3. **Gestión de Clientes (Creación y Edición Manual):**
   - **Necesidad:** Permitir al dueño crear un cliente manualmente o editar sus datos (`fullName`, `phone`, `email`, `birthday`, `notes`) sin necesidad de esperar a que reserve una cita.

## Propuesta de Cambios Arquitectónicos

1. **Navegación del Salón (`layout.tsx`):**
   - Agregar el enlace "Clientes" (`/s/${slug}/customers`) con el ícono `Users` o `UserCheck`.

2. **Server Actions (`app/actions/customers.ts`):**
   - `createCustomer(formData, slug)`: Crea un cliente manualmente con aislación multi-tenant (`requireSalonOwner`).
   - `updateCustomer(customerId, formData, slug)`: Actualiza los datos personales y notas del cliente.
   - `deleteCustomer(customerId, slug)`: Elimina un cliente (o desvincula citas).

3. **Vistas e Interfaces de Usuario (`app/s/[slug]/(protected)/customers/`):**
   - `page.tsx`: Servidor que obtiene los clientes del salón con agregación de métricas (total citas, total gastado, última fecha).
   - `customers-view.tsx`: Vista interactiva con buscador, tabla/tarjetas `mobile-first` y modal de ficha del cliente.
