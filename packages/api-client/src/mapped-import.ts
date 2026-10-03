import type { CurrencyCode } from '@lilleri/domain'

export interface MappedCsvColumnsDto {
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
export interface MappedCsvMappingDto {
  readonly format: 'lilleri.csv-mapping.v1'
  readonly delimiter: ',' | ';' | '\t'
  readonly numberLocale: 'it-IT' | 'en-GB'
  readonly dateFormat: 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'long-it'
  readonly valueDateFormat?: 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'long-it'
  readonly columns: MappedCsvColumnsDto
  readonly defaultCurrency?: CurrencyCode
  readonly statusValues?: Readonly<Record<string, 'pending' | 'booked' | 'reversed'>>
}
export interface MappedCsvIssueDto {
  readonly row: number | null
  readonly column: keyof MappedCsvColumnsDto | null
  readonly code: string
}
export interface MappedCsvLayoutDto {
  readonly format: 'lilleri.csv-layout.v1'
  readonly fileDigest: string | null
  readonly header: readonly string[]
  readonly rowCount: number
  readonly errors: readonly MappedCsvIssueDto[]
}
export interface MappedCsvPreviewDto {
  readonly format: 'lilleri.csv-preview.v1'
  readonly fileDigest: string | null
  readonly mappingDigest: string | null
  readonly workbook?: {
    readonly format: 'xlsx'
    readonly workbookDigest: string
    readonly sheet: string
    readonly headerRow: number
  }
  readonly header: readonly string[]
  readonly rowCount: number
  readonly rows: readonly {
    readonly rowNumber: number
    readonly record: {
      readonly id: string
      readonly accountId: string
      readonly amount: string
      readonly currency: CurrencyCode
      readonly description: string
      readonly bookedOn: string
      readonly status: 'pending' | 'booked' | 'reversed'
      readonly source: 'csv'
      readonly kind: 'expense' | 'income'
      readonly merchantName?: string
      readonly reference?: string
    }
    readonly provenance: {
      readonly identity: 'external' | 'file_content_ordinal'
      readonly sourceExternalId: string | null
      readonly contentFingerprint: string
      readonly occurrence: number
      readonly rawBookedOn: string
      readonly rawValueOn: string | null
      readonly rawFields: Readonly<Partial<Record<keyof MappedCsvColumnsDto, string>>>
      readonly valueOn: string | null
    }
  }[]
  readonly errors: readonly MappedCsvIssueDto[]
  readonly warnings: readonly MappedCsvIssueDto[]
  readonly duplicateCandidates: readonly {
    readonly contentFingerprint: string
    readonly rowNumbers: readonly number[]
    readonly reason: 'same_content_without_external_id'
  }[]
  readonly canImport: boolean
  readonly previewRevision: string
}
export interface SavedCsvMappingDto {
  readonly id: string
  readonly profileId: string
  readonly accountId: string
  readonly name: string
  readonly mapping: MappedCsvMappingDto
  readonly revision: number
  readonly archived: boolean
  readonly createdAt: string
  readonly updatedAt: string
}
export interface MappedCsvImportInput {
  readonly accountId: string
  readonly csv?: string
  readonly xlsx?: {
    readonly base64: string
    readonly sheet: string
    readonly headerRow: number
  }
  readonly mapping?: MappedCsvMappingDto
  readonly mappingId?: string
}
export interface MappedXlsxLayoutDto {
  readonly format: 'lilleri.xlsx-layout.v1'
  readonly workbookDigest: string | null
  readonly sheets: readonly { readonly name: string; readonly rows: number }[]
  readonly selectedSheet: string | null
  readonly headerRow: number | null
  readonly header: readonly string[]
  readonly rowCount: number
  readonly errors: readonly MappedCsvIssueDto[]
}
export interface MappedCsvReportDto {
  readonly inserted: number
  readonly updated: number
  readonly unchanged: number
  readonly rejected: number
  readonly importedAt: string
}
type Request = <T>(path: string, init?: RequestInit) => Promise<T>
/** The provided request function carries the parent financial identity/epoch boundary. */
export function createMappedImportClient(request: Request) {
  return {
    workbookLayout: (input: { base64: string; sheet?: string; headerRow?: number }) =>
      request<MappedXlsxLayoutDto>('/v1/imports/mapped/workbook', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    layout: (input: { csv: string; delimiter: MappedCsvMappingDto['delimiter'] }) =>
      request<MappedCsvLayoutDto>('/v1/imports/mapped/layout', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    listMappings: () => request<readonly SavedCsvMappingDto[]>('/v1/import-mappings'),
    saveMapping: (input: { accountId: string; name: string; mapping: MappedCsvMappingDto }) =>
      request<SavedCsvMappingDto>('/v1/import-mappings', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateMapping: (
      id: string,
      input: { revision: number; name?: string; mapping?: MappedCsvMappingDto; archived?: boolean },
    ) =>
      request<SavedCsvMappingDto>(`/v1/import-mappings/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    preview: (input: MappedCsvImportInput) =>
      request<MappedCsvPreviewDto>('/v1/imports/mapped/preview', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    commit: (
      input: MappedCsvImportInput & {
        previewRevision: string
        requestId: string
        acknowledgeGeneratedDuplicates: boolean
      },
    ) =>
      request<MappedCsvReportDto>('/v1/imports/mapped/commit', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  }
}
