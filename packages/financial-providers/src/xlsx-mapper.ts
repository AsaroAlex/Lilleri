import { createHash } from 'node:crypto'
import { crc32, inflateRawSync } from 'node:zlib'
import readExcelFile, { type CellValue, type Sheet } from 'read-excel-file/node'
import {
  type CsvImportIssue,
  type CsvImportPreview,
  type CsvMapping,
  CsvMappingError,
  inspectCsvLayout,
  MAX_MAPPED_CSV_BYTES,
  previewMappedCsv,
  validateCsvMapping,
} from './csv-mapper.js'

export const MAX_MAPPED_XLSX_BYTES = 512 * 1024
export const MAX_XLSX_UNCOMPRESSED_BYTES = 4 * 1024 * 1024
const MAX_ENTRY_BYTES = 2 * 1024 * 1024
const MAX_ENTRIES = 64
const MAX_SHEETS = 8
const MAX_ROWS = 1_100
const MAX_COLUMNS = 64
export const XLSX_IMPORT_LIMITS = Object.freeze({
  compressedBytes: MAX_MAPPED_XLSX_BYTES,
  uncompressedBytes: MAX_XLSX_UNCOMPRESSED_BYTES,
  entryBytes: MAX_ENTRY_BYTES,
  entries: MAX_ENTRIES,
  sheets: MAX_SHEETS,
  rows: MAX_ROWS,
  columns: MAX_COLUMNS,
  headerRows: 100,
  base64Characters: Math.ceil(MAX_MAPPED_XLSX_BYTES / 3) * 4,
  requestBytes: Math.ceil(MAX_MAPPED_XLSX_BYTES / 3) * 4 + 32 * 1024,
})
export type XlsxIssueCode =
  | 'xlsx_invalid_archive'
  | 'xlsx_resource_limit'
  | 'xlsx_unsupported_content'
  | 'xlsx_invalid_xml'
  | 'xlsx_formula'
  | 'xlsx_merged_cells'
  | 'xlsx_sheet_required'
  | 'xlsx_header_required'
  | 'xlsx_date_cells'
  | 'xlsx_numeric_cell'
  | 'xlsx_invalid_cell'
export type XlsxIssue =
  | CsvImportIssue
  | {
      readonly row: number | null
      readonly column: null
      readonly code: XlsxIssueCode
    }
export interface XlsxSelection {
  readonly sheet: string
  readonly headerRow: number
}
export interface XlsxProvenance extends XlsxSelection {
  readonly format: 'xlsx'
  readonly workbookDigest: string
}
export interface XlsxLayout {
  readonly format: 'lilleri.xlsx-layout.v1'
  readonly workbookDigest: string | null
  readonly sheets: readonly { readonly name: string; readonly rows: number }[]
  readonly selectedSheet: string | null
  readonly headerRow: number | null
  readonly header: readonly string[]
  readonly rowCount: number
  readonly errors: readonly XlsxIssue[]
}
export interface XlsxImportPreview extends Omit<CsvImportPreview, 'errors'> {
  readonly errors: readonly XlsxIssue[]
  readonly workbook?: XlsxProvenance
}
export class XlsxImportError extends Error {
  constructor(readonly code: XlsxIssueCode) {
    super('Workbook cannot be safely imported')
    this.name = 'XlsxImportError'
  }
}
function fail(code: XlsxIssueCode): never {
  throw new XlsxImportError(code)
}
const digest = (input: Uint8Array | string) => createHash('sha256').update(input).digest('hex')
const xmlDecoder = new TextDecoder('utf-8', { fatal: true })
const allowedPath =
  /^(?:\[Content_Types\]\.xml|_rels\/\.rels|docProps\/(?:core|app)\.xml|xl\/(?:workbook|styles|sharedStrings)\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/theme\/theme[1-8]\.xml|xl\/worksheets\/sheet[1-8]\.xml)$/
interface Entry {
  readonly name: string
  readonly bytes: Buffer
}

/** Validate every byte range and cap inflation before handing a workbook to an XML parser. */
function entries(input: Uint8Array): Entry[] {
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength)
  if (bytes.length > MAX_MAPPED_XLSX_BYTES) fail('xlsx_resource_limit')
  const end = bytes.length - 22
  if (end < 0 || bytes.readUInt32LE(end) !== 0x06054b50) fail('xlsx_invalid_archive')
  const count = bytes.readUInt16LE(end + 10),
    directorySize = bytes.readUInt32LE(end + 12),
    directory = bytes.readUInt32LE(end + 16)
  if (
    bytes.readUInt16LE(end + 4) ||
    bytes.readUInt16LE(end + 6) ||
    bytes.readUInt16LE(end + 20) ||
    bytes.readUInt16LE(end + 8) !== count ||
    directory + directorySize !== end
  )
    fail('xlsx_invalid_archive')
  if (!count || count > MAX_ENTRIES) fail('xlsx_resource_limit')
  const result: Entry[] = [],
    names = new Set<string>(),
    ranges: [number, number][] = []
  let cursor = directory,
    total = 0
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) fail('xlsx_invalid_archive')
    const flags = bytes.readUInt16LE(cursor + 8),
      method = bytes.readUInt16LE(cursor + 10),
      checksum = bytes.readUInt32LE(cursor + 16),
      compressed = bytes.readUInt32LE(cursor + 20),
      size = bytes.readUInt32LE(cursor + 24),
      nameSize = bytes.readUInt16LE(cursor + 28),
      extraSize = bytes.readUInt16LE(cursor + 30),
      commentSize = bytes.readUInt16LE(cursor + 32),
      local = bytes.readUInt32LE(cursor + 42)
    if (
      cursor + 46 + nameSize + extraSize + commentSize > end ||
      bytes.readUInt16LE(cursor + 34) ||
      (flags & ~0x0808) !== 0 ||
      ![0, 8].includes(method) ||
      extraSize > 512 ||
      commentSize > 256
    )
      fail('xlsx_unsupported_content')
    let name: string
    try {
      name = xmlDecoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameSize))
    } catch {
      fail('xlsx_invalid_archive')
    }
    if (!allowedPath.test(name) || names.has(name)) fail('xlsx_unsupported_content')
    names.add(name)
    total += size
    if (
      size > MAX_ENTRY_BYTES ||
      total > MAX_XLSX_UNCOMPRESSED_BYTES ||
      size > Math.max(1, compressed) * 200 ||
      compressed > bytes.length
    )
      fail('xlsx_resource_limit')
    // ZIP64 is unsupported; extra fields must be well formed rather than ignored by one parser.
    let extra = cursor + 46 + nameSize
    while (extra < cursor + 46 + nameSize + extraSize) {
      if (extra + 4 > cursor + 46 + nameSize + extraSize) fail('xlsx_invalid_archive')
      if (bytes.readUInt16LE(extra) === 1) fail('xlsx_unsupported_content')
      extra += 4 + bytes.readUInt16LE(extra + 2)
    }
    if (
      extra !== cursor + 46 + nameSize + extraSize ||
      local + 30 > directory ||
      bytes.readUInt32LE(local) !== 0x04034b50 ||
      bytes.readUInt16LE(local + 6) !== flags ||
      bytes.readUInt16LE(local + 8) !== method
    )
      fail('xlsx_invalid_archive')
    const localNameSize = bytes.readUInt16LE(local + 26),
      localExtraSize = bytes.readUInt16LE(local + 28),
      start = local + 30 + localNameSize + localExtraSize
    if (
      localExtraSize > 512 ||
      start + compressed > directory ||
      localNameSize !== nameSize ||
      !bytes
        .subarray(local + 30, local + 30 + localNameSize)
        .equals(bytes.subarray(cursor + 46, cursor + 46 + nameSize))
    )
      fail('xlsx_invalid_archive')
    let localExtra = local + 30 + localNameSize
    while (localExtra < start) {
      if (localExtra + 4 > start) fail('xlsx_invalid_archive')
      if (bytes.readUInt16LE(localExtra) === 1) fail('xlsx_unsupported_content')
      localExtra += 4 + bytes.readUInt16LE(localExtra + 2)
    }
    if (localExtra !== start) fail('xlsx_invalid_archive')
    if (
      !(flags & 8) &&
      (bytes.readUInt32LE(local + 14) !== checksum ||
        bytes.readUInt32LE(local + 18) !== compressed ||
        bytes.readUInt32LE(local + 22) !== size)
    )
      fail('xlsx_invalid_archive')
    let rangeEnd = start + compressed
    if (flags & 8) {
      if (rangeEnd + 12 > directory) fail('xlsx_invalid_archive')
      if (bytes.readUInt32LE(rangeEnd) === 0x08074b50) rangeEnd += 4
      if (
        rangeEnd + 12 > directory ||
        bytes.readUInt32LE(rangeEnd) !== checksum ||
        bytes.readUInt32LE(rangeEnd + 4) !== compressed ||
        bytes.readUInt32LE(rangeEnd + 8) !== size
      )
        fail('xlsx_invalid_archive')
      rangeEnd += 12
    }
    let unpacked: Buffer
    try {
      unpacked =
        method === 0
          ? bytes.subarray(start, start + compressed)
          : inflateRawSync(bytes.subarray(start, start + compressed), {
              maxOutputLength: MAX_ENTRY_BYTES,
            })
    } catch {
      fail('xlsx_invalid_archive')
    }
    if (unpacked.length !== size || crc32(unpacked) !== checksum) fail('xlsx_invalid_archive')
    ranges.push([local, rangeEnd])
    result.push({ name, bytes: unpacked })
    cursor += 46 + nameSize + extraSize + commentSize
  }
  if (cursor !== end) fail('xlsx_invalid_archive')
  let covered = 0
  for (const [start, stop] of ranges.sort((a, b) => a[0] - b[0])) {
    if (start !== covered) fail('xlsx_invalid_archive')
    covered = stop
  }
  if (
    covered !== directory ||
    !names.has('[Content_Types].xml') ||
    !names.has('xl/workbook.xml') ||
    !names.has('xl/_rels/workbook.xml.rels')
  )
    fail('xlsx_invalid_archive')
  return result
}
function coordinate(input: string) {
  const match = /^([A-Z]{1,3})([1-9]\d{0,6})$/.exec(input)
  if (!match?.[1] || !match[2]) fail('xlsx_invalid_xml')
  let column = 0
  for (const letter of match[1]) column = column * 26 + letter.charCodeAt(0) - 64
  if (column > MAX_COLUMNS || Number(match[2]) > MAX_ROWS) fail('xlsx_resource_limit')
}
function attributeText(input: string) {
  return input.replace(
    /&#(\d+);|&#x([\da-f]+);|&(amp|quot|apos|lt|gt);/gi,
    (_all, decimal, hex, named) => {
      if (decimal || hex) {
        const point = Number.parseInt(decimal ?? hex, decimal ? 10 : 16)
        if (!Number.isSafeInteger(point) || point < 32 || point > 0x10ffff) fail('xlsx_invalid_xml')
        return String.fromCodePoint(point)
      }
      return (
        ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' } as Record<string, string>)[
          String(named).toLowerCase()
        ] ?? ''
      )
    },
  )
}
/** Conservative supported OOXML subset. Rejection happens across every entry, even unselected sheets. */
function validateXml(entry: Entry) {
  let xml: string
  try {
    xml = xmlDecoder.decode(entry.bytes)
  } catch {
    fail('xlsx_invalid_xml')
  }
  if (
    xml.includes('\u0000') ||
    /<!\s*(?:DOCTYPE|ENTITY)|<\?(?!xml\s)|encoding\s*=\s*["'](?!UTF-8["'])/i.test(xml) ||
    /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-f]+;)/i.test(xml)
  )
    fail('xlsx_invalid_xml')
  if (/<(?:[\w.-]+:)?f(?:\s|\/?>)/i.test(xml)) fail('xlsx_formula')
  if (/<(?:[\w.-]+:)?mergeCells?(?:\s|\/?>)/i.test(xml)) fail('xlsx_merged_cells')
  if (
    /<(?:[\w.-]+:)?(?:externalLink|oleObject|drawing|hyperlink|dataValidation|sheetProtection|workbookProtection|definedName)(?:\s|\/?>)/i.test(
      xml,
    )
  )
    fail('xlsx_unsupported_content')
  if (
    entry.name === '[Content_Types].xml' &&
    /macroEnabled|vbaProject|oleObject|externalLink|encryptedPackage/i.test(xml)
  )
    fail('xlsx_unsupported_content')
  if (entry.name === 'xl/styles.xml') {
    for (const match of xml.matchAll(/\bnumFmtId\s*=\s*(["'])(\d+)\1/g)) {
      if ([9, 10, 11, 12, 13].includes(Number(match[2]))) fail('xlsx_numeric_cell')
    }
    for (const match of xml.matchAll(/\bformatCode\s*=\s*(["'])(.*?)\1/g)) {
      const code = attributeText(match[2] ?? '').replace(/"[^"]*"/g, '')
      if (/%|[Ee][+-]|\?|,[^0#]*$/.test(code)) fail('xlsx_numeric_cell')
    }
  }
  if (entry.name.endsWith('.rels')) {
    for (const match of xml.matchAll(/<(?:(?:[\w.-]+):)?Relationship\b([^>]*)>/g)) {
      const attributes = match[1] ?? '',
        target = /\bTarget\s*=\s*(["'])(.*?)\1/s.exec(attributes),
        mode = /\bTargetMode\s*=\s*(["'])(.*?)\1/s.exec(attributes)
      if (!target?.[2] || (mode && mode[2] !== 'Internal')) fail('xlsx_unsupported_content')
      const path = attributeText(target[2])
      if (
        !/^(?:\/?xl\/)?(?:workbook\.xml|worksheets\/sheet[1-8]\.xml|styles\.xml|sharedStrings\.xml|theme\/theme[1-8]\.xml)$/.test(
          path,
        ) &&
        !/^docProps\/(?:core|app)\.xml$/.test(path)
      )
        fail('xlsx_unsupported_content')
    }
  }
  if (entry.name.startsWith('xl/worksheets/')) {
    let cells = 0
    const references = new Set<string>()
    for (const match of xml.matchAll(/<(?:[\w.-]+:)?(?:c|dimension)\b([^>]*)>/g)) {
      const reference = /\b(?:r|ref)\s*=\s*(["'])(.*?)\1/.exec(match[1] ?? '')
      if (!reference?.[2]) fail('xlsx_invalid_xml')
      if (!reference[2].includes(':') && !match[0].includes('dimension')) {
        if (references.has(reference[2])) fail('xlsx_invalid_xml')
        references.add(reference[2])
      }
      for (const item of reference[2].split(':')) coordinate(item)
      if (++cells > MAX_ROWS * MAX_COLUMNS + 1) fail('xlsx_resource_limit')
    }
    for (const match of xml.matchAll(/<(?:[\w.-]+:)?row\b([^>]*)>/g)) {
      const row = /\br\s*=\s*(["'])(.*?)\1/.exec(match[1] ?? '')
      if (!row?.[2] || !/^[1-9]\d*$/.test(row[2]) || Number(row[2]) > MAX_ROWS)
        fail('xlsx_resource_limit')
    }
  }
}
interface ExactNumber {
  readonly kind: 'xlsx-number'
  readonly raw: string
}
async function workbook(input: Uint8Array): Promise<Sheet<ExactNumber>[]> {
  for (const entry of entries(input)) validateXml(entry)
  try {
    const sheets = await readExcelFile<ExactNumber>(Buffer.from(input), {
      trim: false,
      parseNumber: (raw) => ({ kind: 'xlsx-number', raw }),
    })
    if (
      !sheets.length ||
      sheets.length > MAX_SHEETS ||
      new Set(sheets.map((sheet) => sheet.sheet)).size !== sheets.length
    )
      fail('xlsx_resource_limit')
    for (const sheet of sheets) {
      if (
        !sheet.sheet ||
        sheet.sheet.length > 128 ||
        sheet.data.length > MAX_ROWS ||
        sheet.data.some((row) => row.length > MAX_COLUMNS)
      )
        fail('xlsx_resource_limit')
      if (sheet.data.some((row) => row.some((cell) => cell instanceof Date)))
        fail('xlsx_date_cells')
    }
    return sheets
  } catch (error) {
    if (error instanceof XlsxImportError) throw error
    fail('xlsx_invalid_xml')
  }
}
function selected(sheets: readonly Sheet<ExactNumber>[], selection: XlsxSelection) {
  const sheet = sheets.find((item) => item.sheet === selection.sheet)
  if (!sheet) fail('xlsx_sheet_required')
  if (
    !Number.isInteger(selection.headerRow) ||
    selection.headerRow < 1 ||
    selection.headerRow > 100 ||
    selection.headerRow > sheet.data.length
  )
    fail('xlsx_header_required')
  return sheet.data.slice(selection.headerRow - 1)
}
function cellText(
  cell: CellValue<ExactNumber> | null,
  locale: CsvMapping['numberLocale'],
  numeric = false,
) {
  if (cell === null) return ''
  if (typeof cell === 'string') return cell
  if (typeof cell === 'object' && 'kind' in cell && cell.kind === 'xlsx-number') {
    // Numeric XML is locale independent. No exponent expansion, Number conversion or rounding.
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(cell.raw) || cell.raw.length > 128)
      fail('xlsx_numeric_cell')
    return numeric && locale === 'it-IT' ? cell.raw.replace('.', ',') : cell.raw
  }
  fail('xlsx_invalid_cell')
}
const quoted = (value: string) => `"${value.replaceAll('"', '""')}"`
function csvRows(rows: Sheet<ExactNumber>['data'], mapping: CsvMapping) {
  const header = rows[0]
  if (!header || header.some((cell) => typeof cell !== 'string')) fail('xlsx_header_required')
  const names = header.map((cell) => String(cell).trim().normalize('NFC')),
    money = new Set(
      [mapping.columns.amount, mapping.columns.debit, mapping.columns.credit].filter(Boolean),
    )
  const sourceRows = rows.flatMap((row, index) =>
    index > 0 && row.every((cell) => cell === null || (typeof cell === 'string' && !cell.trim()))
      ? []
      : [{ row, index }],
  )
  let csvLine = 1
  const lineMap = new Map<number, number>()
  const encoded = sourceRows
    .map(({ row, index }) => {
      lineMap.set(csvLine, index)
      const text = names
        .map((name, column) =>
          quoted(cellText(row[column] ?? null, mapping.numberLocale, index > 0 && money.has(name))),
        )
        .join(mapping.delimiter)
      csvLine += 1 + (text.match(/\r\n|\r|\n/g)?.length ?? 0)
      return text
    })
    .join('\n')
  if (Buffer.byteLength(encoded) > MAX_MAPPED_CSV_BYTES) fail('xlsx_resource_limit')
  return { encoded, header: names, sourceRows, lineMap }
}
const errorIssue = (error: unknown): XlsxIssue =>
  error instanceof CsvMappingError
    ? (error.issues[0] ?? { row: null, column: null, code: 'invalid_mapping' })
    : {
        row: null,
        column: null,
        code: error instanceof XlsxImportError ? error.code : 'xlsx_invalid_xml',
      }
export async function inspectXlsxLayout(
  input: Uint8Array,
  selection?: XlsxSelection,
): Promise<XlsxLayout> {
  const empty: XlsxLayout = {
    format: 'lilleri.xlsx-layout.v1',
    workbookDigest: null,
    sheets: [],
    selectedSheet: null,
    headerRow: null,
    header: [],
    rowCount: 0,
    errors: [],
  }
  try {
    const sheets = await workbook(input),
      base = {
        ...empty,
        workbookDigest: digest(input),
        sheets: sheets.map((sheet) => ({ name: sheet.sheet, rows: sheet.data.length })),
      }
    if (!selection) return base
    const rows = selected(sheets, selection),
      fake: CsvMapping = {
        format: 'lilleri.csv-mapping.v1',
        delimiter: ';',
        numberLocale: 'en-GB',
        dateFormat: 'yyyy-MM-dd',
        defaultCurrency: 'EUR',
        columns: { bookedOn: '_date', description: '_description', amount: '_amount' },
      },
      encoded = csvRows(rows, fake),
      layout = inspectCsvLayout(encoded.encoded, ';')
    return {
      ...base,
      selectedSheet: selection.sheet,
      headerRow: selection.headerRow,
      header: layout.header,
      rowCount: layout.rowCount,
      errors: layout.errors.map((issue) => ({
        ...issue,
        row:
          issue.row === null ? null : selection.headerRow + (encoded.lineMap.get(issue.row) ?? 0),
      })),
    }
  } catch (error) {
    return { ...empty, errors: [errorIssue(error)] }
  }
}
/** Reuse the reviewed CSV money/date normaliser while binding identities to the original workbook selection. */
export async function previewMappedXlsx(
  input: Uint8Array,
  accountId: string,
  mappingInput: unknown,
  selection: XlsxSelection,
): Promise<XlsxImportPreview> {
  const empty: XlsxImportPreview = {
    format: 'lilleri.csv-preview.v1',
    fileDigest: null,
    mappingDigest: null,
    header: [],
    rowCount: 0,
    rows: [],
    errors: [],
    warnings: [],
    duplicateCandidates: [],
    canImport: false,
  }
  try {
    const mapping = validateCsvMapping(mappingInput),
      sheets = await workbook(input),
      rows = selected(sheets, selection),
      csv = csvRows(rows, mapping),
      preview = previewMappedCsv(csv.encoded, accountId, mapping),
      workbookDigest = digest(input),
      fileDigest = digest(
        JSON.stringify([
          'lilleri.xlsx-selection.v1',
          workbookDigest,
          selection.sheet,
          selection.headerRow,
        ]),
      )
    if (preview.errors.length)
      return {
        ...preview,
        errors: preview.errors.map((issue) => ({
          ...issue,
          row: issue.row === null ? null : selection.headerRow + (csv.lineMap.get(issue.row) ?? 0),
        })),
        fileDigest,
        workbook: {
          format: 'xlsx',
          workbookDigest,
          sheet: selection.sheet,
          headerRow: selection.headerRow,
        },
      }
    // CSV physical line offsets can include embedded newlines; map each record's ordinal back to its worksheet row.
    const rowMap = new Map(
      preview.rows.map((row) => [
        row.rowNumber,
        selection.headerRow + (csv.lineMap.get(row.rowNumber) ?? 0),
      ]),
    )
    return {
      ...preview,
      warnings: preview.warnings.map((issue) => ({
        ...issue,
        row: issue.row === null ? null : selection.headerRow + (csv.lineMap.get(issue.row) ?? 0),
      })),
      fileDigest,
      workbook: {
        format: 'xlsx',
        workbookDigest,
        sheet: selection.sheet,
        headerRow: selection.headerRow,
      },
      rows: preview.rows.map((row, index) => {
        const original = csv.sourceRows[index + 1]?.row ?? [],
          rawFields = { ...row.provenance.rawFields }
        for (const [column, name] of Object.entries(mapping.columns)) {
          const position = csv.header.indexOf(name),
            value = original[position]
          if (value && typeof value === 'object' && 'kind' in value)
            rawFields[column as keyof typeof rawFields] = value.raw
        }
        return {
          ...row,
          rowNumber: rowMap.get(row.rowNumber) ?? row.rowNumber,
          record: {
            ...row.record,
            id:
              row.provenance.identity === 'external'
                ? row.record.id
                : `csvgen:${fileDigest}:${row.provenance.contentFingerprint}:${row.provenance.occurrence}`,
          },
          provenance: { ...row.provenance, rawFields },
        }
      }),
      duplicateCandidates: preview.duplicateCandidates.map((candidate) => ({
        ...candidate,
        rowNumbers: candidate.rowNumbers.map((row) => rowMap.get(row) ?? row),
      })),
    }
  } catch (error) {
    return { ...empty, errors: [errorIssue(error)] }
  }
}
