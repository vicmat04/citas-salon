# Propuesta: Optimización de Rendimiento y Eliminación de Cascadas DB (performance-optimization)

## Intención y problema

La aplicación presenta latencia perceptible durante la navegación y el cálculo de disponibilidad de citas. La causa principal es la ejecución secuencial (*waterfalls*) de consultas independientes a la base de datos PostgreSQL tanto en Server Components como en Server Actions, sumado a bucles de consultas N+1 en la evaluación de especialistas para disponibilidad y escrituras secuenciales en la configuración de horarios.

Este cambio optimizará el rendimiento de la capa de datos eliminando cascadas, aplicando proyecciones de lectura acotadas y paralelizando consultas independientes, garantizando la preservación al 100% del comportamiento funcional y los contratos de datos existentes.

## Objetivos

1. **Paralelización de Lecturas en Server Components:** Convertir consultas secuenciales independientes en ejecuciones concurrentes mediante `Promise.all()` en todas las páginas públicas y protegidas.
2. **Optimización del Motor de Disponibilidad (`getAvailableSlots`):** Pre-cargar en lote (*bulk-fetch*) las horas de trabajo, bloqueos y citas existentes para el rango de fechas evaluado, eliminando la ejecución de consultas repetidas dentro de bucles por especialista.
3. **Paralelización de Escrituras en Lote:** Convertir bucles iterativos de `upsert` secuenciales (como actualización de horarios laborables) en ejecuciones concurrentes aisladas.
4. **Proyecciones de Datos Acotadas (`select`):** Reemplazar consultas que retornan entidades completas por proyecciones `select` que transfieran únicamente las columnas requeridas por los componentes.

## Alcance funcional y áreas afectadas

- `app/[slug]/page.tsx`: Carga paralela de categorías y servicios.
- `app/book/[slug]/page.tsx`: Carga paralela de servicios y especialistas.
- `app/s/[slug]/(protected)/appointments/page.tsx`: Carga paralela de citas, especialistas y servicios.
- `app/s/[slug]/(protected)/schedules/page.tsx`: Carga paralela de `businessHours`, `specialistHours`, `specialists`, `blockedDates` y `blockedSlots`.
- `app/s/[slug]/(protected)/services/page.tsx`: Carga paralela de categorías y servicios.
- `app/s/[slug]/(protected)/specialists/page.tsx`: Carga paralela de especialistas y servicios.
- `lib/salons/availability.ts`: Optimización de `getAvailableSlots` evitando consultas N+1 por especialista.
- `app/actions/schedules.ts`: Paralelización de `upsert` en `updateBusinessHours` y `updateSpecialistHours`.
- `app/actions/{appointments,booking,admin,owner,services}.ts`: Paralelización de consultas independientes dentro de acciones.

## No objetivos

- Introducir capas de caché externas como Redis o Memcached.
- Rediseñar componentes o layouts visuales (se realizará en la Fase 9).
- Modificar el esquema de la base de datos o migraciones de Prisma.
- Alterar la lógica de negocio o reglas de cálculo de slots de disponibilidad.

## Criterios de éxito y verificación

1. Toda la suite de pruebas automatizadas (`npm test` con 251+ pruebas) debe pasar en verde sin regresiones.
2. Verificación de compilación y tipos de TypeScript (`npx tsc --noEmit` y `npm run build`) en verde.
3. Reducción medible del número de rondas de consulta a la base de datos por solicitud de página.
