import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  updateSalonStatus: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('@/app/actions/admin', () => ({
  updateSalonStatus: mocks.updateSalonStatus,
}))

import { StatusControl } from './status-control'

describe('StatusControl', () => {
  it('offers only the three approved transitions and disables the current status', () => {
    const markup = renderToStaticMarkup(
      <StatusControl salonId="11111111-1111-4111-8111-111111111111" currentStatus="active" />,
    )

    expect(markup).toContain('Poner en Prueba')
    expect(markup).toContain('Activar')
    expect(markup).toContain('Suspender')
    expect(markup).not.toContain('Cancelar')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Activar<\/button>/)
  })

  it('keeps cancelled rows actionable through allowed non-destructive transitions', () => {
    const markup = renderToStaticMarkup(
      <StatusControl salonId="11111111-1111-4111-8111-111111111111" currentStatus="cancelled" />,
    )

    expect(markup).toContain('Poner en Prueba')
    expect(markup).toContain('Activar')
    expect(markup).toContain('Suspender')
    expect(markup).not.toContain('disabled=""')
    expect(markup).toContain('aria-live="polite"')
  })
})
