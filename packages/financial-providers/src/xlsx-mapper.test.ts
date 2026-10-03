import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import type { CsvMapping } from './csv-mapper.js'
import { workbookFiles, xlsxFixture, zipFixture } from './xlsx-fixture.js'
import { inspectXlsxLayout, previewMappedXlsx, XLSX_IMPORT_LIMITS } from './xlsx-mapper.js'

const mapping: CsvMapping = {
  format: 'lilleri.csv-mapping.v1',
  delimiter: ';',
  numberLocale: 'it-IT',
  dateFormat: 'dd/MM/yyyy',
  defaultCurrency: 'EUR',
  columns: { bookedOn: 'Data', valueOn: 'Valuta', description: 'Descrizione', amount: 'Importo' },
}
const rows = [
  ['Data', 'Valuta', 'Descrizione', 'Importo'],
  ['02/10/2026', '03/10/2026', 'Sintetico', { number: '-12.34' }],
] as const
const selection = { sheet: 'Movimenti', headerRow: 1 }
const preview = (bytes: Buffer, selected = selection, selectedMapping = mapping) =>
  previewMappedXlsx(bytes, 'account_synthetic', selectedMapping, selected)

describe('bounded XLSX intake with exact cells and reviewed mapping', () => {
  test('requires an explicit sheet and header, exposes no cells in discovery, and preserves original workbook hash', async () => {
    const bytes = xlsxFixture({ Movimenti: rows, Archivio: rows })
    expect(await inspectXlsxLayout(bytes)).toEqual({
      format: 'lilleri.xlsx-layout.v1',
      workbookDigest: createHash('sha256').update(bytes).digest('hex'),
      sheets: [
        { name: 'Movimenti', rows: 2 },
        { name: 'Archivio', rows: 2 },
      ],
      selectedSheet: null,
      headerRow: null,
      header: [],
      rowCount: 0,
      errors: [],
    })
    expect(await inspectXlsxLayout(bytes, selection)).toMatchObject({
      selectedSheet: 'Movimenti',
      headerRow: 1,
      header: rows[0],
      rowCount: 1,
      errors: [],
    })
    expect((await preview(bytes, { ...selection, sheet: 'Missing' })).errors).toEqual([
      { row: null, column: null, code: 'xlsx_sheet_required' },
    ])
    expect((await preview(bytes, { ...selection, headerRow: 0 })).errors[0]?.code).toBe(
      'xlsx_header_required',
    )
  })
  test('preserves decimal numeric tokens and separate value date without locale guessing or float conversion', async () => {
    const result = await preview(xlsxFixture({ Movimenti: rows }, true))
    expect(result.errors).toEqual([])
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      record: { amount: '-12.34', bookedOn: '2026-10-02', source: 'csv' },
      provenance: {
        rawFields: { amount: '-12.34' },
        rawValueOn: '03/10/2026',
        valueOn: '2026-10-03',
      },
    })
    const big = await preview(
      xlsxFixture({
        Movimenti: [
          rows[0],
          ['02/10/2026', '03/10/2026', 'Grande', { number: '90071992547409.93' }],
        ],
      }),
    )
    expect(big.rows[0]?.record.amount).toBe('90071992547409.93')
  })
  test('retains localized textual numbers, exact debit/credit columns, and explicit British mapping', async () => {
    const text = await preview(
      xlsxFixture({ Movimenti: [rows[0], ['02/10/2026', '03/10/2026', 'Testo', '-1.234,56']] }),
    )
    expect(text.rows[0]?.record.amount).toBe('-1234.56')
    const debit: CsvMapping = {
      ...mapping,
      columns: { bookedOn: 'Data', description: 'Descrizione', debit: 'Uscite', credit: 'Entrate' },
    }
    expect(
      (
        await preview(
          xlsxFixture({
            Movimenti: [
              ['Data', 'Descrizione', 'Uscite', 'Entrate'],
              ['02/10/2026', 'Acquisto', { number: '12.34' }, null],
            ],
          }),
          selection,
          debit,
        )
      ).rows[0]?.record.amount,
    ).toBe('-12.34')
    expect(
      (
        await preview(xlsxFixture({ Movimenti: rows }), selection, {
          ...mapping,
          numberLocale: 'en-GB',
        })
      ).rows[0]?.record.amount,
    ).toBe('-12.34')
  })
  test('selection-bound identities distinguish identical sheets, remain stable on reread and map physical worksheet rows', async () => {
    const bytes = xlsxFixture({ Movimenti: rows, Archivio: rows }),
      first = await preview(bytes),
      again = await preview(bytes),
      other = await preview(bytes, { sheet: 'Archivio', headerRow: 1 })
    expect(first.rows[0]?.record.id).toBe(again.rows[0]?.record.id)
    expect(first.rows[0]?.record.id).not.toBe(other.rows[0]?.record.id)
    expect(first.fileDigest).not.toBe(first.workbook?.workbookDigest)
    const withTitle = await preview(
      xlsxFixture({
        Movimenti: [
          ['Titolo'],
          rows[0],
          ['02/10/2026', '03/10/2026', 'Testo\nsu due righe', { number: '-1.00' }],
          rows[1],
        ],
      }),
      { sheet: 'Movimenti', headerRow: 2 },
    )
    expect(withTitle.rows.map((row) => row.rowNumber)).toEqual([3, 4])
  })
  test('keeps legitimate identical purchases distinct and requires the same duplicate acknowledgement', async () => {
    const result = await preview(xlsxFixture({ Movimenti: [rows[0], rows[1], rows[1]] }))
    expect(result.errors).toEqual([])
    expect(result.canImport).toBe(false)
    expect(result.duplicateCandidates[0]?.rowNumbers).toEqual([2, 3])
    expect(new Set(result.rows.map((row) => row.record.id)).size).toBe(2)
  })
  test('preserves physical worksheet numbers with header row three, internal blank rows and multiline cells', async () => {
    const result = await preview(
      xlsxFixture({
        Movimenti: [
          ['Titolo'],
          ['Nota'],
          rows[0],
          rows[1],
          [null, null, null, null],
          ['02/10/2026', '03/10/2026', 'Descrizione\nsu due righe', { number: '-2.00' }],
          rows[1],
        ],
      }),
      { sheet: 'Movimenti', headerRow: 3 },
    )
    expect(result.errors).toEqual([])
    expect(result.rows.map((row) => row.rowNumber)).toEqual([4, 6, 7])
    expect(result.duplicateCandidates[0]?.rowNumbers).toEqual([4, 7])
    expect(result.rows[1]?.provenance.rawFields.amount).toBe('-2.00')
  })
  test.each(['1e3', '1E+3', 'NaN', 'Infinity', '+1.00', '01.00', '0.0000000000000000000001'])(
    'never rounds or coerces unsupported numeric token %s',
    async (number) => {
      const result = await preview(
        xlsxFixture({
          Movimenti: [rows[0], ['02/10/2026', '03/10/2026', 'Sintetico', { number }]],
        }),
      )
      expect(result.rows).toEqual([])
      expect(result.errors.length).toBeGreaterThan(0)
    },
  )
  test('rejects partial valid rows and emits only codes for sensitive invalid text', async () => {
    const result = await preview(
      xlsxFixture({
        Movimenti: [rows[0], rows[1], ['31/02/2026', '03/10/2026', 'PRIVATE_CELL', '-1,00']],
      }),
    )
    expect(result.rows).toEqual([])
    expect(JSON.stringify(result.errors)).not.toContain('PRIVATE_CELL')
    expect(result.errors[0]?.code).toBe('invalid_date')
  })
  test.each([
    ['formula', '<f>1+1</f><v>2</v>', 'xlsx_formula'],
    ['date', '<v>2026-10-03T00:00:00Z</v>', 'xlsx_numeric_cell'],
    ['boolean', '<v>1</v>', null],
  ] as const)('rejects unsafe cell kinds: %s', async (_label, xml, expected) => {
    const files = workbookFiles({
      Movimenti: [rows[0], ['02/10/2026', '03/10/2026', 'Sintetico', { xml }]],
    })
    if (_label === 'date')
      files['xl/worksheets/sheet1.xml'] =
        files['xl/worksheets/sheet1.xml']?.replace('r="D2"', 'r="D2" t="d"') ?? ''
    if (_label === 'boolean')
      files['xl/worksheets/sheet1.xml'] =
        files['xl/worksheets/sheet1.xml']?.replace('r="D2"', 'r="D2" t="b"') ?? ''
    const result = await preview(zipFixture(files))
    expect(result.rows).toEqual([])
    expect(result.errors[0]?.code).toBe(
      _label === 'date' ? 'xlsx_date_cells' : (expected ?? 'xlsx_invalid_cell'),
    )
  })
  test.each([
    ['<!DOCTYPE worksheet [<!ENTITY secret SYSTEM "file:///private">]>', 'xlsx_invalid_xml'],
    ['<mergeCells><mergeCell ref="A1:B1"/></mergeCells>', 'xlsx_merged_cells'],
    ['<hyperlink ref="A2" r:id="external"/>', 'xlsx_unsupported_content'],
    ['<dimension ref="A1:XFD1048576"/>', 'xlsx_resource_limit'],
  ] as const)('rejects unsafe XML before selected-sheet parsing: %s', async (xml, code) => {
    const files = workbookFiles({ Movimenti: rows, Altro: rows })
    files['xl/worksheets/sheet2.xml'] =
      files['xl/worksheets/sheet2.xml']?.replace('<sheetData>', `${xml}<sheetData>`) ?? ''
    expect((await preview(zipFixture(files))).errors[0]?.code).toBe(code)
  })
  test.each([
    'xl/vbaProject.bin',
    'xl/embeddings/payload.bin',
    '../escape.xml',
    'xl/externalLinks/externalLink1.xml',
  ])('rejects undeclared or dangerous ZIP entry %s', async (path) => {
    expect(
      (await preview(zipFixture({ ...workbookFiles({ Movimenti: rows }), [path]: 'private' })))
        .errors[0]?.code,
    ).toBe('xlsx_unsupported_content')
  })
  test('rejects encoded external relationships, corrupt CRC, encrypted flags and oversized declared or compressed archives', async () => {
    const files = workbookFiles({ Movimenti: rows })
    files['xl/_rels/workbook.xml.rels'] = (files['xl/_rels/workbook.xml.rels'] ?? '').replace(
      'worksheets/sheet1.xml',
      'https&#58;//example.invalid/private',
    )
    expect((await preview(zipFixture(files))).errors[0]?.code).toBe('xlsx_unsupported_content')
    const corrupt = xlsxFixture({ Movimenti: rows })
    corrupt[50] = (corrupt[50] ?? 0) ^ 1
    expect((await preview(corrupt)).errors[0]?.code).toBe('xlsx_invalid_archive')
    const encrypted = xlsxFixture({ Movimenti: rows }),
      central = encrypted.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
    encrypted.writeUInt16LE(1, central + 8)
    expect((await preview(encrypted)).errors[0]?.code).toBe('xlsx_unsupported_content')
    expect(
      (await preview(Buffer.alloc(XLSX_IMPORT_LIMITS.compressedBytes + 1))).errors[0]?.code,
    ).toBe('xlsx_resource_limit')
    const bomb = zipFixture(
      {
        ...workbookFiles({ Movimenti: rows }),
        'xl/sharedStrings.xml': 'A'.repeat(XLSX_IMPORT_LIMITS.entryBytes + 1),
      },
      true,
    )
    expect((await preview(bomb)).errors[0]?.code).toBe('xlsx_resource_limit')
  })
  test('rejects ambiguous duplicate cell references, scientific/percentage formats and macro content types', async () => {
    const duplicate = workbookFiles({ Movimenti: rows })
    duplicate['xl/worksheets/sheet1.xml'] = (duplicate['xl/worksheets/sheet1.xml'] ?? '').replace(
      '</row></sheetData>',
      '<c r="D2"><v>999</v></c></row></sheetData>',
    )
    expect((await preview(zipFixture(duplicate))).errors[0]?.code).toBe('xlsx_invalid_xml')
    for (const style of [
      '<styleSheet><cellXfs><xf numFmtId="9"/></cellXfs></styleSheet>',
      '<styleSheet><numFmts><numFmt numFmtId="164" formatCode="0.00E+00"/></numFmts></styleSheet>',
    ]) {
      expect(
        (
          await preview(
            zipFixture({ ...workbookFiles({ Movimenti: rows }), 'xl/styles.xml': style }),
          )
        ).errors[0]?.code,
      ).toBe('xlsx_numeric_cell')
    }
    const macro = workbookFiles({ Movimenti: rows })
    macro['[Content_Types].xml'] = (macro['[Content_Types].xml'] ?? '').replace(
      'application/xml',
      'application/vnd.ms-excel.sheet.macroEnabled.main+xml',
    )
    expect((await preview(zipFixture(macro))).errors[0]?.code).toBe('xlsx_unsupported_content')
  })
  test('allowlists provenance fields even when a structural caller carries full workbook bytes or secrets', async () => {
    const result = await previewMappedXlsx(
      xlsxFixture({ Movimenti: rows }),
      'account_synthetic',
      mapping,
      {
        ...selection,
        base64: 'ORIGINAL_WORKBOOK_DO_NOT_PERSIST',
        secret: 'PRIVATE',
      } as typeof selection,
    )
    expect(result.workbook).toEqual({
      format: 'xlsx',
      workbookDigest: result.workbook?.workbookDigest,
      sheet: 'Movimenti',
      headerRow: 1,
    })
    expect(JSON.stringify(result)).not.toContain('ORIGINAL_WORKBOOK_DO_NOT_PERSIST')
    expect(JSON.stringify(result)).not.toContain('PRIVATE')
  })
  test('rejects ZIP64 extra metadata present only in a streaming local header', async () => {
    const original = xlsxFixture({ Movimenti: rows }),
      end = original.length - 22,
      directory = original.readUInt32LE(end + 16),
      nameSize = original.readUInt16LE(26),
      insertion = 30 + nameSize,
      extra = Buffer.alloc(4),
      localOnly = Buffer.concat([
        original.subarray(0, insertion),
        extra,
        original.subarray(insertion),
      ])
    extra.writeUInt16LE(1, 0)
    // Buffer.concat copied bytes before the extra field was populated.
    localOnly.writeUInt16LE(1, insertion)
    localOnly.writeUInt16LE(4, 28)
    let cursor = directory + 4
    while (cursor < end + 4) {
      const offset = localOnly.readUInt32LE(cursor + 42)
      if (offset) localOnly.writeUInt32LE(offset + 4, cursor + 42)
      cursor +=
        46 +
        localOnly.readUInt16LE(cursor + 28) +
        localOnly.readUInt16LE(cursor + 30) +
        localOnly.readUInt16LE(cursor + 32)
    }
    localOnly.writeUInt32LE(directory + 4, end + 20)
    expect((await preview(localOnly)).errors[0]?.code).toBe('xlsx_unsupported_content')
  })
})
