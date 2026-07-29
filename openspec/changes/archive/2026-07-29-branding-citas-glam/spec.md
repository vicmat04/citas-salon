# Especificación: Identidad de Marca "Citas Glam"

## Propósito

Definir los requisitos de marca textual y metadatos para la plataforma SaaS Citas Glam.

## Requisitos

### Requirement: Nombre e Identidad en Metadatos y PWA

El sistema MUST presentar "Citas Glam" como el nombre oficial de la plataforma en los metadatos de Next.js y en el manifiesto PWA.

#### Scenario: Consulta de metadatos globales

- GIVEN un navegador o motor de búsqueda consultando la aplicación
- WHEN lee el título de la página principal o los metadatos web app
- THEN el título incluye "Citas Glam" y el nombre de aplicación es "Citas Glam"

### Requirement: Marca en Interfaz de Usuario

Todas las pantallas públicas, de registro, login y administraciones MUST utilizar "Citas Glam" en sus encabezados, marcas de agua y títulos.

#### Scenario: Visualización del panel de administración

- GIVEN un usuario administrando el salón o la plataforma
- WHEN navega por el panel de control
- THEN el encabezado principal muestra "Citas Glam"

### Requirement: Marca en Comunicaciones por Correo

Todas las notificaciones transaccionales y correos del sistema MUST incluir "Citas Glam" en el remitente, encabezado y pie de página.

#### Scenario: Recepción de correo de confirmación

- GIVEN un cliente que recibe una notificación de cita
- WHEN abre el correo electrónico
- THEN el asunto y la firma identifican claramente a "Citas Glam"
