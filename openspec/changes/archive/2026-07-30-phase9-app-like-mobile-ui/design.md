# Diseño Técnico: Rediseño de Interfaz Móvil Tipo App (Fase 9)

## 1. Arquitectura de Componentes Responsivos Híbridos

Para ofrecer una experiencia de escritorio tradicional y una experiencia de app en móvil sin duplicar lógica de negocio, se implementarán wrappers o componentes adaptativos.

### 1.1 Layout de Viewport Fijo Móvil

En `app/s/[slug]/(protected)/layout.tsx`:

```tsx
<div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
  {/* Header Superior Fijo */}
  <header className="shrink-0 border-b bg-card px-4 py-3 sm:px-6">
    ...
  </header>

  {/* Área de Contenido Central Deslizable */}
  <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
    {children}
  </main>

  {/* Navegación Inferior Fija (Móvil) */}
  <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
    ...
  </nav>
</div>
```

### 1.2 Diálogos Adaptativos (Dialog en Desktop / Sheet en Móvil)

Crear un componente wrapper o utilizar `Sheet` con `side="bottom"` para pantallas móviles:

- En móvil (<768px): `<Sheet side="bottom">` que emerge desde abajo con bordes superiores redondeados (`rounded-t-xl`).
- En escritorio (≥768px): `<Dialog>` o `<Sheet side="right">`.

## 2. Slices de Entrega Sugeridos (4 Slices / PRs)

- **Slice 1 (PR 1):** Layout Base de Viewport Fijo `h-dvh`, Bottom Nav responsivo y Booking Público (`/book/[slug]`).
- **Slice 2 (PR 2):** Agenda de Citas (`/s/[slug]/appointments`) con Bottom Sheets (Reprogramar, Cancelar, Notas, Filtros segmentados).
- **Slice 3 (PR 3):** Clientes/CRM (`/s/[slug]/customers`) y Configuración (`/s/[slug]/settings`).
- **Slice 4 (PR 4):** Servicios, Especialistas y Pulido Final de Transiciones Táctiles.

## 3. Verificación y Calidad

- `npm test`: Asegurar que la suite (251+ pruebas) se mantenga en verde.
- `npx tsc --noEmit` y `npm run build`: Verificar tipos y compilación limpia.
- `npm run lint`: Mantener cero errores de linting.
