# Exploración: Notificaciones Operacionales y UX Móvil (Fase 8)

## 1. Problem framing and goals

Actualmente, el sistema de Citas Salón permite registrar y gestionar reservas (citas) tanto de manera pública como manual. Sin embargo, no emite notificaciones operacionales, dejando al cliente y al negocio sin confirmación asíncrona ni comprobantes transaccionales en tiempo real.

Además, aunque la interfaz móvil ya cuenta con una barra de navegación inferior funcional, el layout general conserva metadatos genéricos ("Create Next App") y la plataforma en dispositivos móviles se sigue comportando estrictamente como una página web.

**Objetivos de la Fase 8:**

- Implementar notificaciones operacionales por correo utilizando la infraestructura base (Mailer + Gmail API OAuth2) desarrollada en la Fase 7.
- Mejorar el pulido visual y técnico de la interfaz móvil (UI/UX) para asimilar la plataforma a una aplicación nativa (App-like feel), integrando metadatos para PWA.

## 2. Current implementation baseline

- **Infraestructura de Correos:** En `app/lib/email/mailer.ts` se encuentra el cliente SMTP basado en la API REST de Gmail (OAuth 2.0). Soporta envíos a múltiples destinatarios e inyección de HTML.
- **Acciones Transaccionales:** Las mutaciones relevantes ya están implementadas y probadas (`actions/booking.ts` para clientes y `actions/appointments.ts` para administradores).
- **Configuración de Salón:** La tabla de salones ya posee el campo `notificationEmails` (Fase 7), que almacena los destinatarios adicionales que el dueño del salón desea copiar.
- **Estado de la Interfaz:**
  - `app/layout.tsx` contiene los metadatos iniciales por defecto.
  - El layout protegido del salón (`app/s/[slug]/(protected)/layout.tsx`) implementa una `<nav>` inferior en mobile.
  - Falta un `manifest.json`, iconos Apple Touch, y meta etiquetas visuales como `theme-color` u `overscroll-behavior`.

## 3. Candidate notification scenarios

Las notificaciones operacionales prioritarias son:

1. **Creación de Cita (Pública - Booking Wizard):** Notificar al cliente con su comprobante y fecha, y alertar al dueño/administradores (`notificationEmails`) del nuevo evento.
2. **Creación de Cita (Manual - Panel Admin):** Similar a la pública; si el administrador ingresa el correo del cliente en el formulario, se le envía un comprobante.
3. **Reprogramación y Cancelación:** Informar a ambas partes si una cita activa sufre un cambio de fecha o se cancela.

## 4. App-like/mobile UX improvement opportunities

- **Identidad PWA (Web App Manifest):** Proveer un `public/manifest.json` y referenciarlo, agregando `theme-color` y `apple-touch-icon` para permitir la instalación de "Añadir a pantalla de inicio".
- **Comportamiento Táctil:** Inyectar CSS global (`overscroll-behavior: none` o similar) para evitar el "bounce" de Safari/Chrome y mejorar la sensación nativa.
- **Afinación de Layouts y Componentes:**
  - Ajustar áreas seguras (`env(safe-area-inset-bottom)`) en el bottom navigation.
  - Actualizar los títulos estáticos y placeholders predeterminados de Next.js.
  - Pulir márgenes, tamaños táctiles de botones (mínimo 44x44px en listas transaccionales) y los estados vacíos.

## 5. Constraints, dependencies, and risks

- **Bloqueo Sincrónico:** Al utilizar Server Actions, enviar múltiples emails de manera síncrona puede degradar los tiempos de respuesta.
  - *Riesgo:* Lentitud al agendar.
  - *Mitigación:* Dependiendo de la versión de Next.js se puede usar `unstable_after` o estrategias asíncronas no bloqueantes para encolar o enviar el correo en segundo plano, devolviendo el control al usuario rápidamente.
- **Dependencias Externas:** El sistema depende del `refresh_token` activo de Google y de una cuenta Gmail no saturada por límites estrictos de envío.
- **Diseño del Correo:** Requerirá armar plantillas HTML legibles tanto en webmail moderno como en dispositivos móviles y que escapen del filtro antispam.

## 6. Open product questions to ask before proposal

1. **Scope Inicial de Citas:** ¿Deseamos abarcar creación, edición (reprogramación) y cancelación simultáneamente, o empezamos únicamente con un robusto flujo de **Creación**?
2. **Recordatorios Automatizados:** ¿Se descartan formalmente para esta iteración los recordatorios (ej. 24 horas antes) al requerir una arquitectura extra de cron jobs?
3. **Manejo de Latencia:** ¿Consideramos aceptable un delay adicional de ~300-500ms al agendar si disparamos el Mailer sincrónicamente, o forzamos un envío desacoplado?

## 7. User decisions captured before proposal

El usuario confirmó las siguientes decisiones de producto para la Fase 8:

1. **Cobertura funcional completa:** La fase debe cubrir creación, cancelación, reprogramación y recordatorios automáticos de citas.
2. **Destinatarios operacionales:** Los correos deben enviarse al cliente y al dueño del salón. Además, se debe notificar al correo del especialista cuando exista.
3. **Control por salón:** El dueño del salón debe poder habilitar o deshabilitar la notificación a su propio correo.
4. **Manejo de correos faltantes:** Si el cliente, dueño o especialista no tienen correo disponible, el sistema debe manejar el caso sin romper la operación principal. La cita no debe fallar solo porque falte un correo destinatario; el sistema debe registrar o exponer el estado de notificación de forma segura.
5. **Recordatorios automáticos incluidos:** La fase debe incluir recordatorios automáticos, asumiendo que se deberá diseñar un mecanismo de ejecución diferida o programada.
6. **UX documentada:** Se debe recomendar y documentar un orden de trabajo para mejorar pantallas críticas con enfoque mobile/app-like.

## 8. PWA explanation for product scope

Una **PWA (Progressive Web App)** es una aplicación web preparada para comportarse más como una app instalada en el teléfono, sin pasar necesariamente por App Store o Play Store.

Para esta plataforma, PWA significa principalmente:

- Poder usar **“Añadir a pantalla de inicio”** con nombre, ícono y color de marca propios.
- Abrirse con una experiencia más limpia, parecida a app, en vez de sentirse como una pestaña genérica del navegador.
- Definir metadatos como `manifest.json`, `theme-color`, íconos móviles y comportamiento visual mobile.
- Preparar el camino para capacidades futuras como funcionamiento offline parcial o notificaciones push, aunque esas capacidades no tienen que entrar en esta fase.

En esta Fase 8, la recomendación es implementar el **paquete PWA básico visual/instalable**, no una PWA avanzada con offline complejo o Web Push nativo.

## 9. Recommended screen order for app-like UX work

Orden recomendado de trabajo visual/mobile:

1. **Booking público del cliente**
   - Es la pantalla con más impacto comercial: convierte visitantes en citas.
   - Debe sentirse rápida, clara y confiable desde móvil.
   - Prioridades: pasos claros, confirmación visible, estados de error, botones táctiles grandes, resumen final de la cita.

2. **Agenda / panel de citas del salón**
   - Es la operación diaria del negocio.
   - Debe facilitar ver, cancelar, reprogramar y confirmar citas sin fricción.
   - Prioridades: acciones táctiles, estados de cita, feedback cuando se envían o fallan notificaciones.

3. **Clientes / CRM del salón**
   - Tiene valor operativo y comercial, pero depende de que la agenda y citas estén claras.
   - Prioridades: lectura mobile, acceso a historial, contacto rápido y datos clave sin pantallas densas.

4. **Configuración del salón**
   - Necesaria para controles de notificación: habilitar/deshabilitar correo al dueño, revisar correo del negocio y destinatarios.
   - Prioridades: claridad de reglas, validación de correos y explicación de qué se notifica.

5. **SuperAdmin**
   - Importante para operación SaaS, pero menos crítico para la experiencia diaria de cada salón.
   - Prioridades: mantener consistencia visual y lectura mobile, sin rediseño profundo en esta fase salvo ajustes globales.

## 10. Recommended first-slice scope and explicit non-goals

**Scope Recomendado:**

- Implementar notificaciones por correo para **creación, cancelación y reprogramación** de citas.
- Incluir recordatorios automáticos de citas con una arquitectura segura y documentada.
- Permitir que el dueño del salón habilite o deshabilite la notificación a su propio correo.
- Notificar al especialista cuando tenga correo configurado.
- Manejar destinatarios faltantes sin bloquear la operación principal.
- Construir plantillas HTML simples y mobile-friendly para cliente, dueño y especialista.
- Añadir metadatos, iconos de Apple/Android y manifiesto básico de PWA.
- Pulir primero booking público y agenda/panel de citas del salón.

**Non-goals explícitos (Fuera de la Fase 8):**

- Web Push Notifications nativas.
- Integración de SMS o WhatsApp Business API automatizada.
- Offline avanzado o sincronización local compleja.
- Rediseño profundo de SuperAdmin fuera de ajustes visuales globales.
- Marketplace/app store packaging nativo.
