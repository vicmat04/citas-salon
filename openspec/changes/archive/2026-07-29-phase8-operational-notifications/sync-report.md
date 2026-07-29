# Reporte de Sincronización: Notificaciones Operacionales y Experiencia Móvil (Fase 8)

## Estado de Sincronización

- **Cambio:** `phase8-operational-notifications`
- **Fecha:** 2026-07-29
- **Resultado:** Completado exitosamente.

## Especificaciones Sincronizadas

Se creó/actualizó la especificación de dominio en:

- `openspec/specs/operational-notifications-and-mobile-experience/spec.md`

## Resumen de Capacidades Promovidas

1. **Notificaciones por correo del ciclo de vida de cita:** creación pública/manual, cancelación y reprogramación con outbox persistente y desensamblado no bloqueante.
2. **Elegibilidad y preferencias:** cliente, dueño (con toggle de habilitación/deshabilitación) y especialista. Exclusión explícita de `notificationEmails` para eventos de citas.
3. **Manejo resiliente de correos:** fallos o ausencias de correo nunca revierten ni bloquean transacciones de citas.
4. **Recordatorios automáticos:** cron autenticado, ventana configurable (24h default), idempotencia por `scheduleRevision` y `eventKey`, y purga de retención.
5. **Observabilidad segura:** proyección enmascarada para el panel del salón sin exposición de PII ni secretos.
6. **Infraestructura PWA básica:** manifest, iconos, metadatos móviles y compatibilidad instalable progresiva.

## Nota de Alcance para Fase 9

El rediseño visual profundo tipo app nativa (viewport fijo `100dvh`, bottom sheets, controles segmentados e interacciones táctiles avanzadas) fue diferido explícitamente a una nueva **Fase 9**, conservando en Fase 8 la base técnica y la infraestructura de notificaciones completa.
