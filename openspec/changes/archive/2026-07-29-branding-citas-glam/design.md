# Diseño Técnico: Identidad de Marca "Citas Glam"

## 1. Mapeo de Textos y Reemplazos

- **Metadatos globales (`app/layout.tsx`):**
  - Título predeterminado: `Citas Glam | Sistema de Citas y Reservas`
  - `applicationName`: `Citas Glam`
  - `appleWebApp.title`: `Citas Glam`
- **Manifiesto PWA (`app/manifest.ts`):**
  - `name`: `Citas Glam`
  - `short_name`: `Citas Glam`
- **Interfaz del Sistema:**
  - Landing page (`app/page.tsx`): Encabezado y Footer `Citas Glam`.
  - Admin (`app/admin/(protected)/layout.tsx`): Logo `Citas Glam Admin`.
  - Login/Registro (`app/login/page.tsx`, `app/admin/login/page.tsx`, `app/registro-salon/page.tsx`): Títulos de tarjeta `Citas Glam`.
  - Inactivo (`app/s/[slug]/inactive/page.tsx`): Firma de contacto `Citas Glam`.
- **Plantillas de Correo (`lib/email/mailer.ts` y `lib/notifications/templates.ts`):**
  - Remitente y firma HTML `Citas Glam`.
  - Asuntos de correo: `Citas Glam - Confirmación de Cita`, etc.
- **Catálogo Funcional (`docs/CATALOGO_FUNCIONAL_REFERENCIA.md`):**
  - Referencias a la plataforma SaaS **Citas Glam**.

## 2. Pruebas Automatizadas

Actualizar las aserciones de cadenas en `app/pwa-metadata.test.ts` y `lib/notifications/templates.test.ts` para que busquen "Citas Glam" en lugar de "Citas Salón".
