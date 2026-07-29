# Catálogo Funcional y Manual de Referencia para Validación

Este documento detalla la totalidad de la funcionalidad interactiva, menús, vistas, formularios y acciones disponibles en la plataforma **Citas Glam** hasta la **Fase 8**. Sirve como guía oficial para pruebas, aseguramiento de calidad (QA) y validación punto por punto.

> **Regla de Mantenimiento:** Cualquier nueva funcionalidad, acción de servidor, botón o flujo interactivo que se incorpore en fases posteriores (por ejemplo, en la Fase 9 de UX/UI App-like) **DEBE** agregarse a este catálogo para mantener la trazabilidad del sistema.

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
  * **Nombre e Identidad del Salón:** Muestra el nombre del salón y descripción.
  * **Botón / Enlace "Iniciar Sesión":** Redirige al login de administración o cliente.
* **Paso 1: Selección de Servicios**
  * **Filtro de Categorías:** Botones/Tabs para filtrar la lista de servicios por categoría.
  * **Tarjeta de Servicio:**
    * Muestra: Nombre, descripción, precio (USD) y duración (minutos).
    * **Checkbox / Botón "Agregar":** Permite seleccionar uno o varios servicios para la reserva.
  * **Barra de Resumen Flotante / Inferior:** Muestra total acumulado ($) y tiempo total estimado.
  * **Botón "Continuar":** Habilitado cuando hay al menos 1 servicio seleccionado. Avanza al Paso 2.
* **Paso 2: Selección de Especialista y Fecha/Hora**
  * **Selector de Especialistas:** 
    * Opciones: "Cualquier especialista disponible" o tarjetas individuales de especialistas habilitados para los servicios elegidos.
  * **Calendario Selector de Fecha:**
    * Deshabilita días pasados, días cerrados por horario del salón o fechas bloqueadas.
  * **Grilla de Franjas Horarias (Slots Disponibles):**
    * Genera dinámicamente horas calculadas según duración total, horarios laborables, descansos y citas ya ocupadas.
    * **Botón de Hora:** Selecciona la hora exacta de inicio.
  * **Botón "Continuar":** Avanza al Paso 3 tras seleccionar fecha y hora válida.
  * **Botón "Atrás":** Regresa al Paso 1 conservando la selección de servicios.
* **Paso 3: Datos del Cliente y Confirmación**
  * **Campo "Nombre Completo" (Obligatorio):** Input de texto.
  * **Campo "Teléfono" (Obligatorio):** Input numérico/teléfono con código de país.
  * **Campo "Correo Electrónico" (Opcional):** Input de email. Si se ingresa, valida formato. Si es válido, se enviará confirmación por correo.
  * **Campo "Notas adicionales / Peticiones especiales" (Opcional):** Textarea de notas para el salón.
  * **Resumen de la Reserva:** Muestra desglose de servicios, fecha, hora, especialista y total a pagar en el salón.
  * **Botón "Confirmar Reserva":** Executa la Server Action `createPublicAppointment`.
    * Encola notificación por correo (outbox).
    * Si la cita es exitosa, redirige a la Pantalla de Confirmación.
  * **Botón "Atrás":** Regresa al Paso 2.

### 2.2 Pantalla de Confirmación (`/book/[slug]/confirmacion`)
* **Tarjeta de Éxito:** Muestra mensaje de confirmación con número o ID de la cita.
* **Detalles de la Cita:** Muestra salón, dirección, fecha, hora, servicios contratados y especialista asignado.
* **Aviso de Notificación:** Texto informativo aclarando que la confirmación está en proceso si proporcionó un correo válido.
* **Botón "Agendar otra cita":** Regresa al Wizard de Reserva limpio.
* **Botón "Contactar por WhatsApp":** Enlace directo `https://wa.me/...` pre-llenado con mensaje para el salón sobre la cita recién creada.

---

## 3. Panel de Gestión del Salón (`/s/[slug]`)

Área protegida para dueños y miembros del salón (`requireSalonOwner`).

### 3.1 Navegación Principal (Sidebar en Desktop / Bottom Nav en Móvil)
* **Logotipo / Nombre del Salón:** Con enlace al Dashboard.
* **Menú Navegación:**
  1. **Dashboard:** Mapea a `/s/[slug]/dashboard`.
  2. **Agenda / Citas:** Mapea a `/s/[slug]/appointments`.
  3. **Clientes:** Mapea a `/s/[slug]/customers`.
  4. **Servicios:** Mapea a `/s/[slug]/services`.
  5. **Especialistas:** Mapea a `/s/[slug]/specialists`.
  6. **Horarios:** Mapea a `/s/[slug]/schedules`.
  7. **Configuración:** Mapea a `/s/[slug]/settings`.
* **Botón "Cerrar Sesión" (Sign Out):** Ejecuta la acción de desconexión y redirige al login.

---

### 3.2 Dashboard del Salón (`/s/[slug]/dashboard`)
* **Banner de Suscripción / Trial:**
  * Muestra días restantes del periodo de prueba o plan activo.
  * **Botón "Renovar / Contactar Soporte":** Enlace de acción rápida según estado del plan.
* **Tarjetas KPI Operativas:**
  * **Citas de Hoy:** Contador de citas agendadas para la fecha actual.
  * **Ingresos Estimados del Día:** Suma total ($) de citas de hoy.
  * **Clientes Nuevos:** Total de clientes registrados en la plataforma para este salón.
* **Sección "Próximas Citas de Hoy":**
  * Grilla/Lista corta de las siguientes citas del día con estado, cliente y hora.
  * **Botón / Enlace "Ver toda la agenda":** Redirige a `/s/[slug]/appointments`.

---

### 3.3 Agenda de Citas (`/s/[slug]/appointments`)
* **Encabezado y Acciones Principales:**
  * **Título "Agenda de Citas":** Descripción operativa.
  * **Botón "+ Nueva Cita Manual":** Abre el modal `CreateManualAppointmentDialog`.
* **Filtros de Navegación:**
  * **Tabs de Estado/Fecha:**
    * **"Citas de Hoy":** Muestra citas cuya fecha coincide con el día actual.
    * **"Próximas Citas":** Muestra citas futuras activas (`pending` o `confirmed`).
    * **"Todas":** Histórico completo.
  * **Selector de Especialistas (Dropdown `<select>`):** Filtra por "Todos los Especialistas" o uno en específico.
  * **Selector de Estados (Dropdown `<select>`):** Filtra por "Todos los Estados", `confirmed`, `completed`, `cancelled`, `no_show`, `pending`.
* **Tarjeta / Registro de Cita (Por Cita):**
  * **Datos Mapeados:** Nombre del cliente, Badge de estado (`Confirmada`, `Atendida`, `Cancelada`, `No Asistió`, `Pendiente`), Badge `Manual` (si se creó en el panel), Nombre de Especialista, Servicios y Duración en minutos, Total $, Fecha y Hora.
  * **Notas del Cliente / Notas Internas:** Cajas informativas resaltadas si existen observaciones.
  * **Acordeón / Desplegable de Observabilidad de Notificaciones (`<details>`):**
    * Muestra resumen: `X enviadas · Y omitidas · Z fallidas`.
    * Desglose accesible: Evento (`Creación`, `Cancelación`, `Reprogramación`, `Recordatorio`), Rol (`Cliente`, `Dueño`, `Especialista`), Estado (`enviada`, `omitida`, `fallida`, `procesando`), Email enmascarado (`j***@example.com`), código de resultado y fecha/hora.
  * **Botones de Acción Rápida:**
    * **Botón "WhatsApp" (si tiene teléfono):** Abre chat de WhatsApp pre-llenado con datos del turno.
    * **Botón "Atendida" (`CheckCircle`):** Cambia estado a `completed`.
    * **Botón "No Asistió" (`AlertCircle`):** Cambia estado a `no_show`.
    * **Botón "Reprogramar" (`RefreshCw`):** Abre el modal `RescheduleAppointmentDialog`.
    * **Botón "Cancelar" (`XCircle`):** Abre el modal de confirmación de cancelación.
    * **Botón "Reabrir" (si está cancelada):** Restaura la cita a estado `confirmed`.
    * **Botón "Notas Internas" (`FileText`):** Abre el modal de edición de notas privadas.

* **Modales Operativos de la Agenda:**
  1. **Modal `CreateManualAppointmentDialog` (+ Nueva Cita Manual):**
     * Formulario: Cliente (existente o nuevo), Especialista, Fecha, Hora, Selección múltiple de servicios, Notas internas.
     * **Botón "Guardar Cita":** Ejecuta `createManualAppointment`. Encola notificación y actualiza la lista.
  2. **Modal `RescheduleAppointmentDialog` (Reprogramar):**
     * Formulario: Fecha nueva, Hora nueva, Especialista nuevo, Servicios. Recalcula disponibilidad excluyendo la cita actual.
     * **Botón "Guardar Reprogramación":** Executa `rescheduleAppointment`. Incrementa `scheduleRevision`, cancela recordatorios obsoletos y encola evento `rescheduled`.
  3. **Modal "Cancelar Cita":**
     * Campo "Motivo de Cancelación" (Opcional).
     * **Botón "Confirmar Cancelación":** Executa `updateAppointmentStatus("cancelled")`. Incrementa `notificationRevision` y encola evento `cancelled`.
  4. **Modal "Notas Internas":**
     * Campo "Observaciones" (Textarea).
     * **Botón "Guardar Notas":** Guarda cambios en la DB sin emitir notificaciones por correo.

---

### 3.4 Directorio de Clientes / CRM (`/s/[slug]/customers`)
* **Encabezado y Buscador:**
  * **Input de Búsqueda:** Filtra clientes en tiempo real por nombre, teléfono o correo.
* **Lista / Grilla de Clientes:**
  * **Ficha de Cliente:**
    * Muestra: Nombre completo, teléfono, correo electrónico (si existe).
    * **Métricas Fidelidad:** Total gastado ($ acumulado en citas `completed`), Total de visitas completadas.
    * **Badge "Cumpleaños":** Indicador si registra fecha de nacimiento.
  * **Botón "WhatsApp":** Abre WhatsApp para enviar mensaje directo al cliente.
  * **Botón "Ver Historial de Citas":** Despliega/Abre el historial cronológico e inmutable de citas pasadas del cliente.

---

### 3.5 Gestión de Servicios (`/s/[slug]/services`)
* **Sección Categorías:**
  * Lista de categorías existentes (Ej: Peluquería, Uñas, Barbería).
  * **Botón "+ Nueva Categoría":** Abre diálogo para ingresar nombre.
* **Sección Lista de Servicios:**
  * **Botón "+ Nuevo Servicio":** Abre formulario para crear servicio.
    * Campos: Nombre, Categoría, Precio ($), Duración (minutos), Descripción, Estado (Activo/Inactivo).
  * **Tabla / Grilla de Servicios:**
    * Muestra datos clave y estado.
    * **Botón "Editar":** Modifica precio, tiempo o datos del servicio.
    * **Botón "Desactivar/Activar":** Oculta el servicio del booking público sin borrar el registro.

---

### 3.6 Gestión de Especialistas (`/s/[slug]/specialists`)
* **Encabezado:**
  * **Botón "+ Nuevo Especialista":** Abre modal de creación.
* **Formulario / Modal Especialista:**
  * Campos: Nombre completo, Correo electrónico (utilizado para notificaciones de citas), Teléfono, Servicios que realiza (Checkboxes).
* **Lista de Especialistas:**
  * Muestra tarjeta de cada especialista, sus servicios asignados y su correo.
  * **Botón "Editar":** Modifica nombre, correo o servicios asociados.
  * **Botón "Activar/Desactivar":** Habilita o deshabilita al especialista para recibir citas.

---

### 3.7 Gestión de Horarios (`/s/[slug]/schedules`)
* **Horario de Atención General del Salón:**
  * Grilla de Días de la Semana (Lunes a Domingo).
  * Checkbox "Abierto/Cerrado" por día.
  * Inputs de "Hora de Apertura" y "Hora de Cierre".
  * **Botón "Guardar Horarios General":** Actualiza la tabla `BusinessHours`.
* **Horarios Especiales / Bloqueos de Fechas (Blocked Dates):**
  * Selector de Fecha y Motivo (Ej: "Feriado / Mantenimiento").
  * **Botón "Bloquear Día Completo":** Impide agendar citas en esa fecha.
* **Bloqueo de Franjas Horarias (Blocked Slots):**
  * Selector de Fecha, Hora Inicio y Hora Fin.
  * **Botón "Bloquear Franja":** Reserva ese bloque en la agenda.

---

### 3.8 Configuración del Salón (`/s/[slug]/settings`)
* **Formulario de Perfil del Salón:**
  * Campos: Nombre del Salón, Slug de URL, Teléfono de Contacto, Zona Horaria (`timezone`).
* **Sección Notificaciones por Correo:**
  * **Correo del Dueño del Salón (Enmascarado):** Muestra `d***@example.com` (proveniente de la cuenta de usuario del dueño).
  * **Checkbox Táctil "Recibir en mi correo las notificaciones de citas":**
    * Controla el campo `ownerEmailNotificationsEnabled`.
    * Si está marcado, el dueño recibe confirmaciones, cancelaciones y reprogramaciones.
    * Si se desmarca, se omiten notificaciones al dueño sin afectar al cliente ni al especialista.
  * **Campo "Correos Adicionales de Alerta" (`notificationEmails`):**
    * Muestra lista CSV. Texto explicativo indicando que este campo se conserva para alertas de prueba/plataforma SaaS de Fase 7 y **NO** recibe notificaciones de citas individuales.
* **Botón "Guardar Configuración":** Executa `updateSalonSettings`. Guarda cambios en la DB con feedback inline persistente.

---

## 4. Módulo PWA y UX Móvil (Fase 8)

* **Web App Manifest (`/manifest.webmanifest`):**
  * Configuración para instalación ("Añadir a pantalla de inicio") con nombre "Citas Glam", `short_name`, colores de marca y modo `standalone`.
* **Activos de Íconos PWA (`/public/icons/`):**
  * `icon-192.png`, `icon-512.png`, `maskable-512.png` y `apple-touch-icon.png`.
* **Service Worker (`/public/sw.js`):**
  * Registro habilitado exclusivamente en producción e HTTPS. Service worker sin caché para permitir instalación sin riesgo de servir datos obsoletos.
* **Ajustes de UI / Layout Móvil:**
  * Soporte de Safe-Area (`env(safe-area-inset-bottom)`) en la barra de navegación inferior y vistas protegidas.
  * Prevención de sobre-desplazamiento web (`overscroll-behavior-y: none`).
  * Botones y áreas táctiles adaptados con altura mínima recomendada de 44px (`min-h-11`).

---

## 5. Panel SuperAdmin SaaS (`/admin`)

Módulo de administración global para los dueños de la plataforma SaaS.

### 5.1 Login SuperAdmin (`/admin/login`)
* Formulario de ingreso de administrador.
* **Botón "Iniciar Sesión Admin":** Autentica contra la plataforma.

### 5.2 Dashboard SuperAdmin (`/admin/dashboard`)
* **Métricas SaaS Plataforma:**
  * Total de Salones Registrados, Salones Activos, Usuarios Totales, Suscripciones en Periodo de Prueba (Trial).
* **Alertas de Expiración de Trial (7 Días):**
  * Lista de salones cuyo periodo de prueba vence dentro de los próximos 7 días.

### 5.3 Gestión Global de Salones (`/admin/salons`)
* **Tabla de Salones Registrados:**
  * Muestra: Nombre, Dueño, Plan Activo, Fecha de vencimiento de Trial/Suscripción, Estado.
* **Acciones de Administrador por Salón:**
  * **Botón "Extender Trial":** Opciones predefinidas (+7 días, +14 días, +30 días). Executa `extendSalonTrial`. Revalida /my-salons y el dashboard del salón.
  * **Botón "Cambiar Plan":** Permite asignar o modificar el plan SaaS del salón.
  * **Campo "Notas Administrativas":** Permite al SuperAdmin guardar notas privadas del cliente SaaS.

---

## 6. Endpoints y Cron del Sistema

* **Endpoint Cron de Notificaciones (`/api/cron/notifications`):**
  * Requiere encabezado `Authorization: Bearer <CRON_SECRET>`.
  * **Funciones que ejecuta:**
    1. Reclamación atómica y despacho de notificaciones pendientes en el outbox (`after()` fallback).
    2. Proceso de **Recordatorios Automáticos a 24 horas**: busca citas vigentes dentro de la ventana de 24h, genera clave única `reminder_24h:{appointmentId}:{scheduleRevision}` y envía notificaciones por correo.
    3. Recuperación de envíos estancados (`unknown_after_send`).
    4. Purga automática de registros de notificaciones finalizados según `NOTIFICATION_RETENTION_DAYS`.
  * **Respuesta:** JSON sanitizado con contadores numéricos (ninguna PII ni token expuesto).

---

## 7. Registro de Cambios y Versiones del Catálogo

| Fecha | Versión | Descripción del Cambio | Módulos Afectados |
| --- | --- | --- | --- |
| 2026-07-29 | 1.0.0 | Creación del catálogo base con funcionalidades consolidadas de la **Fase 1 a la Fase 8** (Booking público, Panel Salón, CRM, SuperAdmin, Gmail OAuth2 Outbox, Reprogramación, Recordatorios 24h y PWA básica). | Todos los módulos |
