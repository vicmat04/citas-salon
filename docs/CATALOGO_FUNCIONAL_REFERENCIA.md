# Catálogo Funcional y Manual de Referencia para Validación

Este documento detalla la totalidad de la funcionalidad interactiva, menús, vistas, formularios y acciones disponibles en la plataforma **Citas Glam** hasta la **Fase 9**. Sirve como guía oficial para pruebas, aseguramiento de calidad (QA) y validación punto por punto.

> **Regla de Mantenimiento:** Cualquier nueva funcionalidad, acción de servidor, botón o flujo interactivo que se incorpore en fases posteriores **DEBE** agregarse a este catálogo para mantener la trazabilidad del sistema.

---

## 1. Módulos y Estructura General

La plataforma está dividida en 4 áreas principales de acceso:

1. **Motor de Reserva Público (Cliente):** Ruta `/book/[slug]`
2. **Panel de Gestión del Salón (Dueño / Especialista):** Ruta `/s/[slug]`
3. **Panel SuperAdmin (Administrador de Plataforma SaaS):** Ruta `/admin`
4. **Módulos del Sistema y Autenticación:** Rutas `/registro-salon`, `/login`, `/admin/login`, `/my-salons`, `/auth/callback`, `/api/cron/notifications` y PWA `/manifest.webmanifest`.

---

## 2. Motor de Reserva Público (`/book/[slug]`)

Es la interfaz pública del cliente para agendar citas sin necesidad de estar autenticado previamente.

### 2.1 Vista Principal: Wizard de Reserva (`/book/[slug]`)

* **Header / Encabezado:**
  * **Nombre e Identidad del Salón:** Muestra el nombre del salón y descripción en un contenedor superior fijo.
  * **Botón / Enlace "Iniciar Sesión":** Redirige al login de administración o cliente.
* **Paso 1: Selección de Servicios**
  * **Filtro de Categorías:** Controles segmentados tipo píldora (Pills) para filtrar la lista de servicios por categoría.
  * **Tarjeta de Servicio Táctil:**
    * Muestra: Nombre, descripción, precio (USD) y duración (minutos).
    * **Checkbox / Botón "Agregar" (≥44px):** Permite seleccionar uno o varios servicios para la reserva con respuesta táctil activa (`active:scale-[0.98]`).
  * **Barra de Resumen Flotante / Inferior Fija:** Muestra total acumulado ($) y tiempo total estimado.
  * **Botón "Continuar":** Habilitado cuando hay al menos 1 servicio seleccionado. Avanza al Paso 2.
* **Paso 2: Selección de Especialista y Fecha/Hora**
  * **Selector de Especialistas (Pills Táctiles):**
    * Opciones: Botón "Cualquiera" o tarjetas de especialistas con estados activo/inactivo.
  * **Calendario Selector de Fecha:**
    * Deshabilita días pasados, días cerrados por horario del salón o fechas bloqueadas.
  * **Grilla de Franjas Horarias (Slots Disponibles):**
    * Botones táctiles de 48px (`min-h-12`) para seleccionar la hora exacta.
  * **Botón "Continuar":** Avanza al Paso 3 tras seleccionar fecha y hora válida.
  * **Botón "Atrás":** Regresa al Paso 1 conservando la selección de servicios.
* **Paso 3: Datos del Cliente y Confirmación**
  * **Campo "Nombre Completo" (Obligatorio):** Input de 44px (`min-h-11`).
  * **Campo "Teléfono" (Obligatorio):** Input numérico/teléfono con código de país.
  * **Campo "Correo Electrónico" (Opcional):** Input de email. Si se ingresa, envía confirmación por correo.
  * **Campo "Notas adicionales" (Opcional):** Textarea de notas para el salón.
  * **Resumen de la Reserva:** Desglose final de la cita.
  * **Botón "Confirmar Reserva":** Executa `createPublicAppointment` y redirige a la confirmación.
  * **Botón "Atrás":** Regresa al Paso 2.

### 2.2 Pantalla de Confirmación (`/book/[slug]/confirmacion`)

* **Tarjeta de Éxito Táctil:** Detalles de la cita con diseño visual limpio.
* **Botón "Agendar otra cita":** Regresa al Wizard de Reserva.
* **Botón "Contactar por WhatsApp":** Botón verde de 44px con enlace directo a WhatsApp.

---

## 3. Panel de Gestión del Salón (`/s/[slug]`)

Área protegida para dueños y miembros del salón (`requireSalonOwner`).

### 3.1 Estructura de Viewport Fijo y Navegación Móvil (Fase 9)

* **Layout de Viewport Fijo Móvil (`h-dvh` / `100dvh`):**
  * Encabezado y barra de navegación inferior fijos; zona central deslizable (`overflow-y-auto overscroll-contain`).
  * Respeto de Safe-Area (`env(safe-area-inset-bottom)`).
* **Navegación Móvil (Bottom Nav):**
  * Barra inferior fija en pantallas <768px con 5 accesos principales de toque directo (Dashboard, Agenda, Clientes, Servicios, Ajustes).

---

### 3.2 Agenda de Citas (`/s/[slug]/appointments`)

* **Encabezado y Acciones:**
  * **Botón "+ Nueva Cita Manual":** En móvil abre un **Bottom Sheet (`Sheet side="bottom"`)**; en escritorio abre `<Dialog>`.
* **Filtros de Navegación Segmentados (Pills):**
  * **Controles de Píldora para Estado y Especialistas:** Reemplazan totalmente los menús desplegables `<select>` por botones de toque directo (`aria-pressed`, `min-h-11`, `active:scale-[0.98]`).
* **Tarjetas de Cita y Modales Adaptativos:**
  * **Acciones en Cita:** Botón WhatsApp, Atendida, No Asistió, Reprogramar, Cancelar, Reabrir y Notas.
  * **Diálogos Emergentes Inferiores en Móvil (Bottom Sheets):**
    1. **Reprogramación (`RescheduleAppointmentDialog`):** Selector de especialista en píldoras, fecha y hora.
    2. **Cancelación:** Captura de motivo en panel inferior.
    3. **Notas Internas:** Edición de observaciones en panel inferior.
    4. **Cita Manual (`CreateManualAppointmentDialog`):** Formulario adaptado a panel inferior.

---

### 3.3 CRM de Clientes (`/s/[slug]/customers`)

* **Directorio estilo Inset List Móvil:**
  * Filas agrupadas con bordes suaves y separadores en móvil.
  * Botones de acción rápida WhatsApp e Historial de 44px con respuesta al presionar (`active:scale-[0.98]`).
* **Historial de Citas en Bottom Sheet:**
  * En móvil despliega un panel desde abajo (`max-h-[94dvh]`) con tirador táctil y scroll independiente.

---

### 3.4 Configuración del Salón (`/s/[slug]/settings`)

* **Interruptores Táctiles estilo App (Switch/Toggle):**
  * Control `ownerEmailNotificationsEnabled` rediseñado con interruptor tipo iOS/Android (`role="switch"`).
* **Formulario Adaptado:**
  * Secciones divididas y campos de entrada de 44px (`min-h-11`).
  * Estado de retroalimentación persistente inline (`CheckCircle2` / `AlertCircle`).

---

### 3.5 Servicios y Especialistas (`/s/[slug]/services`, `/s/[slug]/specialists`)

* **Listas Agrupadas App-like:**
  * Presentación en Inset Lists con separadores en móvil.
  * Selector de categorías en servicios convertido a **barras de píldoras táctiles** (eliminación de `<select>`).
  * Checkboxes de asignación de servicios a especialistas con objetivos de 44px y animación activa.

---

## 4. Módulo PWA y Experiencia App-like (Fase 8 y 9)

* **Web App Manifest (`/manifest.webmanifest`):** Nombre "Citas Glam", modo `standalone`, colores e iconos PWA.
* **Service Worker (`public/sw.js`):** Registro en producción/HTTPS sin caché de datos.
* **Estilos Globales (`globals.css`):** Utilidades `.press-scale` (`active:scale-[0.98]`), `-webkit-tap-highlight-color: transparent` y utilidades de safe-area.

---

## 5. Panel SuperAdmin SaaS (`/admin`)

Módulo de administración global para los dueños de la plataforma SaaS **Citas Glam**.

---

## 6. Registro de Cambios del Catálogo

| Fecha | Versión | Descripción del Cambio | Módulos Afectados |
| --- | --- | --- | --- |
| 2026-07-29 | 1.0.0 | Creación del catálogo base con funcionalidades consolidadas hasta la Fase 8. | Todos los módulos |
| 2026-07-30 | 1.1.0 | Actualización **Fase 9**: Marca "Citas Glam", Viewport Fijo `h-dvh`, Bottom Sheets (`Sheet side="bottom"`), Inset Lists, eliminación total de `<select>` por controles segmentados (Pills), Switch/Toggle en configuración y botones de 44px con respuesta `active:scale-[0.98]`. | Todos los módulos UI |
