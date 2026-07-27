# Especificación: Gestión de Clientes y CRM del Salón (Fase 6)

## Propósito

Definir las reglas de validación, cálculo de métricas de fidelización, detección de duplicados, gestión de cumpleaños y contratos API para el módulo CRM de clientes del salón.

---

## Requisitos y Especificaciones Ejecutables

### 1. Cálculo de Métricas por Cliente

#### 1.1 Total Gastado y Conteo de Visitas

- **Total Gastado (`totalSpent`):**
  - Suma de `totalPriceSnapshot` de todas las citas del cliente en este salón donde `status === 'completed'`.
  - Citas en estado `confirmed`, `cancelled`, `pending` o `no_show` NO se incluyen en la suma del total gastado.
- **Conteo de Citas Completadas (`completedCount`):**
  - Conteo de citas del cliente con `status === 'completed'`.
- **Conteo de No-Shows (`noShowCount`):**
  - Conteo de citas del cliente con `status === 'no_show'`.
- **Última Visita (`lastVisitDate`):**
  - Fecha más reciente (`appointmentDate`) de una cita en estado `completed` o `confirmed`.

---

### 2. Creación y Edición de Clientes (`createCustomer` & `updateCustomer`)

#### 2.1 Creación Manual de Cliente (`createCustomer`)

- **Entradas:** `salonSlug`, `fullName` (min 2 caracteres), `phone` (min 7 caracteres), `email` (opcional), `birthday` (YYYY-MM-DD opcional), `notes` (opcional).
- **Validación de Duplicados:**
  - Buscar `Customer` existente en `salonId` donde `phone === input.phone` o `email === input.email`.
  - Si ya existe, retornar `{ conflict: true, existingCustomerId: customer.id, message: 'Ya existe un cliente registrado con este teléfono o correo electrónico en tu salón.' }`.
  - Si no existe, crear `Customer` y retornar `{ success: true, customer }`.

#### 2.2 Actualización de Cliente (`updateCustomer`)

- **Entradas:** `customerId`, `salonSlug`, `fullName`, `phone`, `email`, `birthday`, `notes`.
- **Comportamiento:** Actualiza los datos y notas de preferencia del cliente asociadas al `salonId`.

#### 2.3 Eliminación Conservando Historial (`deleteCustomer`)

- **Entradas:** `customerId`, `salonSlug`.
- **Comportamiento:** Elimina el registro `Customer`. Las citas preexistentes del cliente permanecen en la BD con `customerId = null` (cumpliendo la regla `onDelete: SetNull`).

---

### 3. Filtros y Felicitación de Cumpleaños

#### 3.1 Filtro de Cumpleañeros del Mes

- Identifica clientes cuyo mes de `birthday` coincida con el mes actual (o días próximos).
- Genera el enlace de WhatsApp:
  `"¡Hola {fullName}! De parte de {salonName} te deseamos un muy feliz cumpleaños 🎉🎂. Queremos regalarte un descuento especial en tu próxima visita. ¡Agenda tu cita hoy!"`.

---

## Seguridad y Aislación Multi-Tenant

- Todas las Server Actions DEBEN ejecutar `requireSalonOwner(slug)` para asegurar que el cliente pertenezca al salón del usuario autenticado.
- Todas las consultas y mutaciones DEBEN incluir `salonId` en las cláusulas `where`.
