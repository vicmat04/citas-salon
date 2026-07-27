# Propuesta: Gestión de Clientes y CRM del Salón (Fase 6)

## Intención

Brindar al dueño del salón un directorio centralizado de clientes (CRM) que permita conocer el historial completo de visitas, métricas de fidelización, preferencias personales y cumpleaños próximos para fidelizar clientes mediante WhatsApp con promociones personalizadas.

Este módulo incorpora la ruta protegida `/s/[slug]/customers`, búsquedas en tiempo real, creación/edición manual de fichas de cliente con detección de duplicados, y preservación total del historial financiero de citas.

## Decisiones de Producto Confirmadas

1. **Métrica de Total Gastado por Cliente**:
   - El cálculo del valor acumulado por cliente suma única y exclusivamente el total de las citas en estado **`completed`** (Atendidas).

2. **Detección de Cumpleaños Próximos y Promociones por WhatsApp**:
   - El sistema identifica clientes que cumplen años en el mes actual o en los próximos días.
   - Incluye un botón directo de WhatsApp con mensaje personalizado de felicitación y oferta especial del salón.

3. **Prevención de Duplicados**:
   - Al intentar crear o registrar manualmente un cliente con un teléfono o correo existente en el salón, el sistema notifica al dueño ("Este cliente ya existe en tu base de datos") y le permite abrir directamente la ficha del cliente existente.

4. **Preservación Inmutable de Historial**:
   - Si un cliente es eliminado, Prisma desvincula la cita poniendo `customerId = null` (vía `onDelete: SetNull`). El historial de citas y los reportes de ingresos del salón se conservan intactos para siempre.

## Alcance

### Navegación y Nueva Ruta (`/s/[slug]/customers`)

- Enlace "Clientes" en la barra lateral (`layout.tsx`).
- Servidor que consulta todos los `Customer` del salón con sus agregados de citas y métricas.

### Directorio Interactivo de Clientes (`customers-view.tsx`)

- Buscador en tiempo real por Nombre, Teléfono o Correo.
- Pestañas/Filtros: **Todos los Clientes**, **Cumpleañeros del Mes**, **Clientes Frecuentes**.
- Tarjetas y tabla responsiva `mobile-first` con:
  - Nombre del cliente.
  - Teléfono (con acceso directo a WhatsApp).
  - Correo electrónico y fecha de cumpleaños.
  - Citas completadas vs no-shows.
  - Total gastado acumulado ($).
  - Fecha de última visita.

### Ficha Detallada del Cliente (Modal / Panel de Detalle)

- Ficha completa con datos personales, fecha de nacimiento y notas de preferencia (ej: "Le gusta el café sin azúcar", "Alergia a tintes").
- Historial completo de citas del cliente con sus fechas, especialistas, servicios contratados y precios.
- Edición rápida de notas y datos de contacto.

### Server Actions (`app/actions/customers.ts`)

- `createCustomer(formData, slug)`: Crea cliente manual con validación de duplicados.
- `updateCustomer(customerId, formData, slug)`: Actualiza datos y notas de preferencia del cliente.
- `deleteCustomer(customerId, slug)`: Elimina la ficha del cliente conservando el historial de citas.

## Áreas Afectadas

| Área | Cambio |
| --- | --- |
| `app/actions/customers.ts` | Server Actions para crear, editar y eliminar clientes con validaciones multi-tenant. |
| `app/actions/customers.test.ts` | Pruebas de integración de Server Actions de clientes. |
| `app/s/[slug]/(protected)/layout.tsx` | Enlace a la sección de Clientes. |
| `app/s/[slug]/(protected)/customers/page.tsx` | Carga de clientes y métricas reales desde Prisma. |
| `app/s/[slug]/(protected)/customers/customers-view.tsx` | Vista interactiva adaptativa con buscador, métricas y modal de detalle. |
| `app/s/[slug]/(protected)/customers/create-customer-dialog.tsx` | Modal de creación manual de cliente con detección de duplicados. |

## No Objetivos

- Envío masivo de mensajes SMS o mails automáticos sin interacción del dueño.
- Integración con sistemas externos de facturación gubernamental.

## Criterios de Éxito

1. `/s/[slug]/customers` muestra la lista de todos los clientes del salón con su total gastado (solo citas `completed`) y número de visitas.
2. El buscador permite filtrar clientes al instante por nombre, teléfono o correo.
3. Se pueden visualizar los clientes que cumplen años en el mes con botón para feliciarlos por WhatsApp.
4. La creación manual detecta si un teléfono o correo ya existe e informa al dueño.
5. La eliminación de un cliente conserva las citas pasadas en los registros del salón.
6. Todos los 176+ tests existentes y los nuevos tests de clientes pasan al 100% en verde.
