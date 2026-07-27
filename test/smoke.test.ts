import { describe, expect, it } from 'vitest'

describe('test foundation', () => {
  it('runs TypeScript tests in Node mode', () => {
    expect(typeof process.version).toBe('string')
    expect(typeof window).toBe('undefined')
  })
})
