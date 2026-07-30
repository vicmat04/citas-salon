# Tareas de Implementación: Fase 9 (Rediseño Móvil Tipo App)

## Review Workload Forecast

| Field | Value |
| --- | --- |
| Estimated changed lines | 800–1,200 líneas |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 Layout + Booking → PR 2 Agenda + Bottom Sheets → PR 3 CRM + Settings → PR 4 Servicios + Especialistas |
| Delivery strategy | four-slice-chain-approved |

## Slice 1 — Layout Base + Booking Público (PR 1)

- [x] **GREEN:** Actualizar `app/s/[slug]/(protected)/layout.tsx` a estructura de Viewport Fijo `h-dvh` con contenedor central deslizable y safe-area insets. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Rediseñar `app/book/[slug]/booking-wizard.tsx` y confirmación con selector táctil de servicios, franjas de hora estilo app y barra de resumen fija inferior. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Ejecutar `npm test`, `npx tsc --noEmit` y `npm run build`. <!-- sdd-owner: implementation -->

## Slice 2 — Agenda de Citas + Bottom Sheets (PR 2)

- [x] **GREEN:** Rediseñar `app/s/[slug]/(protected)/appointments/appointments-view.tsx` sustituyendo modales por Bottom Sheets (`Sheet side="bottom"`) en móvil para Reprogramación, Cancelación, Notas y Cita Manual. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Reemplazar desplegables `<select>` en la agenda por controles segmentados de toque directo para filtros de estado y especialista. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Ejecutar `npm test` y pruebas focalizadas de agenda. <!-- sdd-owner: implementation -->

## Slice 3 — CRM + Configuración del Salón (PR 3)

- [x] **GREEN:** Rediseñar `app/s/[slug]/(protected)/customers/customers-view.tsx` como Inset List móvil con accesos táctiles rápidos a WhatsApp e historial. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Rediseñar `app/s/[slug]/(protected)/settings/settings-form.tsx` con controles de interruptor (Switch/Toggle) estilo iOS/Android. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Ejecutar `npm test` y verificar tipos. <!-- sdd-owner: implementation -->

## Slice 4 — Servicios, Especialistas y Pulido Final (PR 4)

- [x] **GREEN:** Adaptar `app/s/[slug]/(protected)/services/page.tsx` y `specialists/page.tsx` al patrón de listas agrupadas app-like. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Agregar micro-interacciones de presión (`active:scale-[0.98]`) y estilos globales en `app/globals.css`. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Ejecutar la suite completa (`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`). <!-- sdd-owner: implementation -->
