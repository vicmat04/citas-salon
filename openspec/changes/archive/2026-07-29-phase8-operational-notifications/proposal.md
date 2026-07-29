# Propuesta: Notificaciones Operacionales y Experiencia App-like (Fase 8)

## Intención y problema

Una cita creada, cancelada o reprogramada hoy no deja una confirmación asíncrona para quienes deben actuar sobre ella. Esto crea incertidumbre para el cliente, aumenta el seguimiento manual del salón y deja al especialista sin una alerta fiable cuando participa en el servicio. En móvil, además, la experiencia conserva metadatos y detalles propios de una página web genérica en vez de una aplicación instalable y pulida.

La Fase 8 incorporará comunicaciones operacionales por correo que acompañen el ciclo de vida de la cita y una base PWA visual/app-like centrada en la operación móvil, sin comprometer la creación o actualización de la cita si falla o falta un destinatario.

## Decisiones de producto confirmadas

- Se cubren creación, cancelación, reprogramación y recordatorios automáticos.
- Los destinatarios son cliente, dueño del salón y especialista, según las reglas siguientes.
- El dueño puede habilitar o deshabilitar las notificaciones a su propio correo.
- La ausencia de correo de cualquier destinatario nunca invalida la operación principal de la cita.
- Los recordatorios requieren ejecución programada o en segundo plano; su diseño técnico se definirá en la fase de diseño.
- La PWA de esta fase es básica, visual e instalable; no incluye offline avanzado ni Web Push nativo.

## Valor para usuarios y negocio

- **Clientes:** reciben comprobantes y cambios de su cita con datos claros, reduciendo dudas y ausencias.
- **Dueños y especialistas:** conocen oportunamente las nuevas citas y modificaciones para preparar su operación diaria.
- **Salón:** disminuye la coordinación manual y puede decidir si desea recibir copias en el correo principal del dueño.
- **Plataforma:** mejora confianza y conversión móvil con una experiencia coherente al instalarse o usarse desde el teléfono.

## Objetivos

1. Comunicar por correo los eventos operacionales relevantes de una cita sin bloquear la transacción.
2. Respetar preferencias y disponibilidad de destinatarios por salón y especialista.
3. Incorporar recordatorios automáticos de manera observable y segura.
4. Mejorar los flujos móviles de mayor impacto y habilitar instalación básica como PWA.

## Alcance funcional

### Eventos de cita

- Enviar comunicaciones para la **creación** de citas originadas tanto en el booking público como en el panel del salón.
- Informar la **cancelación** de una cita activa.
- Informar la **reprogramación**, con los datos actualizados de fecha, hora, servicio y especialista cuando aplique.
- Usar plantillas HTML simples, legibles en móvil y adecuadas al destinatario y evento.
- Exponer o registrar de forma segura el resultado de notificación (enviada, omitida por falta de correo o fallida) sin presentar como fallida una cita que sí fue procesada.
- Reutilizar la infraestructura de correo Gmail API/OAuth2 existente, sin guardar secretos en el repositorio.

### Reglas de destinatarios

| Destinatario | Regla |
| --- | --- |
| Cliente | Recibe el correo si la cita contiene un correo de cliente válido. Si no existe, se omite su envío. |
| Dueño del salón | Recibe el correo en su dirección principal solo cuando la preferencia de notificación del dueño esté habilitada y exista un correo válido. El dueño puede cambiar esta preferencia desde la configuración del salón. |
| Especialista | Recibe el correo si está asociado a la cita y tiene un correo válido configurado. Si falta cualquiera de esas condiciones, se omite. |

La deduplicación de direcciones y el tratamiento de los destinatarios adicionales ya existentes se concretarán en diseño. Esta propuesta no amplía por sí sola los destinatarios de citas a copias internas de plataforma ni a canales distintos del correo.

### Recordatorios automáticos

- Se incluirán recordatorios para citas futuras mediante un mecanismo programado o de fondo, idempotente y protegido contra envíos duplicados.
- La ventana exacta antes de la cita, los criterios de elegibilidad (por ejemplo, citas canceladas o reprogramadas) y la infraestructura concreta de ejecución son supuestos pendientes de precisar en diseño.
- Un fallo, reintento o ausencia de correo en un recordatorio no debe cambiar el estado de la cita ni bloquear otras operaciones.

### Experiencia app-like / PWA básica

- Incorporar manifiesto web, nombre e identidad de aplicación, iconos móviles y metadatos de tema/Apple necesarios para “Añadir a pantalla de inicio”.
- Reemplazar metadatos y títulos genéricos por identidad del producto.
- Aplicar pulido móvil: áreas seguras en la navegación inferior, objetivos táctiles adecuados, espaciado/estados vacíos y comportamiento visual de desplazamiento que reduzca la sensación de página genérica.
- Mantener funcionamiento web normal; la instalación es una mejora progresiva.

## Prioridad de pantallas UX

1. **Booking público:** pasos comprensibles, resumen y confirmación visibles, errores claros y controles táctiles grandes.
2. **Agenda / panel de citas:** consultar y ejecutar creación, cancelación y reprogramación con feedback de notificaciones.
3. **Clientes / CRM:** lectura cómoda en móvil, historial y datos de contacto accionables.
4. **Configuración del salón:** preferencia de correo del dueño, datos de correo y explicación clara de las reglas.
5. **SuperAdmin:** solo consistencia y ajustes globales necesarios; no rediseño profundo.

## Áreas afectadas

| Área | Impacto esperado |
| --- | --- |
| Mutaciones de booking y citas | Disparadores para creación, cancelación y reprogramación, sin cambiar la garantía transaccional de la cita. |
| Servicio de correo | Plantillas, composición de destinatarios y manejo observable de omisiones/fallos. |
| Configuración del salón y datos relacionados | Preferencia para el correo del dueño y validación/lectura de direcciones disponibles. |
| Ejecución diferida | Diseño de planificación, idempotencia y trazabilidad de recordatorios. |
| Layout, estilos y activos públicos | Manifest, iconos, metadatos, áreas seguras y pulido de UX móvil. |
| Booking, agenda, CRM y configuración | Mejoras progresivas según el orden de prioridad indicado. |

## No objetivos

- Notificaciones Web Push nativas, SMS o WhatsApp Business API.
- Modo offline avanzado, sincronización local compleja o empaquetado para tiendas nativas.
- Rediseño integral de SuperAdmin.
- Hacer que un correo sea requisito para crear, cancelar o reprogramar una cita.
- Definir en esta propuesta el proveedor de scheduler/cron, la ventana definitiva de recordatorio o una arquitectura de colas; corresponden al diseño técnico.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Latencia o caída de Gmail API al confirmar una cita | Desacoplar el envío cuando la plataforma lo permita; capturar el fallo y preservar el resultado exitoso de la cita. |
| Correos ausentes, inválidos o repetidos | Validar, deduplicar y omitir de forma segura; registrar/mostrar el estado sin exponer datos sensibles. |
| Recordatorios duplicados por reintentos o ejecuciones concurrentes | Diseñar idempotencia, criterio de elegibilidad y trazabilidad antes de implementar el scheduler. |
| Límites, token vencido o entregabilidad de Gmail | Usar OAuth2 ya existente, observabilidad de fallos y procedimientos de renovación/configuración de credenciales. |
| Cambios de cita cercanos al recordatorio | Evaluar estado y hora vigente en el momento de ejecución; no enviar recordatorios de citas canceladas ni datos obsoletos. |
| UX PWA inconsistente entre navegadores | Aplicar mejoras progresivas y validar especialmente navegación móvil, instalación y áreas seguras. |

## Rollback

- Las notificaciones podrán desactivarse por configuración o por el disparador afectado sin revertir datos de citas ya creadas.
- Si el mecanismo de recordatorios presenta riesgo operativo, podrá pausarse sin interrumpir booking, cancelaciones ni reprogramaciones.
- Los metadatos y activos PWA son reversibles de forma independiente y no deben introducir dependencia de offline para los flujos críticos.

## Criterios de éxito orientados a aceptación

1. Al crear una cita pública o manual, el sistema intenta notificar al cliente, dueño habilitado y especialista elegibles con un correo que identifica claramente la cita.
2. Al cancelar o reprogramar una cita, los mismos destinatarios elegibles reciben una comunicación que distingue el evento y refleja el estado o datos vigentes.
3. La creación, cancelación o reprogramación termina correctamente aunque falte un correo o falle el envío a uno o más destinatarios; el resultado de notificación queda registrado o expuesto de forma segura.
4. El dueño del salón puede habilitar y deshabilitar su propia copia por correo desde la configuración, y la preferencia se respeta en eventos posteriores.
5. El proceso automático de recordatorios solo considera citas elegibles, evita duplicados y no altera el estado de una cita si no puede enviar el correo.
6. La aplicación ofrece manifiesto, iconos y metadatos móviles coherentes, y los flujos prioritarios mantienen controles táctiles y navegación inferior utilizables en dispositivos móviles.
7. No se incorporan Web Push, SMS/WhatsApp, offline avanzado ni cambios profundos de SuperAdmin como parte de esta fase.

## Ronda de preguntas de propuesta

La exploración planteó decisiones de alcance, recordatorios y latencia. El usuario confirmó la cobertura completa del ciclo de vida, recordatorios automáticos, la política de destinatarios y la PWA básica. Los detalles pendientes —ventana de recordatorio, infraestructura programada y tratamiento final de destinatarios adicionales— se mantienen deliberadamente para diseño, sin alterar las reglas de negocio confirmadas.
