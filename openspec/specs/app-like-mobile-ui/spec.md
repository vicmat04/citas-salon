# Especificación de Dominio: Interfaz Móvil Tipo App

## Propósito

Definir las reglas y patrones de diseño responsivo e interacción táctil para la experiencia de usuario tipo aplicación nativa en Citas Glam.

## Requisitos

### Requirement: Layout de Viewport Fijo en Móvil (`h-dvh`)

En dispositivos móviles (ancho < 768px), el layout del salón y del booking público MUST fijar el puerto de visión a la altura exacta (`h-dvh` o `100dvh`), impidiendo el desplazamiento de la ventana global. El encabezado superior y la barra de navegación inferior MUST permanecer fijos, dejando únicamente el área central deslizable.

### Requirement: Paneles Emergentes Inferiores (*Bottom Sheets*)

En dispositivos móviles, las acciones que requieran captura de datos o confirmación (reprogramación, cancelación, notas internas, filtros y creación manual) MUST presentarse mediante componentes Bottom Sheet (`Sheet side="bottom"`), ocupando la parte inferior de la pantalla dentro de la zona de alcance del pulgar.

### Requirement: Listas Agrupadas y Estado Activo Táctil

Las tarjetas y listas de citas, clientes, servicios y especialistas en móvil MUST adoptar un diseño de lista agrupada (Inset List) con bordes suavizados, espaciado táctil mínimo de 44px por fila o botón, y respuesta visual activa (`active:scale-[0.98]`).

### Requirement: Controles Segmentados y Selectores Móviles

Los menús desplegables HTML `<select>` estándar en vistas móviles MUST ser reemplazados por controles segmentados horizontales (Segmented Controls) o botones de selección rápida con estados activo/inactivo diferenciados.

### Requirement: Adaptación Responsiva Híbrida

La aplicación MUST mantener la interfaz de escritorio en pantallas ≥768px (sidebar lateral completo, modales centrados `<Dialog>`), activando los patrones de App nativa (Bottom Nav, Bottom Sheets, `h-dvh`) únicamente en móviles (<768px).
