import { dateOnly } from '@lilleri/domain'
import { assertCurrencyCode, parseDecimal } from '@lilleri/money'
import type { ProviderTransaction } from './index.js'

/** Strict, bounded bank CSV subset. Each source row must supply a stable identity. */
export function parseBankCsv(input: string, accountId: string): ProviderTransaction[] {
  if (input.length > 262_144) throw new Error('CSV exceeds 256 KiB limit')
  const rows: string[][] = []
  let row: string[] = [],
    cell = '',
    quoted = false,
    closedQuote = false
  for (let index = 0; index < input.length; index++) {
    const character = input[index]
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"'
        index++
      } else if (character === '"') {
        quoted = false
        closedQuote = true
      } else cell += character
    } else if (character === '"' && !cell && !closedQuote) quoted = true
    else if (character === ',' || character === '\n' || character === '\r') {
      row.push(cell)
      cell = ''
      closedQuote = false
      if (character !== ',') {
        if (character === '\r' && input[index + 1] === '\n') index++
        if (row.some((value) => value.length > 0)) rows.push(row)
        row = []
      }
    } else {
      if (closedQuote) throw new Error('Unexpected character after CSV quote')
      if (character === '"') throw new Error('Quote inside an unquoted field')
      cell += character
    }
  }
  if (quoted) throw new Error('Unclosed CSV quote')
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  const header = rows.shift()
  if (
    header?.join(',').replace(/^\uFEFF/, '') !==
    'id,date,amount,currency,description,merchant,reference'
  )
    throw new Error('Expected CSV header: id,date,amount,currency,description,merchant,reference')
  if (rows.length > 1_000) throw new Error('CSV exceeds 1000-row limit')
  const identities = new Set<string>()
  return rows.map((fields, index) => {
    if (fields.length !== 7) throw new Error(`Wrong column count at row ${index + 2}`)
    if (fields.some((field) => field.includes('\u0000')))
      throw new Error(`Invalid NUL character at row ${index + 2}`)
    const [
      id = '',
      date = '',
      amount = '',
      currency = '',
      description = '',
      merchant = '',
      reference = '',
    ] = fields
    if (
      !id ||
      !description ||
      id.length > 128 ||
      description.length > 1024 ||
      merchant.length > 256 ||
      reference.length > 256
    )
      throw new Error(`Invalid identity or description at row ${index + 2}`)
    if (identities.has(id)) throw new Error(`Repeated source identity at row ${index + 2}`)
    identities.add(id)
    const currencyCode = assertCurrencyCode(currency)
    const parsed = parseDecimal(amount, currency)
    return {
      id: `csv:${id}`,
      accountId,
      bookedOn: dateOnly(date),
      amount,
      currency: currencyCode,
      description,
      status: 'booked',
      source: 'csv',
      kind: parsed.amountMinor < 0n ? 'expense' : 'income',
      ...(merchant ? { merchantName: merchant } : {}),
      ...(reference ? { reference } : {}),
    }
  })
}
