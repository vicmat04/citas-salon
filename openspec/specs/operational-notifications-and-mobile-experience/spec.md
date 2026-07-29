# Especificación de Dominio: Notificaciones Operacionales y Experiencia Móvil Básica

## Propósito

Definir el comportamiento observable de las notificaciones por correo del ciclo de vida de una cita, los recordatorios automáticos resilientes y la experiencia móvil/PWA básica en la plataforma Citas Salón.

## Requisitos y Capacidades

### Requirement: Notificación de creación de cita

El sistema MUST intentar una notificación operacional cuando una cita sea creada correctamente desde el booking público o desde el panel del salón. El mensaje MUST identificar que se trata de una creación y MUST presentar los datos vigentes de la cita de forma legible en móvil. El sistema MUST NOT notificar una creación rechazada o no confirmada.

### Requirement: Notificación de cancelación

El sistema MUST intentar una notificación cuando una cita activa sea cancelada correctamente. El mensaje MUST distinguir la cancelación de otros eventos e identificar la cita afectada. El sistema MUST NOT emitir esta notificación cuando la cancelación sea rechazada.

### Requirement: Notificación de reprogramación

El sistema MUST intentar una notificación cuando una cita sea reprogramada correctamente. El mensaje MUST distinguir la reprogramación y MUST reflejar la fecha, hora, servicio y especialista vigentes cuando esos datos apliquen.

### Requirement: Elegibilidad de destinatarios

Para cada evento y recordatorio, el sistema MUST evaluar cada rol de manera independiente:

- **Cliente:** elegible si la cita contiene un correo válido de cliente.
- **Dueño del salón:** elegible en su correo principal si su preferencia está habilitada.
- **Especialista:** elegible si está asociado a la cita y tiene correo válido.

Una dirección repetida entre roles MUST NOT producir mensajes duplicados equivalentes para el mismo evento. `Salon.notificationEmails` no se utiliza para notificaciones de citas.

### Requirement: Preferencia de notificación del dueño

El dueño del salón MUST poder habilitar o deshabilitar desde la configuración del salón las notificaciones dirigidas a su propio correo principal (`ownerEmailNotificationsEnabled`). La preferencia guardada MUST aplicarse a eventos y recordatorios posteriores y MUST NOT alterar la elegibilidad del cliente ni del especialista.

### Requirement: Manejo seguro de correos ausentes o inválidos

El sistema MUST omitir de forma segura cualquier destinatario sin correo o con correo inválido. La ausencia, invalidez o fallo de entrega de uno o todos los destinatarios MUST NOT revertir, bloquear ni presentar como fallida una creación, cancelación o reprogramación confirmada.

### Requirement: Observabilidad segura del resultado

El sistema MUST registrar o exponer, para usuarios autorizados, el evento, rol destinatario, momento y resultado (`enviada`, `omitida` o `fallida`). La observabilidad MUST NOT revelar el cuerpo completo, direcciones sin enmascarar, credenciales, tokens ni respuestas sensibles del proveedor.

### Requirement: Elegibilidad e idempotencia de recordatorios automáticos

El sistema MUST evaluar recordatorios mediante ejecución programada o en segundo plano (cron).

- Citas elegibles: futuras, vigentes (`pending` o `confirmed`), no canceladas y dentro de la ventana configurada (`APPOINTMENT_REMINDER_HOURS`, por defecto 24 horas).
- Para una misma cita, ventana lógica y destinatario, el sistema MUST producir como máximo un recordatorio efectivo.
- Una reprogramación MUST incrementar `scheduleRevision` e invalidar recordatorios pendientes de revisiones anteriores.
- Un fallo o reintento de recordatorio MUST NOT modificar el estado de la cita.

### Requirement: PWA básica e instalación

La aplicación MUST publicar un manifiesto PWA válido (`/manifest.webmanifest`), iconos móviles, color de tema y metadatos de aplicación web para permitir la instalación en pantalla de inicio. Los flujos críticos MUST seguir funcionando como web normal cuando la instalación no esté disponible.

### Requirement: Exclusiones explícitas

Esta fase MUST NOT exigir Web Push nativo, SMS, WhatsApp Business API automatizado, modo offline avanzado con caché de datos, ni rediseño profundo de SuperAdmin.
