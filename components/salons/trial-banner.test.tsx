import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TrialBanner } from './trial-banner'

describe('TrialBanner', () => {
  it('shows a valid remaining day count and exact WhatsApp upgrade target', () => {
    const markup = renderToStaticMarkup(
      <TrialBanner salonName="Salón Ámbar" remainingDays={5} />,
    )

    expect(markup).toContain('5 días')
    expect(markup).toContain('href="https://wa.me/50767005805"')
  })

  it('never renders a negative trial day count', () => {
    const markup = renderToStaticMarkup(
      <TrialBanner salonName="Salón Ámbar" remainingDays={-3} />,
    )

    expect(markup).toContain('0 días')
    expect(markup).not.toContain('tiene <strong>-3')
  })
})
