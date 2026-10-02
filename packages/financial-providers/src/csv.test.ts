import { describe, expect, it } from 'vitest'
import { parseBankCsv } from './csv.js'

const header = 'id,date,amount,currency,description,merchant,reference\r\n'
describe('bounded financial CSV import', () => {
  it('parses quoted commas and escaped quotes with exact decimal strings', () => {
    const records = parseBankCsv(
      `${header}row1,2026-10-02,-84.30,EUR,"Coop, Firenze","Coop ""Centro""",ref1`,
      'account',
    )
    expect(records[0]).toMatchObject({
      id: 'csv:row1',
      amount: '-84.30',
      accountId: 'account',
      description: 'Coop, Firenze',
      merchantName: 'Coop "Centro"',
      source: 'csv',
    })
  })
  it('preserves repeated purchases with distinct source IDs', () => {
    const records = parseBankCsv(
      `${header}1,2026-10-02,-2.00,EUR,Bar,Bar,\n2,2026-10-02,-2.00,EUR,Bar,Bar,`,
      'account',
    )
    expect(records).toHaveLength(2)
  })
  it('rejects repeated source IDs instead of overwriting a transaction', () => {
    expect(() =>
      parseBankCsv(
        `${header}1,2026-10-02,-2.00,EUR,Bar,Bar,\n1,2026-10-02,-3.00,EUR,Bar,Bar,`,
        'account',
      ),
    ).toThrow('Repeated')
  })
  it.each([
    '1,2026-02-30,-2.00,EUR,Bar,Bar,',
    '1,2026-10-02,-2.001,EUR,Bar,Bar,',
    '1,2026-10-02,-2.00,XYZ,Bar,Bar,',
    '1,2026-10-02,-2.00,EUR,"Unclosed,Bar,',
  ])('rejects malformed row %s', (row) => {
    expect(() => parseBankCsv(header + row, 'account')).toThrow()
  })
  it('does not accept delimiter guessing or a missing stable ID', () => {
    expect(() => parseBankCsv('date;amount;description\n2026-10-02;-2.00;Bar', 'account')).toThrow(
      'header',
    )
    expect(() => parseBankCsv(`${header},2026-10-02,-2.00,EUR,Bar,Bar,`, 'account')).toThrow(
      'identity',
    )
  })
})
