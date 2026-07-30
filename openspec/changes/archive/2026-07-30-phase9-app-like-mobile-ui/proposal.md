# Propuesta: Rediseño de Interfaz Móvil Tipo App - Citas Glam (Fase 9)

## Intención y problema

Aunque la plataforma cuenta con funcionalidad operacional completa y metadatos PWA instalables (Fase 8), la interfaz de usuario en dispositivos móviles sigue comportándose y visualizándose como una página web tradicional:

- Scroll global de la ventana en lugar de un viewport fijo.
- Modales centrados (`<Dialog>`) incómodos para la zona del pulgar en móviles.
- Desplegables HTML `<select>` estándar e inputs de escritorio.
- Tarjetas con bordes pesados en lugar de listas agrupadas estilo app nativa (iOS/Material Inset Lists).

La **Fase 9** transformará la experiencia de usuario (UI/UX) de **Citas Glam** en dispositivos móviles para que se sienta como una aplicación nativa instalada, tomando como referencia el diseño visual de la captura objetivo (`Captura de pantalla 2026-07-28 135930.png`).

## Objetivos

1. **Viewport Fijo Móvil (`100dvh` / `h-dvh`):** Fijar la pantalla en móviles con encabezado superior e inferior fijos, dejando únicamente el área central con desplazamiento suave (`overflow-y-auto`).
2. **Bottom Sheets en Móvil (`Sheet side="bottom"`):** Sustituir los modales de escritorio por paneles que emergen desde la parte inferior de la pantalla para acciones rápidas (reprogramar, cancelar, notas, filtros).
3. **Controles Táctiles y Controles Segmentados:** Reemplazar desplegables `<select>` por controles segmentados estilo app y botones con feedback activo (`active:scale-[0.98]`) y dimensiones táctiles de al menos 44px.
4. **Listas Agrupadas (Inset Lists):** Rediseñar la presentación de citas, servicios y clientes adoptando un patrón de listas limpias con separadores sutiles.
5. **Experiencia Híbrida Responsiva:** Mantener la usabilidad óptima en escritorio (sidebar lateral, modales centrados) mientras se activa la experiencia app en móviles.

## Alcance por Pantallas y Prioridad

1. **Booking Público y Confirmación (`/book/[slug]`):** Pasos guiados, selección de servicios y fecha/hora con controles táctiles grandes y resumen fijo.
2. **Agenda del Salón (`/s/[slug]/appointments`):** Vista diaria y de lista con estados claros, acciones rápidas en la zona del pulgar y modales tipo bottom sheet.
3. **Clientes / CRM (`/s/[slug]/customers`):** Lectura cómoda en móvil, tarjetas apiladas e historial accesible.
4. **Configuración del Salón (`/s/[slug]/settings`):** Formulario optimizado para móvil con toggles y controles segmentados.
5. **Servicios y Especialistas (`/s/[slug]/services`, `/s/[slug]/specialists`):** Listas agrupadas e interfaces de alta/edición fluidas.
6. **Consistencia Global SuperAdmin (`/admin`):** Adaptaciones visuales móviles sin cambiar la lógica de administración.

## No objetivos

- Modificar lógica de negocio, esquema de base de datos o Server Actions existentes.
- Requerir empaquetado en App Store / Google Play Store (se mantiene como PWA web/instalable).
- Romper la experiencia de escritorio.

## Criterios de éxito

1. En pantallas móviles (<768px), la aplicación no produce scroll en la ventana global del navegador; el contenido fluye dentro del viewport fijo.
2. Las acciones de la agenda (reprogramar, cancelar, notas, filtros) abren paneles desde abajo (*Bottom Sheets*) en móvil.
3. Toda la suite de pruebas unitarias (`npm test`) se mantiene en verde (251+ pruebas).
4. `npm run build` y `npm run lint` compilan 100% limpios.
