# Exploración de Optimización de Rendimiento

## Contexto

El objetivo es optimizar el rendimiento de la aplicación eliminando cascadas de consultas a la base de datos (DB waterfalls) mediante el uso de `Promise.all`, añadiendo proyecciones explícitas con `select` y paralelizando escrituras seguras en bucles, todo esto antes de iniciar la Fase 9.

## Hallazgos de la Exploración

### 1. Server Components (Cascadas de Lectura)

Múltiples páginas de servidor realizan consultas secuenciales a Prisma (`await prisma...`), lo que bloquea el hilo e incrementa innecesariamente el tiempo de respuesta. Estas llamadas pueden y deben agruparse con `Promise.all`:

* **`app/s/[slug]/(protected)/schedules/page.tsx`**: Cascada de `businessHours`, `specialistHours`, `specialists`, `blockedDates`, `blockedSlots`.
* **`app/s/[slug]/(protected)/appointments/page.tsx`**: Cascada de `appointments`, `specialists`, `services`.
* **`app/s/[slug]/(protected)/services/page.tsx`**: Cascada de `categories`, `services`.
* **`app/[slug]/page.tsx`**: Cascada de `categories` y `services` (tras obtener el salón).
* **`app/book/[slug]/page.tsx`**: Cascada de `services` y `specialists`.
* **`app/s/[slug]/(protected)/customers/page.tsx` y `specialists/page.tsx`**: Consultas secuenciales adicionales.

### 2. Problema de N+1 (Consultas en Bucles en Lógica Core)

El motor de disponibilidad presenta un problema crítico de rendimiento de consultas iterativas en la base de datos:

* **`lib/salons/availability.ts` (`getAvailableSlots`)**: Dentro de un bucle `for (const spec of candidates)`, se ejecutan consultas `findFirst` y `findMany` a las tablas `blockedDate`, `blockedSlot`, y `appointment` por **cada** especialista evaluado.
* **`lib/salons/schedules.ts` (`resolveEffectiveSpecialistSchedule`)**: Invocado por el bucle anterior, lanza consultas `specialistHours.findUnique` y `businessHours.findUnique` en cada iteración.
* **Mitigación**: Extraer estas consultas del bucle. Es posible cargar todo el horario, bloques y citas de un día determinado para el salón (con una sola consulta usando `in: candidates.map(c=>c.id)` o filtrando a nivel de salón) y luego filtrar los datos en memoria para cada especialista.

### 3. Server Actions (Escrituras Paralelizables)

Se detectaron bucles con esperas secuenciales (`await`) para operaciones de guardado:

* **`app/actions/schedules.ts` (`updateBusinessHours` y `updateSpecialistHours`)**: Iteran sobre `hoursList` realizando un `await prisma.*.upsert(...)` secuencial por día.
* **Mitigación**: Sustituir el bucle asíncrono con `await Promise.all(hoursList.map(item => prisma.*.upsert(...)))`. Al operar en días distintos (`dayOfWeek`), las escrituras paralelas son seguras y no causarán bloqueos o conflictos en la base de datos.

### 4. Proyecciones Explícitas (`select`)

Varias consultas `findMany`, especialmente en las vistas públicas, solicitan la entidad completa sin necesitarlo:

* En **`app/book/[slug]/page.tsx`**: La obtención de `services` solicita todos los campos, enviando potencialmente información de auditoría o flags al cliente innecesariamente. Debe restringirse al `id`, `name`, `price`, `durationMinutes`, `bufferMinutes` y otros datos estrictamente presentacionales.

## Plan de Acción Recomendado (Próximos Pasos)

1. **Paralelización de Server Pages**: Refactorizar todas las rutas bajo `app/` para que empaqueten sus consultas independientes en un único bloque `Promise.all([...])`.
2. **Reingeniería del Motor de Disponibilidad**:
   * Modificar las funciones en `availability.ts` y `schedules.ts` para aceptar colecciones en memoria.
   * Realizar "Bulk Fetch" de reglas de negocio (`businessHours`, `specialistHours`, `blockedSlots`, etc.) fuera de los bucles iterativos.
3. **Paralelización de Server Actions**: Refactorizar las mutaciones `updateBusinessHours` y `updateSpecialistHours` usando map y `Promise.all`.
4. **Validación de Consultas Select**: Agregar bloques explícitos de `select: { ... }` en las consultas dirigidas al cliente público para aislar mejor el modelo de datos backend de la capa de renderizado.

## Riesgos y Consideraciones

* **Crecimiento de Memoria (OOM) en Disponibilidad**: Al cambiar la estrategia de lectura del N+1 a un enfoque "Bulk Fetch + In-Memory Filter", el número de registros cargados (citas y bloques por día) es bajo y manejable (decenas de registros). Mantener correctamente los filtros por fecha impedirá que el motor cargue el historial completo del salón en RAM.
* **Concurrencia en PostgreSQL (Prisma)**: Paralelizar muchos upserts simultáneos usando `Promise.all` abre múltiples conexiones/transacciones. Dado que `hoursList` tiene un máximo de 7 días a la vez, el pool de conexiones de Prisma absorberá la carga sin problemas y mejorará drásticamente la latencia.
