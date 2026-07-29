# Especificación: Notificaciones Operacionales y Experiencia App-like (Fase 8)

## Propósito

Definir el comportamiento observable de las notificaciones por correo del ciclo de vida de una cita, los recordatorios automáticos resilientes y la experiencia móvil/PWA básica, sin convertir la entrega de mensajes en una condición para operar citas.

## Requisitos

### Requirement: Notificación de creación de cita

El sistema MUST intentar una notificación operacional cuando una cita sea creada correctamente desde el booking público o desde el panel del salón. El mensaje MUST identificar que se trata de una creación y MUST presentar los datos vigentes de la cita de forma legible en móvil. El sistema MUST NOT notificar una creación rechazada o no confirmada.

#### Scenario: Creación desde booking público

- GIVEN una solicitud pública que crea una cita correctamente
- WHEN la creación queda confirmada
- THEN el sistema intenta notificar a cada destinatario elegible según su rol
- AND el contenido identifica la nueva cita y sus datos vigentes

#### Scenario: Creación manual desde el panel

- GIVEN un usuario autorizado que crea una cita manual correctamente
- WHEN la creación queda confirmada
- THEN el sistema aplica las mismas reglas de contenido y elegibilidad que al booking público

### Requirement: Notificación de cancelación

El sistema MUST intentar una notificación cuando una cita activa sea cancelada correctamente. El mensaje MUST distinguir la cancelación de otros eventos e identificar la cita afectada. El sistema MUST NOT emitir esta notificación cuando la cancelación sea rechazada.

#### Scenario: Cancelación confirmada

- GIVEN una cita activa y una cancelación válida
- WHEN la cita queda cancelada
- THEN cada destinatario elegible recibe un intento de notificación de cancelación
- AND el mensaje no presenta la cita como activa

### Requirement: Notificación de reprogramación

El sistema MUST intentar una notificación cuando una cita sea reprogramada correctamente. El mensaje MUST distinguir la reprogramación y MUST reflejar la fecha, hora, servicio y especialista vigentes cuando esos datos apliquen.

#### Scenario: Reprogramación confirmada

- GIVEN una cita que admite reprogramación
- WHEN su cambio queda confirmado
- THEN el sistema intenta notificar a cada destinatario elegible
- AND el mensaje presenta como definitivos los datos vigentes, no los sustituidos

### Requirement: Elegibilidad de destinatarios

Para cada evento y recordatorio, el sistema MUST evaluar cada rol de manera independiente. El cliente MUST ser elegible solo si la cita contiene un correo válido de cliente. El dueño MUST ser elegible solo si su preferencia está habilitada y su correo principal es válido. El especialista MUST ser elegible solo si está asociado a la cita y tiene un correo válido. Una dirección repetida entre roles MUST NOT producir mensajes duplicados equivalentes para el mismo evento.

#### Scenario: Todos los roles son elegibles

- GIVEN una cita con correos válidos para cliente, dueño habilitado y especialista asociado
- WHEN ocurre un evento notificable
- THEN el sistema incluye a los tres roles en el intento de notificación

#### Scenario: Solo algunos roles son elegibles

- GIVEN una cita donde uno o más roles no cumplen sus condiciones
- WHEN ocurre un evento notificable
- THEN el sistema omite únicamente esos roles
- AND continúa evaluando a los demás

### Requirement: Preferencia de notificación del dueño

El dueño del salón MUST poder habilitar o deshabilitar desde la configuración del salón las notificaciones dirigidas a su propio correo principal. La preferencia guardada MUST aplicarse a eventos y recordatorios posteriores y MUST NOT alterar la elegibilidad del cliente ni del especialista.

#### Scenario: El dueño deshabilita su copia

- GIVEN un salón cuyo dueño deshabilitó su preferencia
- WHEN ocurre posteriormente un evento notificable
- THEN el correo principal del dueño se omite
- AND los demás destinatarios elegibles conservan su tratamiento normal

#### Scenario: El dueño vuelve a habilitar su copia

- GIVEN un dueño con correo válido que habilita la preferencia
- WHEN ocurre posteriormente un evento notificable
- THEN el dueño vuelve a ser elegible

### Requirement: Manejo seguro de correos ausentes o inválidos

El sistema MUST omitir de forma segura cualquier destinatario sin correo o con correo inválido. La ausencia, invalidez o fallo de entrega de uno o todos los destinatarios MUST NOT revertir, bloquear ni presentar como fallida una creación, cancelación o reprogramación confirmada.

#### Scenario: Ningún destinatario tiene correo utilizable

- GIVEN una operación de cita válida sin destinatarios con correo válido
- WHEN la operación queda confirmada
- THEN la operación finaliza correctamente
- AND cada destinatario no utilizable queda registrado como omitido sin intentar su entrega

#### Scenario: Falla un envío

- GIVEN una operación de cita ya confirmada
- WHEN el proveedor rechaza o no puede procesar un mensaje
- THEN la cita mantiene su resultado y estado
- AND el fallo de notificación se trata independientemente

### Requirement: Observabilidad segura del resultado

El sistema MUST registrar o exponer, para usuarios autorizados, el evento, rol destinatario, momento y resultado `enviada`, `omitida` o `fallida`; `enviada` significa aceptada para envío y no garantiza recepción final. La observabilidad MUST NOT revelar el cuerpo completo, direcciones sin enmascarar, credenciales, tokens ni respuestas sensibles del proveedor. Los errores MUST usar información sanitizada y accionable.

#### Scenario: Consulta operacional autorizada

- GIVEN intentos con resultados diferentes para una cita
- WHEN un usuario autorizado consulta el resultado
- THEN puede distinguir qué roles fueron enviados, omitidos o fallaron
- AND no puede ver secretos ni datos personales innecesarios

#### Scenario: Respuesta de la operación principal

- GIVEN una cita procesada correctamente y una notificación fallida
- WHEN el actor recibe el resultado de la operación
- THEN el sistema comunica el éxito de la cita por separado del estado de notificación

### Requirement: Elegibilidad de recordatorios automáticos

El sistema MUST evaluar recordatorios mediante ejecución programada o en segundo plano. El sistema MUST intentar recordatorios solo para citas futuras, vigentes, no canceladas y dentro de la ventana configurada. En el momento de ejecución, cada rol MUST cumplir las reglas actuales de destinatario y preferencia.

#### Scenario: Cita futura elegible

- GIVEN una cita vigente dentro de la ventana configurada
- WHEN se ejecuta el proceso de recordatorios
- THEN el sistema evalúa un recordatorio para cada destinatario actualmente elegible

#### Scenario: Cita cancelada o fuera de ventana

- GIVEN una cita cancelada, pasada o fuera de la ventana configurada
- WHEN se ejecuta el proceso
- THEN el sistema MUST NOT intentar un recordatorio para esa cita

### Requirement: Idempotencia y vigencia de recordatorios

Para una misma cita, ventana lógica y destinatario, el sistema MUST producir como máximo un recordatorio efectivo, incluso ante reintentos o ejecuciones concurrentes. Antes de cada intento MUST volver a evaluar el estado, horario, servicio, especialista, correo y preferencia vigentes. Una reprogramación MUST invalidar cualquier recordatorio pendiente basado en datos sustituidos.

#### Scenario: Reejecución del mismo periodo

- GIVEN que un recordatorio efectivo ya fue procesado para una cita, ventana y destinatario
- WHEN el proceso se repite o ejecuta concurrentemente
- THEN no se produce un segundo recordatorio equivalente

#### Scenario: Cita modificada antes del envío

- GIVEN una cita reprogramada o cancelada después de ser candidata
- WHEN llega el momento de intentar el recordatorio
- THEN el sistema usa la información vigente o lo omite si dejó de ser elegible
- AND MUST NOT enviar datos obsoletos

### Requirement: Fallo seguro de recordatorios

Un fallo, omisión o reintento de recordatorio MUST NOT modificar el estado de la cita, bloquear otras citas ni detener el procesamiento independiente de otros destinatarios elegibles. El resultado MUST cumplir la misma observabilidad segura de los eventos operacionales.

#### Scenario: Falla un destinatario durante el lote

- GIVEN varias citas o destinatarios elegibles
- WHEN falla el envío de uno de ellos
- THEN los demás pueden continuar procesándose
- AND ninguna cita cambia de estado por ese fallo

### Requirement: PWA básica y mejora progresiva

La aplicación MUST publicar y referenciar un manifiesto válido con identidad del producto, iconos móviles, color de tema y metadatos necesarios para una experiencia instalable y Apple/mobile. MUST reemplazar metadatos genéricos. Los flujos críticos MUST seguir funcionando como web normal cuando la instalación no esté disponible o la aplicación no esté instalada.

#### Scenario: Dispositivo compatible con instalación

- GIVEN un navegador móvil compatible
- WHEN el usuario abre la aplicación
- THEN el navegador dispone de nombre, icono, color e identidad coherentes para añadirla a la pantalla de inicio

#### Scenario: Navegador sin instalación

- GIVEN un navegador que no ofrece instalación
- WHEN el usuario utiliza un flujo crítico
- THEN el flujo conserva su funcionalidad web

### Requirement: Prioridad y calidad de UX móvil

El pulido móvil MUST atender en este orden: booking público, agenda/panel de citas, clientes/CRM, configuración del salón y SuperAdmin. Booking y agenda MUST ofrecer controles táctiles utilizables, estados de éxito/error claros y contenido sin desbordamiento. La navegación inferior MUST respetar áreas seguras; CRM y configuración MUST conservar lectura y acciones esenciales; SuperAdmin SHOULD recibir consistencia global, no un rediseño profundo.

#### Scenario: Uso de flujos prioritarios en móvil

- GIVEN una pantalla móvil soportada
- WHEN el usuario reserva o gestiona una cita
- THEN puede completar el flujo sin controles inaccesibles ni contenido crítico oculto
- AND recibe feedback separado para la operación de cita y su notificación

#### Scenario: Configuración móvil del salón

- GIVEN un dueño en la configuración desde móvil
- WHEN consulta o cambia su preferencia de correo
- THEN el control es legible, accionable y explica su efecto

### Requirement: Exclusiones de la fase

Esta fase MUST NOT exigir Web Push nativo, SMS, WhatsApp Business, offline avanzado, sincronización local compleja, empaquetado para tiendas nativas ni un rediseño integral de SuperAdmin. Las notificaciones de citas MUST NOT incorporar implícitamente copias internas de plataforma ni `notificationEmails` adicionales sin una decisión de producto posterior.

#### Scenario: Validación del alcance

- GIVEN la aceptación de la Fase 8
- WHEN se evalúan sus entregables obligatorios
- THEN ninguna capacidad excluida es requisito para aprobar la fase
- AND el conjunto de destinatarios de citas se limita a cliente, dueño habilitado y especialista elegibles

## Criterios formales de aceptación

1. Creación pública/manual, cancelación y reprogramación confirmadas generan intentos para los roles elegibles con contenido acorde al evento y datos vigentes.
2. La preferencia del dueño se puede cambiar y se respeta sin afectar a cliente ni especialista.
3. Correos faltantes, inválidos o fallidos no cambian el éxito ni el estado de la cita.
4. Los resultados son observables por estado y rol sin exponer datos sensibles.
5. Los recordatorios excluyen citas canceladas o no vigentes, usan datos actuales y son idempotentes ante reintentos y concurrencia.
6. El fallo de un recordatorio no altera citas ni impide procesar otros destinatarios.
7. La aplicación presenta identidad PWA básica y conserva funcionamiento web progresivo.
8. La revisión móvil sigue la prioridad acordada y no introduce capacidades excluidas.
