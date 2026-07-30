# Exploración de UX/UI Móvil tipo App (Citas Glam)

## 1. Objetivos Clave

Transformar la experiencia de usuario (UX) e interfaz (UI) para que el sistema se sienta como una aplicación nativa en dispositivos móviles ("App-like"), alejándose del paradigma tradicional de páginas web y layouts de escritorio adaptados.

## 2. Análisis y Estrategia por Objetivo (UX Targets)

### Target 1: Fixed Viewport Layout

- **Estado Actual:** Los layouts como `app/s/[slug]/(protected)/layout.tsx` utilizan `min-h-dvh` y permiten el scroll en el `<body>`, utilizando un menú lateral en escritorio y ocultándolo en móvil (potencialmente usando un menú hamburguesa).
- **Propuesta:**
  - Restringir el contenedor principal a `h-dvh overflow-hidden flex flex-col`.
  - Crear una **Top Bar fija** (`h-14` o `h-16`) con el título y acciones rápidas.
  - El área central de contenido será un contenedor con scroll propio (`flex-1 overflow-y-auto overscroll-contain`).
  - Implementar una **Bottom Navigation fija** en móvil (`fixed bottom-0 w-full z-50 bg-background border-t pb-safe`) con los iconos principales (Dashboard, Citas, Clientes, Más). En escritorio (`md:`) se seguirá utilizando el sidebar lateral.

### Target 2: Mobile Bottom Sheets

- **Estado Actual:** Se usan modales de escritorio o navegaciones de página completa para acciones secundarias, lo cual rompe el flujo rápido ("thumb-zone") en móvil.
- **Propuesta:**
  - Aprovechar el componente `<Sheet>` ya integrado (`components/ui/sheet.tsx`) que soporta la propiedad `side="bottom"`.
  - Usar estos Bottom Sheets para: filtros, creación rápida, ver detalles de citas, seleccionar servicios/especialistas en el flujo de reserva, y reprogramaciones.
  - Asegurar un tirador visual ("drag handle") en la parte superior del sheet y bordes redondeados `rounded-t-2xl`.

### Target 3: App-native Grouped Lists & Card Patterns

- **Estado Actual:** Listas planas y tarjetas con bordes genéricos de web.
- **Propuesta:**
  - **Inset Lists:** Listas estilo iOS/Material agrupadas dentro de contenedores con fondo diferenciado y bordes sutiles.
  - **Touch Targets:** Todos los botones, filas de lista y tarjetas interactivas tendrán un área mínima de toque de `44px` (ej. `min-h-[44px]`).
  - **Feedback Visual:** Implementar utilidades como `active:scale-[0.98] transition-transform` y `active:bg-accent/50` para que el usuario sienta respuesta inmediata al toque.

### Target 4: Segmented Controls & Mobile Pickers

- **Estado Actual:** Dependencia de `<select>` nativos de HTML o interfaces de escritorio.
- **Propuesta:**
  - Reemplazar selectores cortos por **Segmented Controls** (similares a `<Tabs>` pero estilizados como botones de opción exclusiva en línea).
  - Reemplazar selectores largos (listas de servicios o especialistas) por un botón que abra un **Bottom Sheet (Mobile Picker)** con un buscador interno y lista optimizada para móvil.

### Target 5: Smooth Mobile Transitions & Visual Feedback

- **Propuesta:**
  - Añadir transiciones suaves en el cambio de pestañas.
  - Diseñar "Empty States" limpios y centrados, con iconos amigables y un botón de acción claro.
  - Proveer estados de carga mediante *skeletons* con animaciones sutiles.

## 3. Orden de Ejecución (Scope Order)

1. **Booking público (`/book/[slug]`):** El *Booking Wizard*. Al ser el flujo más crítico para los clientes finales, debe ser el primero en recibir el look "App-native", usando Bottom Sheets para opciones y tarjetas para servicios.
2. **Agenda del salón (`/s/[slug]/appointments`):** La vista diaria/semanal debe sentirse como un calendario nativo, con tarjetas tocables que abren el detalle en un Bottom Sheet.
3. **Clientes / CRM (`/s/[slug]/customers`):** Lista estilo contactos/directorio móvil.
4. **Configuración del salón (`/s/[slug]/settings`):** Implementar *Grouped Lists* para las opciones.
5. **Servicios y Especialistas (`/s/[slug]/services`, `/s/[slug]/specialists`):** Listas interactivas y formularios en Sheets.
6. **SuperAdmin global consistency (`/admin`):** Aplicar los mismos patrones de layout al portal de administración global.

## 4. Riesgos Identificados

- **Teclado Virtual en Móvil:** El uso de `h-dvh` con elementos `fixed bottom-0` puede tener comportamientos inesperados cuando se abre el teclado virtual en iOS/Android. Es crucial probar formularios y asegurar que el área de *scroll* permita ver el input enfocado.
- **Responsividad Híbrida:** Mantener el código limpio al tener vistas que en escritorio usan un `<Dialog>` o `<Sidebar>` y en móvil usan un `<Sheet bottom>` o `<BottomNav>`. Se recomienda encapsular la lógica usando Hooks responsivos (ej. `useMediaQuery`) para renderizar el componente adecuado según la pantalla.
