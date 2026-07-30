# Especificación: Rediseño de Interfaz Móvil Tipo App - Citas Glam (Fase 9)

## Propósito

Definir los requisitos de interfaz de usuario y usabilidad para la transformación de Citas Glam en una experiencia tipo aplicación nativa en dispositivos móviles.

## Requisitos

### Requirement: Layout de Viewport Fijo en Móvil (`h-dvh`)

En dispositivos móviles (ancho de pantalla < 768px), el layout del salón (`app/s/[slug]/(protected)/layout.tsx`) y del booking público MUST fijar el contenedor principal a la altura exacta del puerto de visión (`h-dvh` o `100dvh`), impidiendo el desplazamiento de la ventana global. El encabezado superior y la barra de navegación inferior MUST permanecer fijos, dejando únicamente el área central deslizable.

#### Scenario: Navegación en dispositivo móvil

- GIVEN un usuario accediendo a Citas Glam desde un dispositivo móvil
- WHEN navega por la agenda o el booking público
- THEN el encabezado y la barra de navegación permanecen inmóviles en pantalla
- AND el contenido de la sección se desplaza de forma independiente en la zona central

### Requirement: Paneles Emergentes Inferiores (*Bottom Sheets*)

En dispositivos móviles, las acciones que requieran captura de datos o confirmación (reprogramación, cancelación, notas internas, filtros de agenda y creación manual) MUST presentarse mediante componentes de tipo Bottom Sheet (`Sheet side="bottom"` o `Drawer`), ocupando la parte inferior de la pantalla dentro de la zona de alcance del pulgar.

#### Scenario: Apertura del diálogo de reprogramación en móvil

- GIVEN un usuario gestionando una cita desde la agenda en móvil
- WHEN presiona el botón "Reprogramar"
- THEN se despliega un panel desde la parte inferior de la pantalla (Bottom Sheet)
- AND los controles de selección de fecha y hora son fácilmente manipulables con una sola mano

### Requirement: Listas Agrupadas y Estado Activo Táctil

Las tarjetas y listas de citas, clientes, servicios y especialistas en móvil MUST adoptar un diseño de lista agrupada (Inset List) con bordes suavizados, espaciado táctil mínimo de 44px por fila o botón, y respuesta visual activa (`active:scale-[0.98]` o cambio de opacidad al presionar).

#### Scenario: Interacción con tarjeta de cita

- GIVEN la lista de citas en la agenda móvil
- WHEN el usuario toca una cita o botón de acción rápida
- THEN el elemento proporciona retroalimentación táctil visual inmediata al presionar
- AND el tamaño del botón evita pulsaciones erróneas contiguas

### Requirement: Controles Segmentados y Selectores Móviles

Los menús desplegables HTML `<select>` estándar en vistas móviles MUST ser reemplazados por controles segmentados horizontales (Segmented Controls) o botones de selección rápida con estados activo/inactivo claramente diferenciados.

#### Scenario: Filtrado por estado en la agenda

- GIVEN la agenda de citas en móvil
- WHEN el usuario cambia el filtro de citas
- THEN el selector presenta botones o pestañas de toque directo en lugar de abrir el menú desplegable nativo del sistema operativo

### Requirement: Adaptación Responsiva Híbrida

La aplicación MUST mantener la interfaz de escritorio en pantallas ≥768px (sidebar lateral completo, modales centrados `<Dialog>`), activando los patrones de App nativa (Bottom Nav, Bottom Sheets, `h-dvh`) únicamente cuando el ancho sea inferior a 768px.

#### Scenario: Cambio de tamaño de ventana de escritorio a móvil

- GIVEN la aplicación abierta en un navegador web
- WHEN se reduce el ancho de la ventana por debajo de 768px
- THEN el sidebar se oculta y se activa la navegación inferior fija
- AND los modales cambian a formato Bottom Sheet
