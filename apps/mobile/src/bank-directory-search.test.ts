import { describe, expect, it } from 'vitest'
import { bankServiceCountry, filterBankServices, matchesBankService } from './bank-directory-search'

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

  it('finds market names in either language without confusing countries', () => {
    const germanIng = { name: 'ING', aliases: ['ING Deutschland'], countryCode: 'DE' }
    expect(matchesBankService(germanIng, 'ing germania')).toBe(true)
    expect(matchesBankService(germanIng, 'Germany')).toBe(true)
    expect(matchesBankService(germanIng, 'ing germany')).toBe(true)
    expect(matchesBankService(germanIng, 'France')).toBe(false)
    expect(
      matchesBankService({ name: 'ABN AMRO', aliases: [], countryCode: 'NL' }, 'Paesi Bassi'),
    ).toBe(true)
    expect(
      matchesBankService({ name: 'Lloyds Bank', aliases: [], countryCode: 'GB' }, 'United Kingdom'),
    ).toBe(true)
    expect(matchesBankService({ name: 'Lloyds Bank', aliases: [], countryCode: 'GB' }, 'ing')).toBe(
      false,
    )
    expect(
      matchesBankService({ name: 'BNP Paribas', aliases: [], countryCode: 'FR' }, 'Fran'),
    ).toBe(true)
  })

  it('intersects market, service type and query for duplicate brands', () => {
    const entries = [
      { id: 'ing', name: 'ING', aliases: [], kind: 'bank', countryCode: 'IT' },
      { id: 'ing-de', name: 'ING', aliases: [], kind: 'bank', countryCode: 'DE' },
      {
        id: 'amex-de',
        name: 'American Express',
        aliases: ['Amex'],
        kind: 'card',
        countryCode: 'DE',
      },
      { id: 'lloyds-gb', name: 'Lloyds Bank', aliases: [], kind: 'bank', countryCode: 'GB' },
    ]
    const ids = (query: string, kind: string, country: string) =>
      filterBankServices(entries, query, kind, country).map((entry) => entry.id)
    expect(ids('', 'all', 'IT')).toEqual(['ing'])
    expect(ids('ing', 'all', 'all')).toEqual(['ing', 'ing-de'])
    expect(ids('ing', 'all', 'DE')).toEqual(['ing-de'])
    expect(ids('Germany', 'bank', 'all')).toEqual(['ing-de'])
    expect(ids('', 'card', 'DE')).toEqual(['amex-de'])
    expect(ids('Germany', 'all', 'IT')).toEqual([])
    expect(ids('', 'all', 'all')).toHaveLength(4)
  })

  it('keeps legacy Italian responses usable without market fields', () => {
    const italian = { name: 'Intesa Sanpaolo', aliases: [], kind: 'bank' }
    expect(bankServiceCountry(italian)).toBe('IT')
    expect(filterBankServices([italian], 'Italy', 'all', 'IT')).toEqual([italian])
    expect(filterBankServices([italian], '', 'all', 'FR')).toEqual([])
  })

  it('does not relabel an unrecognised explicit market as Italian', () => {
    const otherMarket = { name: 'Example Bank', aliases: [], kind: 'bank', countryCode: 'XX' }
    expect(bankServiceCountry(otherMarket)).toBe('XX')
    expect(filterBankServices([otherMarket], '', 'all', 'IT')).toEqual([])
    expect(filterBankServices([otherMarket], '', 'all', 'all')).toEqual([otherMarket])
    expect(matchesBankService(otherMarket, 'Italy')).toBe(false)
  })
})
