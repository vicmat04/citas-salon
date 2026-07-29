# Diseño Técnico: Optimización de Rendimiento y Eliminación de Cascadas DB

## 1. Estrategia de Paralelización de Lecturas

En Next.js App Router, ejecutar declaraciones `await` consecutivas en Server Components bloquea la ejecución en cascada.

### Patrón Actual (Secuencial - Lento)

```ts
const appointments = await prisma.appointment.findMany(...);
const specialists = await prisma.specialist.findMany(...);
const services = await prisma.service.findMany(...);
```

### Patrón Optimizado (Paralelo - Rápido)

```ts
const [appointments, specialists, services] = await Promise.all([
  prisma.appointment.findMany(...),
  prisma.specialist.findMany(...),
  prisma.service.findMany(...),
]);
```

## 2. Optimización de Disponibilidad en `lib/salons/availability.ts`

Actualmente `getAvailableSlots` realiza consultas por especialista dentro de un mapa o bucle.

Refactorización:

- Realizar `businessHours.findMany`, `specialistHours.findMany`, `blockedDate.findMany`, `blockedSlot.findMany` y `appointment.findMany` en un único `Promise.all()` al inicio de la función.
- Filtrar la información en memoria por especialista durante la evaluación de cada slot.

## 3. Paralelización de Escritura de Horarios en `app/actions/schedules.ts`

Reemplazar bucles `for...of` secuenciales:

```ts
await Promise.all(
  scheduleItems.map((item) =>
    prisma.businessHours.upsert({ ... })
  )
);
```

## 4. Archivos Afectados

- `app/[slug]/page.tsx`
- `app/book/[slug]/page.tsx`
- `app/s/[slug]/(protected)/appointments/page.tsx`
- `app/s/[slug]/(protected)/schedules/page.tsx`
- `app/s/[slug]/(protected)/services/page.tsx`
- `app/s/[slug]/(protected)/specialists/page.tsx`
- `lib/salons/availability.ts`
- `app/actions/schedules.ts`
- `app/actions/owner.ts`
- `app/actions/services.ts`
- `app/actions/admin.ts`

## 5. Plan de Verificación

- `npm test`: Verificar que las 31 suites de pruebas se mantengan verdes.
- `npx tsc --noEmit`: Confirmar compatibilidad de tipos estáticos.
- `npm run build`: Confirmar que las páginas estáticas y dinámicas compilen sin errores.
