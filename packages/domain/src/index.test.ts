import { describe, expect, it } from 'vitest'
import { dateOnly, daysBetween, isCategoryId } from './index.js'

describe('provider calendar dates', () => {
  it('preserves leap days and does not drift across Italian DST', () => {
    expect(dateOnly('2024-02-29')).toBe('2024-02-29')
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })
  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '2026-01-00', '02/10/2026'])(
    'rejects %s',
    (value) => {
      expect(() => dateOnly(value)).toThrow()
    },
  )
  it('validates taxonomy without accepting prototype keys', () => {
    expect(isCategoryId('groceries')).toBe(true)
    expect(isCategoryId('__proto__')).toBe(false)
  })
})
