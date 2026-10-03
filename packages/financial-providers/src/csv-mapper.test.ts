import { describe, expect, test } from 'vitest'
import {
  type CsvMapping,
  CsvMappingError,
  csvMappingDigest,
  inspectCsvLayout,
  MAX_MAPPED_CSV_BYTES,
  parseMappedCsv,
  previewMappedCsv,
  validateCsvMapping,
} from './csv-mapper.js'
import { normalizeTransaction } from './index.js'

const mapping: CsvMapping = {
  format: 'lilleri.csv-mapping.v1',
  delimiter: ';',
  numberLocale: 'it-IT',
  dateFormat: 'dd/MM/yyyy',
  columns: {
    externalId: 'ID',
    bookedOn: 'Data contabile',
    valueOn: 'Data valuta',
    amount: 'Importo',
    currency: 'Valuta',
    description: 'Descrizione',
    merchant: 'Esercente',
    reference: 'Riferimento',
  },
}
const header = 'ID;Data contabile;Data valuta;Importo;Valuta;Descrizione;Esercente;Riferimento\r\n'
const row = 'one;02/10/2026;03/10/2026;-1.234,56;EUR;Acquisto;Coop;ref-1'
const compact: CsvMapping = {
  format: 'lilleri.csv-mapping.v1',
  delimiter: ',',
  numberLocale: 'en-GB',
  dateFormat: 'yyyy-MM-dd',
  columns: { bookedOn: 'date', amount: 'amount', description: 'description' },
  defaultCurrency: 'EUR',
}
const compactHeader = 'date,amount,description\n'
const codes = (input: string, settings: unknown = mapping) =>
  previewMappedCsv(input, 'owned-account', settings).errors.map((error) => error.code)

describe('explicit locale-aware atomic CSV mapping', () => {
  test('header inspection supports the real mapper before a mapping exists without exposing financial cells', () => {
    const layout = inspectCsvLayout(header + row, ';')
    expect(layout.errors).toEqual([])
    expect(layout.header).toContain('Data contabile')
    expect(layout.rowCount).toBe(1)
    expect(JSON.stringify(layout)).not.toContain('Acquisto')
    expect(JSON.stringify(layout)).not.toContain('-1.234,56')
    expect(inspectCsvLayout('date,amount,description\n2026-10-02,-2.00', ',').errors).toEqual([
      { row: 2, column: null, code: 'column_count' },
    ])
    expect(inspectCsvLayout('""\n', ',').errors[0]?.code).toBe('invalid_header')
  })
  test('preserves Italian booking/value dates and parses grouped decimal comma into the real normalizer', () => {
    const preview = previewMappedCsv(header + row, 'owned-account', mapping)
    expect(preview.canImport).toBe(true)
    expect(preview.errors).toEqual([])
    expect(preview.rows[0]?.record).toMatchObject({
      id: 'csv:one',
      amount: '-1234.56',
      bookedOn: '2026-10-02',
      currency: 'EUR',
      source: 'csv',
      kind: 'expense',
    })
    expect(preview.rows[0]?.provenance).toMatchObject({
      rawBookedOn: '02/10/2026',
      rawValueOn: '03/10/2026',
      valueOn: '2026-10-03',
      identity: 'external',
      rawFields: { amount: '-1.234,56', bookedOn: '02/10/2026', valueOn: '03/10/2026' },
    })
    expect(preview.warnings).toContainEqual({
      row: 2,
      column: 'valueOn',
      code: 'value_date_provenance',
    })
    const record = preview.rows[0]?.record
    if (!record) throw new Error('Missing preview row')
    const normalized = normalizeTransaction(
      'csv-generic',
      { profileId: 'profile', connectionId: 'connection' },
      record,
      '2026-10-03T12:00:00.000Z',
    )
    expect(normalized.amount.amountMinor).toBe(-123456n)
    expect(normalized.bookedOn).toBe('2026-10-02')
  })

  test('supports UTF-8 BOM, RFC quoted separators, escaped quotes and multiline physical line errors', () => {
    const preview = previewMappedCsv(
      `\uFEFF${header}one;02/10/2026;;-1,20;EUR;"Caffè; ""Centro""\r\nseconda riga";Bar;ref\r\ntwo;30/02/2026;;2,00;EUR;Bad;Bar;`,
      'account',
      mapping,
    )
    expect(preview.errors).toContainEqual({ row: 4, column: 'bookedOn', code: 'invalid_date' })
    expect(preview.rows).toEqual([])
    const accepted = previewMappedCsv(
      `\uFEFF${header}one;02/10/2026;;-1,20;EUR;"Caffè; ""Centro""\r\nseconda riga";Bar;ref`,
      'account',
      mapping,
    )
    expect(accepted.rows[0]?.record.description).toBe('Caffè; "Centro"\r\nseconda riga')
  })

  test('does not guess delimiters or interpret a declared Italian thousands separator as a decimal point', () => {
    expect(codes(header.replaceAll(';', ',') + row.replaceAll(';', ','))).toContain(
      'missing_column',
    )
    const it = previewMappedCsv(header + row.replace('-1.234,56', '1.234'), 'account', mapping)
    expect(it.rows[0]?.record.amount).toBe('1234.00')
    const en = previewMappedCsv(
      'date,amount,description\n2026-10-02,1.234,Three decimals',
      'account',
      compact,
    )
    expect(en.errors.map((error) => error.code)).toContain('invalid_amount')
  })

  test('supports explicit en-GB number/date conventions and tab-separated files', () => {
    const tab: CsvMapping = {
      ...compact,
      delimiter: '\t',
      dateFormat: 'dd/MM/yyyy',
      defaultCurrency: 'GBP',
    }
    const result = previewMappedCsv(
      'date\tamount\tdescription\n02/10/2026\t-1,234.50\tTrain',
      'account',
      tab,
    )
    expect(result.rows[0]?.record).toMatchObject({
      amount: '-1234.50',
      currency: 'GBP',
      bookedOn: '2026-10-02',
    })
    expect(codes(header + row.replace('-1.234,56', '1,234.50'))).toContain('invalid_amount')
  })

  test('long Italian month names and a separate value-date format use real calendar validation', () => {
    const settings: CsvMapping = {
      ...mapping,
      dateFormat: 'long-it',
      valueDateFormat: 'yyyy-MM-dd',
    }
    const result = previewMappedCsv(
      header + row.replace('02/10/2026', '2 Ottobre 2026').replace('03/10/2026', '2026-10-03'),
      'account',
      settings,
    )
    expect(result.rows[0]?.record.bookedOn).toBe('2026-10-02')
    expect(result.rows[0]?.provenance.valueOn).toBe('2026-10-03')
    expect(
      codes(
        header + row.replace('02/10/2026', '29 febbraio 1900').replace('03/10/2026', '2026-10-03'),
        settings,
      ),
    ).toContain('invalid_date')
    const leap = previewMappedCsv(
      header + row.replace('02/10/2026', '29 febbraio 2000').replace('03/10/2026', '2000-03-01'),
      'account',
      settings,
    )
    expect(leap.rows[0]?.record.bookedOn).toBe('2000-02-29')
  })

  test('debit/credit columns preserve sign, zero inactive sides and the negative signed-64 boundary', () => {
    const settings: CsvMapping = {
      ...compact,
      delimiter: ';',
      numberLocale: 'it-IT',
      columns: { bookedOn: 'date', debit: 'Uscita', credit: 'Entrata', description: 'description' },
    }
    const result = previewMappedCsv(
      'date;Uscita;Entrata;description\n2026-10-02;12,30;0,00;Debit\n2026-10-03;;14,01;Credit\n2026-10-04;92.233.720.368.547.758,08;;Boundary',
      'account',
      settings,
    )
    expect(result.rows.map((value) => value.record.amount)).toEqual([
      '-12.30',
      '14.01',
      '-92233720368547758.08',
    ])
  })

  test.each(['1;2', '-1;', ';-2', '0;0', ';', '+1;'])(
    'rejects conflicting, missing or signed debit/credit sides %s',
    (amounts) => {
      const settings: CsvMapping = {
        ...compact,
        delimiter: ';',
        numberLocale: 'it-IT',
        columns: { bookedOn: 'date', debit: 'debit', credit: 'credit', description: 'description' },
      }
      expect(
        codes(`date;debit;credit;description\n2026-10-02;${amounts};Purchase`, settings),
      ).toContain('debit_credit_conflict')
    },
  )

  test.each([
    ['92233720368547758.07', 'EUR', '92233720368547758.07', true],
    ['-92233720368547758.08', 'EUR', '-92233720368547758.08', true],
    ['92233720368547758.08', 'EUR', '', false],
    ['-92233720368547758.09', 'EUR', '', false],
    ['1234', 'JPY', '1234', true],
    ['1.234', 'KWD', '1.234', true],
    ['1.2341', 'KWD', '', false],
    ['1.00', 'JPY', '1', true],
    ['1.01', 'JPY', '', false],
  ] as const)(
    'exact supported exponent and signed64 amount %s %s',
    (amount, currency, expected, valid) => {
      const settings = { ...compact, defaultCurrency: currency }
      const result = previewMappedCsv(
        `${compactHeader}2026-10-02,${amount},Exact`,
        'account',
        settings,
      )
      expect(result.canImport).toBe(valid)
      if (valid) expect(result.rows[0]?.record.amount).toBe(expected)
      else expect(result.rows).toEqual([])
    },
  )

  test.each([
    '1e3',
    '1 234,56',
    '12.34,56',
    '1.234.56',
    '€1,20',
    '1,2,3',
    'NaN',
    'Infinity',
    '(1,20)',
  ])('refuses rounding or undeclared amount conventions %s', (amount) => {
    expect(codes(header + row.replace('-1.234,56', amount))).toContain('invalid_amount')
  })

  test('external source IDs are required when mapped, repeated IDs are atomic errors and distinct identical coffees remain distinct', () => {
    const repeated = previewMappedCsv(
      `${header}${row}\n${row.replace('-1.234,56', '-2,00')}`,
      'account',
      mapping,
    )
    expect(repeated.errors).toContainEqual({ row: 3, column: 'externalId', code: 'duplicate_id' })
    expect(repeated.rows).toEqual([])
    expect(codes(header + row.replace('one;', ';'))).toContain('invalid_id')
    const distinct = previewMappedCsv(
      `${header}${row}\n${row.replace('one;', 'two;')}`,
      'account',
      mapping,
    )
    expect(distinct.rows).toHaveLength(2)
    expect(distinct.rows[0]?.provenance.contentFingerprint).toBe(
      distinct.rows[1]?.provenance.contentFingerprint,
    )
    expect(distinct.duplicateCandidates).toEqual([])
    expect(distinct.canImport).toBe(true)
  })

  test('generated file identities preserve repeated purchases and require explicit review without auto-merging', () => {
    const input = `${compactHeader}2026-10-02,-2.00,Coffee\n2026-10-02,-2.00,Coffee`
    const preview = previewMappedCsv(input, 'account', compact)
    expect(preview.canImport).toBe(false)
    expect(preview.errors).toEqual([])
    expect(preview.rows).toHaveLength(2)
    expect(preview.rows[0]?.record.id).not.toBe(preview.rows[1]?.record.id)
    expect(preview.duplicateCandidates[0]?.rowNumbers).toEqual([2, 3])
    expect(() => parseMappedCsv(input, 'account', compact)).toThrow(CsvMappingError)
    const accepted = parseMappedCsv(input, 'account', compact, {
      acknowledgeGeneratedDuplicates: true,
    })
    expect(accepted).toHaveLength(2)
    expect(accepted.map((value) => value.record.id)).toEqual(
      preview.rows.map((value) => value.record.id),
    )
    const changedFile = previewMappedCsv(`${input}\n`, 'account', compact)
    expect(changedFile.rows[0]?.record.id).not.toBe(preview.rows[0]?.record.id)
    expect(changedFile.rows[0]?.provenance.contentFingerprint).toBe(
      preview.rows[0]?.provenance.contentFingerprint,
    )
  })

  test('literal spreadsheet formula text stays unchanged and is warned, while numeric formulas are rejected', () => {
    const text = '"=HYPERLINK(""https://example.test"",""label"")"'
    const preview = previewMappedCsv(`${compactHeader}2026-10-02,-2.00,${text}`, 'account', compact)
    expect(preview.rows[0]?.record.description).toBe('=HYPERLINK("https://example.test","label")')
    expect(preview.warnings).toContainEqual({
      row: 2,
      column: 'description',
      code: 'literal_formula_text',
    })
    expect(codes(`${compactHeader}2026-10-02,=1+2,Formula`, compact)).toContain('invalid_amount')
  })

  test('status translations are declared exactly and unknown states never default to booked', () => {
    const settings: CsvMapping = {
      ...compact,
      columns: { ...compact.columns, status: 'state' },
      statusValues: { Contabilizzato: 'booked', Provvisorio: 'pending', Stornato: 'reversed' },
    }
    const preview = previewMappedCsv(
      'date,amount,description,state\n2026-10-02,-2.00,Pending,Provvisorio\n2026-10-02,2.00,Reversal,Stornato',
      'account',
      settings,
    )
    expect(preview.rows.map((value) => value.record.status)).toEqual(['pending', 'reversed'])
    expect(
      codes('date,amount,description,state\n2026-10-02,-2.00,Unknown,provvisorio', settings),
    ).toContain('invalid_status')
  })

  test('normalised exact headers reject blanks/collisions and malformed RFC quotes atomically', () => {
    expect(codes('date,amount,description,\n2026-10-02,-2.00,Text,', compact)).toContain(
      'invalid_header',
    )
    expect(
      codes('date,amount, description ,description\n2026-10-02,-2.00,Text,Other', compact),
    ).toContain('invalid_header')
    expect(codes('""\n', compact)).toContain('invalid_header')
    expect(codes(`${compactHeader}2026-10-02,-2.00,"closed"suffix`, compact)).toContain(
      'malformed_csv',
    )
    expect(codes(`${compactHeader}2026-10-02,-2.00,un"quoted`, compact)).toContain('malformed_csv')
    expect(codes(`${compactHeader}2026-10-02,-2.00,"unclosed`, compact)).toContain('malformed_csv')
    expect(codes(`${compactHeader}2026-10-02,-2.00`, compact)).toContain('column_count')
    expect(codes(compactHeader, compact)).toContain('empty_rows')
  })

  test('mapping validation rejects mixed amount modes, currency ambiguity, unknown keys and reused columns', () => {
    for (const settings of [
      { ...compact, unexpected: true },
      { ...compact, columns: { ...compact.columns, debit: 'debit', credit: 'credit' } },
      { ...compact, columns: { bookedOn: 'date', description: 'description', debit: 'debit' } },
      { ...compact, columns: { ...compact.columns, currency: 'currency' } },
      { ...compact, defaultCurrency: undefined },
      { ...compact, columns: { ...compact.columns, externalId: 'date' } },
      { ...compact, columns: { ...compact.columns, hidden: 'hidden' } },
      { ...compact, valueDateFormat: 'yyyy-MM-dd' },
      { ...compact, dateFormat: 'long-it' },
      { ...compact, statusValues: { completed: 'booked' } },
      { ...compact, defaultCurrency: 'XYZ' },
    ])
      expect(() => validateCsvMapping(settings)).toThrow(CsvMappingError)
    const differentOrder = {
      columns: { description: 'description', amount: 'amount', bookedOn: 'date' },
      defaultCurrency: 'EUR',
      dateFormat: 'yyyy-MM-dd',
      numberLocale: 'en-GB',
      delimiter: ',',
      format: 'lilleri.csv-mapping.v1',
    }
    expect(csvMappingDigest(validateCsvMapping(differentOrder))).toBe(csvMappingDigest(compact))
  })

  test('bounds UTF-8 bytes, rows and columns, rejects NUL/surrogates/interior BOM and exposes no partial rows', () => {
    const oversized = previewMappedCsv(
      `${compactHeader}${'é'.repeat(MAX_MAPPED_CSV_BYTES / 2)}`,
      'account',
      compact,
    )
    expect(oversized.errors[0]?.code).toBe('file_limit')
    expect(oversized.fileDigest).toBeNull()
    expect(codes(`${compactHeader}${'2026-10-02,-1.00,Row\n'.repeat(1001)}`, compact)).toContain(
      'row_limit',
    )
    expect(
      codes(`${Array.from({ length: 65 }, (_, index) => `h${index}`).join(',')}\n`, compact),
    ).toContain('column_limit')
    for (const input of ['\u0000', '\ud800', '\uFEFF'])
      expect(codes(`${compactHeader}2026-10-02,-2.00,${input}`, compact)).toContain(
        'invalid_character',
      )
    expect(codes(header + row.replace('EUR', `${' '.repeat(64)}EUR`))).toContain('invalid_currency')
    expect(codes(header + row.replace('03/10/2026', ' '.repeat(65)))).toContain('invalid_date')
    const atomic = previewMappedCsv(
      `${compactHeader}2026-10-02,-2.00,Valid\n2026-02-30,-3.00,Invalid`,
      'account',
      compact,
    )
    expect(atomic.rowCount).toBe(2)
    expect(atomic.rows).toEqual([])
    expect(() =>
      parseMappedCsv(`${compactHeader}2026-02-30,-3.00,Invalid`, 'account', compact, {
        acknowledgeGeneratedDuplicates: true,
      }),
    ).toThrow(CsvMappingError)
  })
})
