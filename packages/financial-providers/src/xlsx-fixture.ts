import { crc32, deflateRawSync } from 'node:zlib'

export function zipFixture(files: Readonly<Record<string, string>>, compressed = false) {
  const local: Buffer[] = [],
    central: Buffer[] = []
  let offset = 0
  for (const [path, text] of Object.entries(files)) {
    const name = Buffer.from(path),
      bytes = Buffer.from(text),
      contents = compressed ? deflateRawSync(bytes) : bytes,
      head = Buffer.alloc(30),
      directory = Buffer.alloc(46),
      checksum = crc32(bytes)
    head.writeUInt32LE(0x04034b50, 0)
    head.writeUInt16LE(20, 4)
    head.writeUInt16LE(compressed ? 8 : 0, 8)
    head.writeUInt32LE(checksum, 14)
    head.writeUInt32LE(contents.length, 18)
    head.writeUInt32LE(bytes.length, 22)
    head.writeUInt16LE(name.length, 26)
    directory.writeUInt32LE(0x02014b50, 0)
    directory.writeUInt16LE(20, 4)
    directory.writeUInt16LE(20, 6)
    directory.writeUInt16LE(compressed ? 8 : 0, 10)
    directory.writeUInt32LE(checksum, 16)
    directory.writeUInt32LE(contents.length, 20)
    directory.writeUInt32LE(bytes.length, 24)
    directory.writeUInt16LE(name.length, 28)
    directory.writeUInt32LE(offset, 42)
    local.push(head, name, contents)
    central.push(directory, name)
    offset += head.length + name.length + contents.length
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(Object.keys(files).length, 8)
  end.writeUInt16LE(Object.keys(files).length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, directory, end])
}
export const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
export type TestCell = string | { readonly number: string } | { readonly xml: string } | null
export function sheetXml(rows: readonly (readonly TestCell[])[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
    .map(
      (row, index) =>
        `<row r="${index + 1}">${row
          .map((cell, column) => {
            const reference = `${String.fromCharCode(65 + column)}${index + 1}`
            if (cell === null) return `<c r="${reference}"/>`
            if (typeof cell === 'object')
              return 'xml' in cell
                ? `<c r="${reference}">${cell.xml}</c>`
                : `<c r="${reference}" t="n"><v>${cell.number}</v></c>`
            return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`
          })
          .join('')}</row>`,
    )
    .join('')}</sheetData></worksheet>`
}
export function workbookFiles(
  sheets: Readonly<Record<string, readonly (readonly TestCell[])[]>>,
): Record<string, string> {
  const names = Object.keys(sheets)
  return {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>',
    '_rels/.rels':
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="root" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="sheet${index + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_name, index) => `<Relationship Id="sheet${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}</Relationships>`,
    ...Object.fromEntries(
      names.map((name, index) => [
        `xl/worksheets/sheet${index + 1}.xml`,
        sheetXml(sheets[name] ?? []),
      ]),
    ),
  }
}
export function xlsxFixture(
  sheets: Readonly<Record<string, readonly (readonly TestCell[])[]>>,
  compressed = false,
) {
  return zipFixture(workbookFiles(sheets), compressed)
}
