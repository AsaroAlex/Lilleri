import { describe, expect, it } from 'vitest'
import { matchesBankService } from './bank-directory-search'

describe('bank directory search', () => {
  it('finds Italian bank names with accents, spacing and punctuation differences', () => {
    const creditAgricole = { name: 'Crédit Agricole Italia', aliases: ['Cariparma'] }
    expect(matchesBankService(creditAgricole, 'credit agricole')).toBe(true)
    expect(matchesBankService(creditAgricole, 'CREDIT  AGRICOLE')).toBe(true)
    expect(matchesBankService(creditAgricole, 'cariparma')).toBe(true)
    expect(matchesBankService({ name: 'UniCredit', aliases: [] }, 'Uni Credit')).toBe(true)
    expect(matchesBankService({ name: 'Banco BPM', aliases: ['BPM'] }, 'B.P.M.')).toBe(true)
  })

  it('finds service aliases while requiring every separate query term', () => {
    const amex = { name: 'American Express', aliases: ['Amex', 'American Express Italia'] }
    expect(matchesBankService(amex, 'amex')).toBe(true)
    expect(matchesBankService(amex, 'italia american')).toBe(true)
    expect(matchesBankService(amex, 'amex satispay')).toBe(false)
    expect(matchesBankService({ name: 'Satispay', aliases: [] }, 'American')).toBe(false)
  })

  it('keeps the full directory visible for an empty or punctuation-only query', () => {
    const service = { name: 'Intesa Sanpaolo', aliases: [] }
    expect(matchesBankService(service, '')).toBe(true)
    expect(matchesBankService(service, '  ')).toBe(true)
    expect(matchesBankService(service, '…')).toBe(true)
  })
})
