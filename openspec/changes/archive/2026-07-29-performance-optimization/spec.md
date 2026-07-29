# Especificación: Optimización de Rendimiento y Eliminación de Cascadas DB

## Propósito

Definir los requisitos de rendimiento para la capa de acceso a datos en Server Components y Server Actions, asegurando ejecuciones paralelas de consultas independientes y proyecciones de lectura eficientes.

## Requisitos

### Requirement: Lectura paralela en Server Components

Todos los Server Components que requieran consultar múltiples tablas o entidades independientes MUST ejecutar dichas consultas de manera concurrente utilizando `Promise.all()`.

#### Scenario: Carga de la agenda del salón

- GIVEN la página `/s/[slug]/appointments`
- WHEN se cargan las citas, especialistas y servicios del salón
- THEN el sistema ejecuta las 3 consultas en paralelo mediante `Promise.all()`
- AND el tiempo total de lectura no supera el tiempo de la consulta más lenta

#### Scenario: Carga de horarios del salón

- GIVEN la página `/s/[slug]/schedules`
- WHEN se cargan los horarios del salón, horarios de especialistas, lista de especialistas, fechas bloqueadas y franjas bloqueadas
- THEN el sistema ejecuta las 5 consultas en paralelo mediante `Promise.all()`

### Requirement: Evaluación de disponibilidad sin consultas N+1

La función `getAvailableSlots` en `lib/salons/availability.ts` MUST pre-cargar en una sola fase de lectura las horas de trabajo, bloqueos y citas existentes para el salón y el rango de fechas evaluado, en lugar de consultar la base de datos dentro de bucles por cada especialista candidato.

#### Scenario: Cálculo de slots para múltiples especialistas

- GIVEN una solicitud de disponibilidad para una fecha determinada
- WHEN el salón cuenta con múltiples especialistas
- THEN el sistema realiza las lecturas de bloqueos y horarios en lote antes del bucle de evaluación
- AND el resultado de slots disponibles coincide exactamente con el cálculo secuencial previo

### Requirement: Escritura paralela de horarios en lote

Las acciones de servidor `updateBusinessHours` y `updateSpecialistHours` en `app/actions/schedules.ts` MUST procesar los `upsert` de múltiples días o franjas en paralelo utilizando `Promise.all()`.

#### Scenario: Guardado del horario semanal

- GIVEN una solicitud para guardar el horario de los 7 días de la semana
- WHEN la acción procesa la lista de horarios
- THEN los 7 registros `upsert` se ejecutan simultáneamente en lugar de secuencialmente

### Requirement: Preservación de comportamiento y tipos

Las optimizaciones de rendimiento MUST NOT alterar los tipos de retorno exportados ni romper las firmas esperadas por los componentes cliente o de servidor. Toda consulta optimizada MUST seguir las reglas de validación y seguridad existentes (`requireSalonOwner`, `requireAdmin`, etc.).

## Criterios de Aceptación

1. Las lecturas de `app/[slug]/page.tsx`, `app/book/[slug]/page.tsx`, `app/s/[slug]/(protected)/appointments/page.tsx`, `app/s/[slug]/(protected)/schedules/page.tsx`, `app/s/[slug]/(protected)/services/page.tsx` y `app/s/[slug]/(protected)/specialists/page.tsx` se ejecutan en paralelo.
2. `getAvailableSlots` no realiza consultas a la base de datos dentro de bucles `for` por especialista.
3. `updateBusinessHours` y `updateSpecialistHours` guardan registros en paralelo.
4. La suite completa de pruebas unitarias (`npm test`) se mantiene 100% en verde.
