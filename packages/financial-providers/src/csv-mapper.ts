import { createHash } from 'node:crypto'
import { dateOnly } from '@lilleri/domain'
import {
  assertCurrencyCode,
  type CurrencyCode,
  parseDecimal,
  toDecimalString,
} from '@lilleri/money'
import type { ProviderTransaction } from './index.js'

export const MAX_MAPPED_CSV_BYTES = 256 * 1024
export const MAX_MAPPED_CSV_ROWS = 1_000
const MAX_COLUMNS = 64
const MIN_AMOUNT_MINOR = -(1n << 63n)
const MAX_AMOUNT_MINOR = (1n << 63n) - 1n
export type CsvDateFormat = 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'long-it'
export interface CsvColumns {
  readonly externalId?: string
  readonly bookedOn: string
  readonly valueOn?: string
  readonly description: string
  readonly amount?: string
  readonly debit?: string
  readonly credit?: string
  readonly currency?: string
  readonly merchant?: string
  readonly reference?: string
  readonly status?: string
}
export interface CsvMapping {
  readonly format: 'lilleri.csv-mapping.v1'
  readonly delimiter: ',' | ';' | '\t'
  readonly numberLocale: 'it-IT' | 'en-GB'
  readonly dateFormat: CsvDateFormat
  readonly valueDateFormat?: CsvDateFormat
  readonly columns: CsvColumns
  readonly defaultCurrency?: CurrencyCode
  /** Raw status strings are exact, case-sensitive values; no inference from descriptions. */
  readonly statusValues?: Readonly<Record<string, ProviderTransaction['status']>>
}
export interface CsvImportIssue {
  /** Physical starting line of the record, including multiline quoted records; null is file-level. */
  readonly row: number | null
  readonly column: keyof CsvColumns | null
  readonly code:
    | 'file_limit'
    | 'row_limit'
    | 'column_limit'
    | 'invalid_character'
    | 'malformed_csv'
    | 'invalid_header'
    | 'empty_rows'
    | 'missing_column'
    | 'column_count'
    | 'invalid_mapping'
    | 'invalid_account'
    | 'invalid_id'
    | 'duplicate_id'
    | 'invalid_date'
    | 'invalid_currency'
    | 'invalid_amount'
    | 'amount_range'
    | 'debit_credit_conflict'
    | 'invalid_description'
    | 'invalid_text'
    | 'invalid_status'
    | 'duplicate_review_required'
}
export interface CsvImportWarning {
  readonly row: number | null
  readonly column: keyof CsvColumns | null
  readonly code: 'generated_file_identity' | 'literal_formula_text' | 'value_date_provenance'
}
export interface MappedCsvRow {
  readonly rowNumber: number
  readonly record: ProviderTransaction
  readonly provenance: {
    readonly identity: 'external' | 'file_content_ordinal'
    readonly sourceExternalId: string | null
    readonly contentFingerprint: string
    readonly occurrence: number
    readonly rawBookedOn: string
    readonly rawValueOn: string | null
    /** Original mapped cells for immutable source observation; numeric/date normalisation is reversible. */
    readonly rawFields: Readonly<Partial<Record<keyof CsvColumns, string>>>
    /** Explicit calendar date; never substituted for the booking date. */
    readonly valueOn: string | null
  }
}
export interface CsvDuplicateCandidate {
  readonly contentFingerprint: string
  readonly rowNumbers: readonly number[]
  readonly reason: 'same_content_without_external_id'
}
export interface CsvImportPreview {
  readonly format: 'lilleri.csv-preview.v1'
  readonly fileDigest: string | null
  readonly mappingDigest: string | null
  readonly header: readonly string[]
  readonly rowCount: number
  /** Any error returns no records, so callers cannot ingest a partial valid subset. */
  readonly rows: readonly MappedCsvRow[]
  readonly errors: readonly CsvImportIssue[]
  readonly warnings: readonly CsvImportWarning[]
  readonly duplicateCandidates: readonly CsvDuplicateCandidate[]
  readonly canImport: boolean
}
export class CsvMappingError extends Error {
  readonly code = 'invalid_csv_mapping'
  constructor(readonly issues: readonly CsvImportIssue[]) {
    super('CSV import requires a valid mapping, complete rows and explicit duplicate review')
    this.name = 'CsvMappingError'
  }
}
export interface CsvLayout {
  readonly format: 'lilleri.csv-layout.v1'
  readonly fileDigest: string | null
  readonly header: readonly string[]
  readonly rowCount: number
  readonly errors: readonly CsvImportIssue[]
}
const issue = (
  code: CsvImportIssue['code'],
  row: number | null = null,
  column: keyof CsvColumns | null = null,
): CsvImportIssue => ({ row, column, code })
function fail(
  code: CsvImportIssue['code'],
  row?: number | null,
  column?: keyof CsvColumns | null,
): never {
  throw new CsvMappingError([issue(code, row ?? null, column ?? null)])
}
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const DATE_FORMATS: readonly CsvDateFormat[] = ['dd/MM/yyyy', 'yyyy-MM-dd', 'long-it']
const COLUMN_KEYS = [
  'externalId',
  'bookedOn',
  'valueOn',
  'description',
  'amount',
  'debit',
  'credit',
  'currency',
  'merchant',
  'reference',
  'status',
] as const
const cleanHeader = (value: string) => value.trim().normalize('NFC')
function hasControl(value: string) {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code < 32 || code === 127) return true
  }
  return false
}
function headerName(value: unknown): string {
  if (typeof value !== 'string') fail('invalid_mapping')
  const name = cleanHeader(value)
  if (!name || name.length > 128 || hasControl(name) || name.includes('\uFEFF'))
    fail('invalid_mapping')
  return name
}
/** Runtime validation is also used for saved mappings; no additional parser dependency is required. */
export function validateCsvMapping(input: unknown): CsvMapping {
  if (
    !isObject(input) ||
    Object.keys(input).some(
      (key) =>
        ![
          'format',
          'delimiter',
          'numberLocale',
          'dateFormat',
          'valueDateFormat',
          'columns',
          'defaultCurrency',
          'statusValues',
        ].includes(key),
    )
  )
    fail('invalid_mapping')
  if (
    input.format !== 'lilleri.csv-mapping.v1' ||
    typeof input.delimiter !== 'string' ||
    ![',', ';', '\t'].includes(input.delimiter) ||
    typeof input.numberLocale !== 'string' ||
    !['it-IT', 'en-GB'].includes(input.numberLocale) ||
    !DATE_FORMATS.includes(input.dateFormat as CsvDateFormat) ||
    (input.valueDateFormat !== undefined &&
      !DATE_FORMATS.includes(input.valueDateFormat as CsvDateFormat))
  )
    fail('invalid_mapping')
  if (
    !isObject(input.columns) ||
    Object.keys(input.columns).some((key) => !COLUMN_KEYS.includes(key as keyof CsvColumns))
  )
    fail('invalid_mapping')
  const columns = Object.fromEntries(
    Object.entries(input.columns).map(([key, name]) => [key, headerName(name)]),
  ) as unknown as CsvColumns
  if (!columns.bookedOn || !columns.description) fail('invalid_mapping')
  if (new Set(Object.values(columns)).size !== Object.values(columns).length)
    fail('invalid_mapping')
  if (
    !(Boolean(columns.amount) !== Boolean(columns.debit && columns.credit)) ||
    (columns.amount && (columns.debit || columns.credit)) ||
    (!columns.amount && (!columns.debit || !columns.credit))
  )
    fail('invalid_mapping')
  if (Boolean(columns.currency) === (input.defaultCurrency !== undefined)) fail('invalid_mapping')
  if (input.valueDateFormat !== undefined && !columns.valueOn) fail('invalid_mapping')
  if (
    (input.dateFormat === 'long-it' || input.valueDateFormat === 'long-it') &&
    input.numberLocale !== 'it-IT'
  )
    fail('invalid_mapping')
  let defaultCurrency: CurrencyCode | undefined
  if (input.defaultCurrency !== undefined) {
    if (typeof input.defaultCurrency !== 'string') fail('invalid_mapping')
    try {
      defaultCurrency = assertCurrencyCode(input.defaultCurrency)
    } catch {
      fail('invalid_mapping')
    }
  }
  let statusValues: CsvMapping['statusValues']
  if (input.statusValues !== undefined) {
    if (
      !columns.status ||
      !isObject(input.statusValues) ||
      Object.keys(input.statusValues).length < 1 ||
      Object.keys(input.statusValues).length > 20
    )
      fail('invalid_mapping')
    if (
      Object.entries(input.statusValues).some(
        ([key, value]) =>
          !key ||
          key.length > 64 ||
          key !== key.trim() ||
          hasControl(key) ||
          typeof value !== 'string' ||
          !['pending', 'booked', 'reversed'].includes(value),
      )
    )
      fail('invalid_mapping')
    statusValues = Object.freeze({ ...input.statusValues }) as CsvMapping['statusValues']
  }
  return Object.freeze({
    format: 'lilleri.csv-mapping.v1',
    delimiter: input.delimiter as CsvMapping['delimiter'],
    numberLocale: input.numberLocale as CsvMapping['numberLocale'],
    dateFormat: input.dateFormat as CsvDateFormat,
    columns: Object.freeze(columns),
    ...(input.valueDateFormat ? { valueDateFormat: input.valueDateFormat as CsvDateFormat } : {}),
    ...(defaultCurrency ? { defaultCurrency } : {}),
    ...(statusValues ? { statusValues } : {}),
  })
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (isObject(value))
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
export const csvMappingDigest = (mapping: CsvMapping) =>
  digest(canonical(validateCsvMapping(mapping)))
interface RawCsvRow {
  readonly line: number
  readonly cells: readonly string[]
}
function parseRows(input: string, delimiter: CsvMapping['delimiter']): RawCsvRow[] {
  if (Buffer.byteLength(input, 'utf8') > MAX_MAPPED_CSV_BYTES) fail('file_limit')
  const text = input.replace(/^\uFEFF/, '')
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    if (
      (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      code === 127 ||
      code === 0xfeff ||
      code === 0xfffe ||
      (code >= 0xd800 && code <= 0xdfff)
    )
      fail('invalid_character')
  }
  const rows: RawCsvRow[] = []
  let cells: string[] = [],
    cell = '',
    quoted = false,
    closed = false,
    line = 1,
    firstLine = 1,
    rowStarted = false
  const finishCell = () => {
    cells.push(cell)
    if (cells.length > MAX_COLUMNS) fail('column_limit', firstLine)
    cell = ''
    closed = false
  }
  const finishRow = () => {
    finishCell()
    if (rowStarted || cells.length !== 1 || cells[0] !== '') rows.push({ line: firstLine, cells })
    if (rows.length > MAX_MAPPED_CSV_ROWS + 1) fail('row_limit')
    cells = []
    rowStarted = false
  }
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"'
        index++
      } else if (character === '"') {
        quoted = false
        closed = true
      } else {
        cell += character
        if (character === '\n' || (character === '\r' && text[index + 1] !== '\n')) line++
      }
    } else if (character === '"') {
      if (cell || closed) fail('malformed_csv', firstLine)
      quoted = true
      rowStarted = true
    } else if (character === delimiter) {
      rowStarted = true
      finishCell()
    } else if (character === '\n' || character === '\r') {
      finishRow()
      if (character === '\r' && text[index + 1] === '\n') index++
      line++
      firstLine = line
    } else {
      if (closed) fail('malformed_csv', firstLine)
      cell += character
      rowStarted = true
    }
  }
  if (quoted) fail('malformed_csv', firstLine)
  if (cell || cells.length || closed) finishRow()
  return rows
}
function validHeader(header: readonly string[]) {
  return (
    header.length > 0 &&
    header.every((name) => Boolean(name) && name.length <= 128 && !hasControl(name)) &&
    new Set(header).size === header.length
  )
}
/** Explicit delimiter selection precedes column mapping. This helper returns no financial cells. */
export function inspectCsvLayout(input: string, delimiter: CsvMapping['delimiter']): CsvLayout {
  if (Buffer.byteLength(input, 'utf8') > MAX_MAPPED_CSV_BYTES)
    return {
      format: 'lilleri.csv-layout.v1',
      fileDigest: null,
      header: [],
      rowCount: 0,
      errors: [issue('file_limit')],
    }
  const fileDigest = digest(input)
  let rows: RawCsvRow[]
  try {
    if (![',', ';', '\t'].includes(delimiter)) fail('invalid_mapping')
    rows = parseRows(input, delimiter)
  } catch (error) {
    return {
      format: 'lilleri.csv-layout.v1',
      fileDigest,
      header: [],
      rowCount: 0,
      errors: error instanceof CsvMappingError ? error.issues : [issue('malformed_csv')],
    }
  }
  const header = (rows.shift()?.cells ?? []).map(cleanHeader)
  const errors = !validHeader(header)
    ? [issue('invalid_header')]
    : rows.length
      ? rows
          .filter((row) => row.cells.length !== header.length)
          .map((row) => issue('column_count', row.line))
      : [issue('empty_rows')]
  return { format: 'lilleri.csv-layout.v1', fileDigest, header, rowCount: rows.length, errors }
}
const ITALIAN_MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
]
function parseDate(raw: string, format: CsvDateFormat): string {
  if (raw.length > 64) throw new Error('date')
  const value = raw.trim()
  let iso: string
  if (format === 'yyyy-MM-dd') iso = value
  else if (format === 'dd/MM/yyyy') {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    if (!match) throw new Error('date')
    iso = `${match[3]}-${match[2]}-${match[1]}`
  } else {
    const match = /^(\d{1,2}) +([a-z]+) +(\d{4})$/i.exec(value)
    const month = match
      ? ITALIAN_MONTHS.indexOf((match[2] ?? '').toLocaleLowerCase('it-IT')) + 1
      : 0
    if (!match || !month) throw new Error('date')
    iso = `${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`
  }
  if (iso.startsWith('0000-')) throw new Error('date')
  return dateOnly(iso)
}
function parseAmount(raw: string, locale: CsvMapping['numberLocale'], currency: CurrencyCode) {
  if (raw.length > 64) throw new Error('amount')
  const value = raw.trim()
  const pattern =
    locale === 'it-IT'
      ? /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/
      : /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/
  if (value.length > 64 || !pattern.test(value)) throw new Error('amount')
  const decimal =
    locale === 'it-IT' ? value.replaceAll('.', '').replace(',', '.') : value.replaceAll(',', '')
  return parseDecimal(decimal, currency)
}

/** Pure preview: no writes, guesses, network calls or money rounding. */
export function previewMappedCsv(
  input: string,
  accountId: string,
  mappingInput: unknown,
): CsvImportPreview {
  if (Buffer.byteLength(input, 'utf8') > MAX_MAPPED_CSV_BYTES)
    return {
      format: 'lilleri.csv-preview.v1',
      fileDigest: null,
      mappingDigest: null,
      header: [],
      rowCount: 0,
      rows: [],
      errors: [issue('file_limit')],
      warnings: [],
      duplicateCandidates: [],
      canImport: false,
    }
  const fileDigest = digest(input)
  const empty = (
    errors: readonly CsvImportIssue[],
    mappingDigest: string | null = null,
    header: readonly string[] = [],
    rowCount = 0,
  ): CsvImportPreview => ({
    format: 'lilleri.csv-preview.v1',
    fileDigest,
    mappingDigest,
    header,
    rowCount,
    rows: [],
    errors,
    warnings: [],
    duplicateCandidates: [],
    canImport: false,
  })
  let mapping: CsvMapping
  let rawRows: RawCsvRow[]
  try {
    mapping = validateCsvMapping(mappingInput)
    if (!accountId || accountId.length > 200 || hasControl(accountId)) fail('invalid_account')
    rawRows = parseRows(input, mapping.delimiter)
  } catch (error) {
    return empty(error instanceof CsvMappingError ? error.issues : [issue('invalid_mapping')])
  }
  const mappingDigest = csvMappingDigest(mapping)
  const header = (rawRows.shift()?.cells ?? []).map(cleanHeader)
  if (!validHeader(header))
    return empty([issue('invalid_header')], mappingDigest, header, rawRows.length)
  const positions = new Map(header.map((name, index) => [name, index]))
  const missing = Object.entries(mapping.columns)
    .filter(([, name]) => !positions.has(name))
    .map(([column]) => issue('missing_column', null, column as keyof CsvColumns))
  if (missing.length) return empty(missing, mappingDigest, header, rawRows.length)
  if (!rawRows.length) return empty([issue('empty_rows')], mappingDigest, header)
  const errors: CsvImportIssue[] = [],
    warnings: CsvImportWarning[] = [],
    rows: MappedCsvRow[] = []
  const ids = new Set<string>(),
    occurrences = new Map<string, number>(),
    candidates = new Map<string, number[]>()
  if (!mapping.columns.externalId)
    warnings.push({ row: null, column: 'externalId', code: 'generated_file_identity' })
  const take = (cells: readonly string[], column: keyof CsvColumns): string => {
    const name = mapping.columns[column]
    return name ? (cells[positions.get(name) ?? -1] ?? '') : ''
  }
  for (const raw of rawRows) {
    const row = raw.line
    const before = errors.length
    if (raw.cells.length !== header.length) {
      errors.push(issue('column_count', row))
      continue
    }
    const sourceExternalId = mapping.columns.externalId
      ? take(raw.cells, 'externalId').trim()
      : null
    if (sourceExternalId !== null) {
      if (
        !sourceExternalId ||
        take(raw.cells, 'externalId').length > 128 ||
        hasControl(sourceExternalId)
      )
        errors.push(issue('invalid_id', row, 'externalId'))
      else if (ids.has(sourceExternalId)) errors.push(issue('duplicate_id', row, 'externalId'))
      else ids.add(sourceExternalId)
    }
    const description = take(raw.cells, 'description')
    if (!description.trim() || description.length > 1024)
      errors.push(issue('invalid_description', row, 'description'))
    const merchant = take(raw.cells, 'merchant'),
      reference = take(raw.cells, 'reference')
    for (const [column, value] of [
      ['merchant', merchant],
      ['reference', reference],
    ] as const)
      if (value.length > 256) errors.push(issue('invalid_text', row, column))
    for (const [column, value] of [
      ['description', description],
      ['merchant', merchant],
      ['reference', reference],
    ] as const)
      if (/^\s*[=+\-@]/.test(value)) warnings.push({ row, column, code: 'literal_formula_text' })
    let currency: CurrencyCode | undefined
    try {
      if (mapping.columns.currency && take(raw.cells, 'currency').length > 16)
        throw new Error('currency')
      currency = mapping.defaultCurrency ?? assertCurrencyCode(take(raw.cells, 'currency').trim())
    } catch {
      errors.push(issue('invalid_currency', row, 'currency'))
    }
    const rawBookedOn = take(raw.cells, 'bookedOn')
    const rawValueOn = mapping.columns.valueOn ? take(raw.cells, 'valueOn') : null
    let bookedOn: string | undefined,
      valueOn: string | null = null
    try {
      bookedOn = parseDate(rawBookedOn, mapping.dateFormat)
    } catch {
      errors.push(issue('invalid_date', row, 'bookedOn'))
    }
    if (rawValueOn?.trim()) {
      try {
        valueOn = parseDate(rawValueOn, mapping.valueDateFormat ?? mapping.dateFormat)
      } catch {
        errors.push(issue('invalid_date', row, 'valueOn'))
      }
      warnings.push({ row, column: 'valueOn', code: 'value_date_provenance' })
    } else if (rawValueOn !== null && rawValueOn.length > 64)
      errors.push(issue('invalid_date', row, 'valueOn'))
    const rawStatus = take(raw.cells, 'status').trim()
    const status = !mapping.columns.status
      ? 'booked'
      : mapping.statusValues
        ? Object.hasOwn(mapping.statusValues, rawStatus)
          ? mapping.statusValues[rawStatus]
          : undefined
        : ['pending', 'booked', 'reversed'].includes(rawStatus)
          ? (rawStatus as ProviderTransaction['status'])
          : undefined
    if (!status || take(raw.cells, 'status').length > 64)
      errors.push(issue('invalid_status', row, 'status'))
    let amount: ReturnType<typeof parseDecimal> | undefined
    if (currency) {
      if (mapping.columns.amount) {
        try {
          amount = parseAmount(take(raw.cells, 'amount'), mapping.numberLocale, currency)
        } catch {
          errors.push(issue('invalid_amount', row, 'amount'))
        }
      } else {
        const debitRaw = take(raw.cells, 'debit').trim(),
          creditRaw = take(raw.cells, 'credit').trim()
        try {
          if (take(raw.cells, 'debit').length > 64 || take(raw.cells, 'credit').length > 64)
            throw new Error('side')
          if ((!debitRaw && !creditRaw) || /^[+-]/.test(debitRaw) || /^[+-]/.test(creditRaw))
            throw new Error('side')
          const debit = debitRaw
            ? parseAmount(debitRaw, mapping.numberLocale, currency).amountMinor
            : 0n
          const credit = creditRaw
            ? parseAmount(creditRaw, mapping.numberLocale, currency).amountMinor
            : 0n
          if (
            (debit !== 0n && credit !== 0n) ||
            (debit === 0n && credit === 0n && debitRaw && creditRaw)
          )
            throw new Error('side')
          amount = { currency, amountMinor: credit - debit }
        } catch {
          errors.push(issue('debit_credit_conflict', row))
        }
      }
      if (
        amount &&
        (amount.amountMinor < MIN_AMOUNT_MINOR || amount.amountMinor > MAX_AMOUNT_MINOR)
      )
        errors.push(issue('amount_range', row, mapping.columns.amount ? 'amount' : null))
    }
    if (errors.length !== before || !amount || !bookedOn || !currency || !status) continue
    const contentFingerprint = digest(
      canonical([
        accountId,
        bookedOn,
        valueOn,
        status,
        amount.amountMinor.toString(),
        currency,
        description,
        merchant,
        reference,
      ]),
    )
    const occurrence = (occurrences.get(contentFingerprint) ?? 0) + 1
    occurrences.set(contentFingerprint, occurrence)
    if (sourceExternalId === null)
      candidates.set(contentFingerprint, [...(candidates.get(contentFingerprint) ?? []), row])
    const record: ProviderTransaction = {
      id:
        sourceExternalId !== null
          ? `csv:${sourceExternalId}`
          : `csvgen:${fileDigest}:${contentFingerprint}:${occurrence}`,
      accountId,
      amount: toDecimalString(amount),
      currency,
      description,
      bookedOn,
      status,
      source: 'csv',
      kind: amount.amountMinor < 0n ? 'expense' : 'income',
      ...(merchant.trim() ? { merchantName: merchant } : {}),
      ...(reference.trim() ? { reference } : {}),
    }
    rows.push({
      rowNumber: row,
      record,
      provenance: {
        identity: sourceExternalId === null ? 'file_content_ordinal' : 'external',
        sourceExternalId,
        contentFingerprint,
        occurrence,
        rawBookedOn,
        rawValueOn,
        rawFields: Object.fromEntries(
          Object.keys(mapping.columns).map((column) => [
            column,
            take(raw.cells, column as keyof CsvColumns),
          ]),
        ),
        valueOn,
      },
    })
  }
  if (errors.length) return empty(errors, mappingDigest, header, rawRows.length)
  const duplicateCandidates: CsvDuplicateCandidate[] = [...candidates.entries()]
    .filter(([, lines]) => lines.length > 1)
    .map(([contentFingerprint, rowNumbers]) => ({
      contentFingerprint,
      rowNumbers,
      reason: 'same_content_without_external_id',
    }))
  return {
    format: 'lilleri.csv-preview.v1',
    fileDigest,
    mappingDigest,
    header,
    rowCount: rawRows.length,
    rows,
    errors,
    warnings,
    duplicateCandidates,
    canImport: duplicateCandidates.length === 0,
  }
}
/** The caller must bind review acknowledgement to the shown file and mapping digests. */
export function parseMappedCsv(
  input: string,
  accountId: string,
  mapping: unknown,
  options: { readonly acknowledgeGeneratedDuplicates?: boolean } = {},
): readonly MappedCsvRow[] {
  const preview = previewMappedCsv(input, accountId, mapping)
  if (preview.errors.length) throw new CsvMappingError(preview.errors)
  if (preview.duplicateCandidates.length && options.acknowledgeGeneratedDuplicates !== true)
    throw new CsvMappingError(
      preview.duplicateCandidates.flatMap((candidate) =>
        candidate.rowNumbers.map((row) => issue('duplicate_review_required', row)),
      ),
    )
  return preview.rows
}
