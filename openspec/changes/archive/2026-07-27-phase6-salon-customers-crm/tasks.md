# Plan de Tareas: Gestión de Clientes y CRM del Salón (Fase 6)

## Pronóstico de Carga de Revisión

| Campo | Valor |
| --- | --- |
| Líneas estimadas | 650–1,000 |
| Riesgo de presupuesto 400 líneas | Alto |
| PRs Encadenadas Recomendadas | Sí |
| División sugerida | PR 1: Server Actions de clientes y tests. PR 2: Navegación y modal de creación de cliente. PR 3: Directorio interactivo CRM y ficha del cliente. |

---

## Tareas

### PR 1: Server Actions de Clientes y Pruebas

- [ ] Crear `app/actions/customers.ts` con `createCustomer` (soporta detección de duplicados por teléfono/email), `updateCustomer` (edita datos y notas) y `deleteCustomer` (elimina cliente conservando citas).
- [ ] Crear `app/actions/customers.test.ts` evaluando la creación, detección de duplicados, edición de notas y aislación multi-tenant.

### PR 2: Navegación y Modal de Creación de Cliente

- [ ] Actualizar `app/s/[slug]/(protected)/layout.tsx` agregando la pestaña "Clientes" (`/s/${slug}/customers`) en la navegación lateral y móvil.
- [ ] Crear `app/s/[slug]/(protected)/customers/create-customer-dialog.tsx` para agregar clientes manualmente con aviso de duplicados.

### PR 3: Directorio Interactivo CRM y Ficha del Cliente

- [ ] Crear `app/s/[slug]/(protected)/customers/page.tsx` calculando métricas reales desde Prisma (`totalSpent` de citas `completed`, `completedCount`, `noShowCount`, `lastVisitDate`).
- [ ] Crear `app/s/[slug]/(protected)/customers/customers-view.tsx` con buscador en tiempo real, pestañas (Todos, Cumpleañeros, Frecuentes), tarjetas adaptativas y modal de ficha e historial del cliente.
- [ ] Ejecutar la suite completa de pruebas (`npx vitest run`) y verificar TypeScript (`npx tsc --noEmit`).
