# DATABASE_SCHEMA_DRAFT.md

# Esquema de base de datos — Citas Salón

> Motor: PostgreSQL (Supabase)  
> ORM: Prisma  
> Convención: snake_case en DB, camelCase en TypeScript  
> Timezone default: `America/Panama`  
> Moneda default: USD  
> País default: PA | +507

---

## Diagrama de relaciones

```
users
  └── salon_members ──────────────────────► salons
                                              ├── service_categories
                                              ├── services ──────────────────► appointment_services
                                              │     └─── (FK category_id)          └── appointments
                                              ├── specialists                           └── customers
                                              │     ├── specialist_services ◄── services
                                              │     └── specialist_hours
                                              ├── business_hours
                                              ├── blocked_dates
                                              ├── blocked_slots
                                              └── subscriptions ──────────────► plans
```

---

## Tablas completas

### `users`

Administradores de plataforma y propietarios de salones.

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
name          TEXT NOT NULL
email         TEXT UNIQUE NOT NULL
phone         TEXT
role          TEXT NOT NULL CHECK (role IN ('platform_admin', 'salon_owner', 'salon_staff'))
supabase_uid  UUID UNIQUE   -- UID de Supabase Auth (referencia externa)
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Notas:**
- `supabase_uid` vincula el registro con la sesión de Supabase Auth
- La contraseña NO se almacena aquí — Supabase Auth la maneja
- Un solo user puede ser `platform_admin` y no pertenecer a ningún salón
- Un `salon_owner` siempre tiene un registro en `salon_members`

---

### `salons`

Cada salón registrado en la plataforma.

```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
owner_id            UUID NOT NULL REFERENCES users(id)
name                TEXT NOT NULL
slug                TEXT UNIQUE NOT NULL    -- auto-generado, solo admin puede editar
slogan              TEXT
phone               TEXT                   -- teléfono del salón para WhatsApp
email               TEXT
address             TEXT
logo_url            TEXT                   -- Supabase Storage URL
theme_color         TEXT NOT NULL DEFAULT '#D4AF37'  -- hex del color de tema
country_code        TEXT NOT NULL DEFAULT 'PA'
phone_country_code  TEXT NOT NULL DEFAULT '+507'
currency            TEXT NOT NULL DEFAULT 'USD'
timezone            TEXT NOT NULL DEFAULT 'America/Panama'
status              TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'trial', 'active', 'suspended', 'cancelled'))
booking_range_days  INT NOT NULL DEFAULT 15   -- cuántos días hacia adelante puede reservar el cliente
min_advance_hours   INT NOT NULL DEFAULT 1    -- anticipación mínima en horas
plan_id             UUID REFERENCES plans(id)
admin_notes         TEXT                       -- notas internas del admin (no visibles al propietario)
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**
```sql
CREATE UNIQUE INDEX salons_slug_idx ON salons(slug);
CREATE INDEX salons_status_idx ON salons(status);
CREATE INDEX salons_owner_id_idx ON salons(owner_id);
```

**Slug generation:**
```
"Gloss & Glow"      → "gloss-glow"
"Salón Bella"       → "salon-bella"
"Salón Bella" (dup) → "salon-bella-2"
```

---

### `salon_members`

Relación entre usuarios y salones con rol interno.

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
role       TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'receptionist', 'specialist'))
created_at TIMESTAMPTZ NOT NULL DEFAULT now()

CONSTRAINT salon_members_unique UNIQUE (salon_id, user_id)
```

**Notas:**
- En el MVP solo se usa el rol `owner`
- Los roles `manager`, `receptionist`, `specialist` son para Fase 2

---

### `service_categories`

Categorías de servicios del salón (Cabello, Uñas, Rostro, etc.)

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
name       TEXT NOT NULL
sort_order INT NOT NULL DEFAULT 0
is_active  BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**
```sql
CREATE INDEX service_categories_salon_id_idx ON service_categories(salon_id);
```

---

### `services`

Servicios ofrecidos por el salón.

```sql
id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id         UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
category_id      UUID REFERENCES service_categories(id) ON DELETE SET NULL
name             TEXT NOT NULL
description      TEXT
price            DECIMAL(10,2) NOT NULL DEFAULT 0
duration_minutes INT NOT NULL DEFAULT 30
buffer_minutes   INT NOT NULL DEFAULT 0   -- tiempo de preparación post-cita (limpieza, etc.)
is_active        BOOLEAN NOT NULL DEFAULT true
created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**
```sql
CREATE INDEX services_salon_id_idx ON services(salon_id);
CREATE INDEX services_category_id_idx ON services(category_id);
```

**Notas:**
- `buffer_minutes` bloquea el horario post-cita pero NO se muestra al cliente como parte del tiempo del servicio
- La duración visible para el cliente es solo `duration_minutes`
- `end_time` de una cita = `start_time + sum(duration_minutes) + sum(buffer_minutes)`

---

### `specialists`

Especialistas del salón.

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
name       TEXT NOT NULL
phone      TEXT
email      TEXT
specialty  TEXT
photo_url  TEXT              -- Supabase Storage URL
is_active  BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**
```sql
CREATE INDEX specialists_salon_id_idx ON specialists(salon_id);
```

---

### `specialist_services`

Qué especialista puede realizar qué servicio (many-to-many).

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id      UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE
service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()

CONSTRAINT specialist_services_unique UNIQUE (specialist_id, service_id)
```

**Notas:**
- Si un servicio no tiene ningún especialista asignado, cualquier especialista puede realizarlo
- Si un servicio tiene especialistas asignados, solo ellos aparecen en el formulario público

---

### `business_hours`

Horarios laborales del salón por día de semana.

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id     UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)
             -- 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
open_time    TIME NOT NULL    -- '09:00:00'
close_time   TIME NOT NULL    -- '19:00:00'
is_open      BOOLEAN NOT NULL DEFAULT true
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()

CONSTRAINT business_hours_unique UNIQUE (salon_id, day_of_week)
```

**Seed típico para un salón:**
```sql
-- Martes a Sábado: 09:00 - 19:00
INSERT INTO business_hours (salon_id, day_of_week, open_time, close_time, is_open)
VALUES
  (salon_id, 0, '09:00', '19:00', false),  -- Domingo: cerrado
  (salon_id, 1, '09:00', '19:00', false),  -- Lunes: cerrado
  (salon_id, 2, '09:00', '19:00', true),   -- Martes
  (salon_id, 3, '09:00', '19:00', true),   -- Miércoles
  (salon_id, 4, '09:00', '19:00', true),   -- Jueves
  (salon_id, 5, '09:00', '19:00', true),   -- Viernes
  (salon_id, 6, '09:00', '17:00', true);   -- Sábado: horario reducido
```

---

### `specialist_hours`

Horarios individuales por especialista. Override del `business_hours` general.

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id      UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE
day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)
open_time     TIME NOT NULL
close_time    TIME NOT NULL
is_available  BOOLEAN NOT NULL DEFAULT true
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()

CONSTRAINT specialist_hours_unique UNIQUE (specialist_id, day_of_week)
```

**Lógica de prioridad:**
```
Si specialist_hours existe para ese día:
  → Usar horario del especialista
  → Si is_available = false → especialista no trabaja ese día
Sino:
  → Usar business_hours del salón
```

---

### `blocked_dates`

Fechas completas bloqueadas (día entero, sin disponibilidad).

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id      UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
specialist_id UUID REFERENCES specialists(id) ON DELETE CASCADE  -- NULL = bloquea salón completo
date          DATE NOT NULL
reason        TEXT
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Lógica:**
- `specialist_id = NULL` → toda la fecha está bloqueada para el salón (vacaciones, feriado)
- `specialist_id = uuid` → solo ese especialista está bloqueado ese día

**Índices:**
```sql
CREATE INDEX blocked_dates_salon_date_idx ON blocked_dates(salon_id, date);
```

---

### `blocked_slots`

Horarios específicos bloqueados dentro de un día.

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id      UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
specialist_id UUID REFERENCES specialists(id) ON DELETE CASCADE  -- NULL = bloquea todo el salón
date          DATE NOT NULL
start_time    TIME NOT NULL
end_time      TIME NOT NULL
reason        TEXT
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**
```sql
CREATE INDEX blocked_slots_salon_date_idx ON blocked_slots(salon_id, date);
```

---

### `customers`

Clientes de cada salón. Cada salón tiene su propia base de clientes.

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
full_name  TEXT NOT NULL
phone      TEXT NOT NULL
email      TEXT
notes      TEXT    -- notas internas del salón sobre el cliente
birthday   DATE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**
```sql
CREATE INDEX customers_salon_id_idx ON customers(salon_id);
CREATE INDEX customers_phone_idx ON customers(salon_id, phone);
```

**Notas:**
- El cliente final NO tiene cuenta — sus datos se guardan aquí al crear la primera cita
- Si el mismo teléfono ya existe en el salón, se puede vincular la cita al cliente existente
- Los datos del cliente son propios del salón — no se comparten entre salones

---

### `appointments`

Citas agendadas.

```sql
id                      UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id                UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL
specialist_id           UUID REFERENCES specialists(id) ON DELETE SET NULL  -- nullable
appointment_date        DATE NOT NULL
start_time              TIME NOT NULL
end_time                TIME NOT NULL           -- calculado: start + sum(durations) + sum(buffers)
status                  TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled'))
source                  TEXT NOT NULL DEFAULT 'public_form'
                        CHECK (source IN ('public_form', 'owner_panel', 'admin_panel'))
customer_notes          TEXT    -- notas ingresadas por el cliente al reservar
internal_notes          TEXT    -- notas internas del propietario
is_special_event        BOOLEAN NOT NULL DEFAULT false  -- bypass de restricciones de horario
total_price_snapshot    DECIMAL(10,2) NOT NULL DEFAULT 0   -- precio total al momento de crear la cita
total_duration_minutes  INT NOT NULL DEFAULT 0             -- duración total (sin buffer) al momento de crear
created_by_user_id      UUID REFERENCES users(id) ON DELETE SET NULL  -- NULL si fue creada por cliente final
created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**
```sql
CREATE INDEX appointments_salon_date_idx ON appointments(salon_id, appointment_date);
CREATE INDEX appointments_specialist_date_idx ON appointments(specialist_id, appointment_date);
CREATE INDEX appointments_status_idx ON appointments(salon_id, status);
CREATE INDEX appointments_customer_idx ON appointments(customer_id);
```

**Notas sobre snapshots:**
- `total_price_snapshot` y `total_duration_minutes` se calculan al crear la cita
- Si el propietario cambia el precio de un servicio después, las citas antiguas mantienen el precio original
- El detalle por servicio está en `appointment_services`

---

### `appointment_services`

Servicios incluidos en una cita (relación many-to-many normalizada).

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
appointment_id    UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE
service_id        UUID REFERENCES services(id) ON DELETE SET NULL  -- SET NULL si el servicio se elimina
price_snapshot    DECIMAL(10,2) NOT NULL    -- precio del servicio al momento de crear la cita
duration_snapshot INT NOT NULL              -- duración en minutos al momento de crear la cita
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Notas:**
- `price_snapshot` y `duration_snapshot` conservan los valores al momento de crear la cita
- Si el propietario modifica el servicio después, las citas históricas no se alteran

---

### `plans`

Planes de suscripción de la plataforma (gestionados manualmente en el MVP).

```sql
id                          UUID PRIMARY KEY DEFAULT gen_random_uuid()
name                        TEXT NOT NULL
price                       DECIMAL(10,2) NOT NULL DEFAULT 0
max_specialists             INT               -- NULL = ilimitado
max_appointments_per_month  INT               -- NULL = ilimitado
has_reports                 BOOLEAN NOT NULL DEFAULT false
has_whatsapp_automation     BOOLEAN NOT NULL DEFAULT false
is_active                   BOOLEAN NOT NULL DEFAULT true
created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Seed de planes iniciales:**
```sql
INSERT INTO plans (name, price, max_specialists, max_appointments_per_month, has_reports) VALUES
  ('Free Trial', 0, 3, 50, false),
  ('Básico', 29.99, 5, 200, false),
  ('Pro', 59.99, NULL, NULL, true);
```

---

### `subscriptions`

Suscripción activa de cada salón a un plan.

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE
plan_id    UUID NOT NULL REFERENCES plans(id)
status     TEXT NOT NULL DEFAULT 'trial'
           CHECK (status IN ('trial', 'active', 'past_due', 'cancelled'))
start_date DATE NOT NULL
end_date   DATE    -- NULL = sin expiración (manual)
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

### `access_tokens`

Tokens de invitación y recuperación de acceso.

```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id   UUID REFERENCES salons(id) ON DELETE CASCADE
user_id    UUID REFERENCES users(id) ON DELETE CASCADE
token_hash TEXT NOT NULL UNIQUE    -- SHA-256 del token real (nunca almacenar el token en claro)
purpose    TEXT NOT NULL CHECK (purpose IN ('invitation', 'recovery', 'magic_link'))
expires_at TIMESTAMPTZ NOT NULL
used_at    TIMESTAMPTZ             -- NULL = no usado aún
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Reglas:**
- Expiración máxima de invitación: 48 horas
- Expiración de magic link (Fase 2): 15 minutos
- Un token usado (`used_at IS NOT NULL`) no puede reutilizarse

---

### `audit_logs`

Log de acciones importantes para trazabilidad.

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
salon_id    UUID REFERENCES salons(id) ON DELETE SET NULL
user_id     UUID REFERENCES users(id) ON DELETE SET NULL
action      TEXT NOT NULL    -- 'create_appointment', 'cancel_appointment', 'update_salon_status', etc.
entity_type TEXT             -- 'appointment', 'service', 'specialist', 'salon', etc.
entity_id   UUID
metadata    JSONB            -- datos adicionales del evento (diff, valores previos, etc.)
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Índices:**
```sql
CREATE INDEX audit_logs_salon_idx ON audit_logs(salon_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
```

---

## Reglas de datos

| Regla | Descripción |
|-------|-------------|
| `salon_id` obligatorio | Toda tabla operativa DEBE tener `salon_id` |
| Snapshots en citas | `price_snapshot`, `duration_snapshot`, `total_price_snapshot`, `total_duration_minutes` al momento de crear |
| `end_time` calculado | `end_time = start_time + sum(duration) + sum(buffer)` — se almacena, no se calcula en runtime |
| Tokens hasheados | `access_tokens.token_hash` es SHA-256, nunca el token en claro |
| Fechas en UTC | Todas las fechas en DB son UTC. La conversión a timezone del salón es responsabilidad de la capa de aplicación |
| Slug inmutable | El propietario no puede cambiar su slug; solo el admin puede hacerlo |

---

## Prisma Schema (referencia)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // requerido por Supabase
}

model User {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  phone       String?
  role        String   // 'platform_admin' | 'salon_owner' | 'salon_staff'
  supabaseUid String?  @unique @map("supabase_uid")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  ownedSalons    Salon[]
  salonMemberships SalonMember[]
  createdAppointments Appointment[]
  accessTokens   AccessToken[]
  auditLogs      AuditLog[]

  @@map("users")
}

model Salon {
  id                 String   @id @default(uuid())
  ownerId            String   @map("owner_id")
  name               String
  slug               String   @unique
  slogan             String?
  phone              String?
  email              String?
  address            String?
  logoUrl            String?  @map("logo_url")
  themeColor         String   @default("#D4AF37") @map("theme_color")
  countryCode        String   @default("PA") @map("country_code")
  phoneCountryCode   String   @default("+507") @map("phone_country_code")
  currency           String   @default("USD")
  timezone           String   @default("America/Panama")
  status             String   @default("pending")
  bookingRangeDays   Int      @default(15) @map("booking_range_days")
  minAdvanceHours    Int      @default(1) @map("min_advance_hours")
  planId             String?  @map("plan_id")
  adminNotes         String?  @map("admin_notes")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  owner              User     @relation(fields: [ownerId], references: [id])
  plan               Plan?    @relation(fields: [planId], references: [id])
  members            SalonMember[]
  categories         ServiceCategory[]
  services           Service[]
  specialists        Specialist[]
  businessHours      BusinessHours[]
  blockedDates       BlockedDate[]
  blockedSlots       BlockedSlot[]
  customers          Customer[]
  appointments       Appointment[]
  subscriptions      Subscription[]
  accessTokens       AccessToken[]
  auditLogs          AuditLog[]

  @@map("salons")
}
```

> El schema completo de Prisma se genera durante la Fase 1 (setup del proyecto).