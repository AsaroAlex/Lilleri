import {
  ApiError,
  createMappedImportClient,
  type DemoOverview,
  type MappedCsvColumnsDto,
  type MappedCsvImportInput,
  type MappedCsvIssueDto,
  type MappedCsvLayoutDto,
  type MappedCsvMappingDto,
  type MappedCsvPreviewDto,
  type MappedXlsxLayoutDto,
  manualRequestId,
  type SavedCsvMappingDto,
} from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { type CurrencyCode, parseDecimal } from '@lilleri/domain'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { Translator } from './src/i18n'
import { useI18n } from './src/i18n/context'

type Request = <T>(path: string, init?: RequestInit) => Promise<T>
type ThemeColors = typeof colors.light | typeof colors.dark
type Column = keyof MappedCsvColumnsDto
type DateFormat = MappedCsvMappingDto['dateFormat']
type Status = 'booked' | 'pending' | 'reversed'
type StatusRow = { id: number; raw: string; status: Status }
class MappedValidationError extends Error {}
export interface MappedImportPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly request: Request
  readonly resetKey: number | string
  readonly onChanged: () => Promise<void>
  readonly onError?: (cause: unknown) => boolean
}

const emptyMapping = (currency: CurrencyCode): MappedCsvMappingDto => ({
  format: 'lilleri.csv-mapping.v1',
  delimiter: ';',
  numberLocale: 'it-IT',
  dateFormat: 'dd/MM/yyyy',
  columns: { bookedOn: '', description: '', amount: '' },
  defaultCurrency: currency,
})

const issueKey = (issue: MappedCsvIssueDto) => `${issue.code}:${issue.row}:${issue.column}`
const uniqueIssues = (issues: readonly MappedCsvIssueDto[]) => [
  ...new Map(issues.map((issue) => [issueKey(issue), issue])).values(),
]
function rowAmount(row: MappedCsvPreviewDto['rows'][number], i18n: Translator): string {
  try {
    return i18n.money(parseDecimal(row.record.amount, row.record.currency), {
      sign: 'exceptZero',
      symbolPosition: 'before',
    })
  } catch {
    return `${row.record.amount} ${row.record.currency}`
  }
}

/** Explicit locale mapping and immutable preview input; all CSV/duplicate state is volatile. */
export function MappedImportPanel({
  overview,
  theme,
  request,
  resetKey,
  onChanged,
  onError,
}: MappedImportPanelProps) {
  const i18n = useI18n()
  const { t } = i18n
  const fieldLabels: Readonly<Record<Column, string>> = {
    bookedOn: t('mapped.booking_date'),
    description: t('mapped.description'),
    amount: t('mapped.signed_amount'),
    debit: t('mapped.outgoings'),
    credit: t('mapped.incoming_amounts'),
    currency: t('mapped.currency'),
    externalId: t('mapped.source_identifier'),
    valueOn: t('mapped.value_date'),
    merchant: t('mapped.merchant'),
    reference: t('mapped.reference'),
    status: t('mapped.status'),
  }
  const issueLabels: Readonly<Record<string, string>> = {
    xlsx_invalid_archive: t('mapped.the_excel_file_is_not_a_valid_xlsx_archive'),
    xlsx_resource_limit: t('mapped.the_excel_file_exceeds_the_size_worksheet_or_cell_limits'),
    xlsx_unsupported_content: t(
      'mapped.the_file_contains_unsupported_excel_content_use_a_simple_worksheet_without_',
    ),
    xlsx_invalid_xml: t('mapped.the_excel_file_content_is_invalid'),
    xlsx_formula: t(
      'mapped.excel_formulas_are_not_imported_export_the_cells_as_values_before_continuin',
    ),
    xlsx_merged_cells: t(
      'mapped.merged_cells_make_columns_ambiguous_unmerge_the_cells_before_importing',
    ),
    xlsx_sheet_required: t('mapped.choose_the_worksheet_to_import'),
    xlsx_header_required: t('mapped.enter_the_header_row_from_1_to_100'),
    xlsx_date_cells: t(
      'mapped.use_dates_stored_as_text_in_the_excel_worksheet_in_the_format_selected_belo',
    ),
    xlsx_numeric_cell: t(
      'mapped.a_numeric_cell_uses_an_unsupported_format_use_decimal_numbers_without_expon',
    ),
    xlsx_invalid_cell: t('mapped.an_excel_cell_contains_an_unsupported_type'),
    file_limit: t('mapped.the_file_exceeds_the_256_kib_limit'),
    row_limit: t('mapped.the_file_exceeds_the_1_000_row_limit'),
    column_limit: t('mapped.the_file_contains_too_many_columns'),
    invalid_character: t('mapped.the_file_contains_unsupported_characters_use_a_utf_8_csv'),
    malformed_csv: t('mapped.invalid_quotes_or_separators_in_the_csv'),
    invalid_header: t('mapped.headers_must_be_distinct_and_non_empty'),
    empty_rows: t('mapped.the_file_contains_no_rows_to_import'),
    missing_column: t('mapped.a_mapped_column_is_missing_from_the_file'),
    column_count: t('mapped.the_cell_count_does_not_match_the_headers'),
    invalid_mapping: t('mapped.check_the_mappings_formats_and_currency'),
    invalid_account: t('mapped.the_selected_account_is_unavailable'),
    account_currency_mismatch: t(
      'mapped.the_file_currency_must_match_the_selected_account_currency',
    ),
    invalid_id: t('mapped.invalid_source_identifier'),
    duplicate_id: t('mapped.the_source_identifier_is_repeated_correct_the_file'),
    invalid_date: t('mapped.invalid_date_for_the_selected_format'),
    invalid_currency: t('mapped.the_currency_is_invalid_for_this_transaction'),
    invalid_amount: t('mapped.the_amount_is_invalid_for_the_selected_number_format'),
    amount_range: t('mapped.the_amount_exceeds_the_supported_limit'),
    debit_credit_conflict: t(
      'mapped.outgoing_and_incoming_columns_must_specify_one_amount_per_row',
    ),
    invalid_description: t('mapped.the_description_must_be_present_and_valid'),
    invalid_text: t('mapped.a_text_field_contains_unsupported_characters'),
    invalid_status: t('mapped.the_status_value_does_not_match_the_selected_mappings'),
    duplicate_review_required: t(
      'mapped.review_the_identical_rows_and_choose_whether_to_keep_all_of_them',
    ),
    generated_file_identity: t(
      'mapped.source_identifiers_are_missing_identity_depends_on_file_content_a_different',
    ),
    literal_formula_text: t(
      'mapped.a_formula_like_cell_will_be_retained_as_text_without_being_evaluated',
    ),
    value_date_provenance: t(
      'mapped.the_value_date_is_retained_separately_and_does_not_replace_the_booking_date',
    ),
  }
  const dateLabels: Readonly<Record<DateFormat, string>> = {
    'dd/MM/yyyy': t('mapped.day_month_year_04_10_2026'),
    'yyyy-MM-dd': t('mapped.year_month_day_2026_10_04'),
    'long-it': t('mapped.written_italian_date_4_ottobre_2026'),
  }
  const statusLabels = {
    booked: t('mapped.booked'),
    pending: t('mapped.pending'),
    reversed: t('mapped.reversed'),
  } as const
  const issueText = (issue: MappedCsvIssueDto) => {
    const message =
      issueLabels[issue.code] ?? t('mapped.the_format_needs_review_no_rows_have_been_imported')
    return issue.row
      ? t('mapped.issueRow', {
          row: issue.row,
          field: issue.column ? ` · ${fieldLabels[issue.column]}` : '',
          message,
        })
      : message
  }
  const client = useMemo(() => createMappedImportClient(request), [request])
  const s = useMemo(() => styles(colors[theme]), [theme])
  const scope = `${overview.profile.id}:${String(resetKey)}`
  const context = useRef({ scope, epoch: 0 })
  if (context.current.scope !== scope) context.current = { scope, epoch: context.current.epoch + 1 }
  const mounted = useRef(true)
  const editVersion = useRef(0)
  const readVersion = useRef(0)
  const fileReadVersion = useRef(0)
  const statusSequence = useRef(0)
  const busyEpoch = useRef<number | null>(null)
  const pending = useRef<{ fingerprint: string; requestId: string } | null>(null)
  const handlers = useRef({ onChanged, onError })
  handlers.current = { onChanged, onError }
  const firstAccount =
    overview.accounts.find((account) =>
      overview.connections.some(
        (connection) =>
          connection.id === account.connectionId && connection.providerId === 'local-manual',
      ),
    ) ?? overview.accounts[0]
  const [dataScope, setDataScope] = useState(scope)
  const [accountId, setAccountId] = useState(firstAccount?.id ?? '')
  const [csv, setCsv] = useState('')
  const [fileFormat, setFileFormat] = useState<'csv' | 'xlsx'>('csv')
  const [xlsxBase64, setXlsxBase64] = useState('')
  const [workbookLayout, setWorkbookLayout] = useState<MappedXlsxLayoutDto | null>(null)
  const [xlsxSheet, setXlsxSheet] = useState('')
  const [xlsxHeaderRow, setXlsxHeaderRow] = useState('')
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState<MappedCsvMappingDto>(() =>
    emptyMapping(firstAccount?.balance.currency ?? 'EUR'),
  )
  const [statusRows, setStatusRows] = useState<readonly StatusRow[]>([])
  const [layout, setLayout] = useState<MappedCsvLayoutDto | null>(null)
  const [preview, setPreview] = useState<{
    value: MappedCsvPreviewDto
    input: MappedCsvImportInput
    edit: number
  } | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [mappings, setMappings] = useState<readonly SavedCsvMappingDto[]>([])
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null)
  const [mappingName, setMappingName] = useState('')
  const [expandedColumn, setExpandedColumn] = useState<Column | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [visibleRows, setVisibleRows] = useState(10)
  const [busy, setBusy] = useState(false)
  const [loadingMappings, setLoadingMappings] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const selectedAccount = overview.accounts.find((account) => account.id === accountId)
  const selectedSaved = mappings.find((item) => item.id === selectedSavedId)
  const current = (epoch: number) => mounted.current && context.current.epoch === epoch
  const invalidate = (clearLayout = false) => {
    editVersion.current++
    fileReadVersion.current++
    pending.current = null
    setPreview(null)
    setAcknowledged(false)
    setVisibleRows(10)
    setError(null)
    setNotice(null)
    if (clearLayout) {
      setLayout(null)
      setExpandedColumn(null)
    }
  }
  const changeMapping = (next: MappedCsvMappingDto, clearLayout = false) => {
    invalidate(clearLayout)
    if (next.statusValues !== mapping.statusValues)
      setStatusRows(
        Object.entries(next.statusValues ?? {}).map(([raw, status]) => ({
          id: ++statusSequence.current,
          raw,
          status,
        })),
      )
    setMapping(next)
  }
  const replaceMapping = (next: MappedCsvMappingDto) => {
    setMapping(next)
    setStatusRows(
      Object.entries(next.statusValues ?? {}).map(([raw, status]) => ({
        id: ++statusSequence.current,
        raw,
        status,
      })),
    )
  }
  const reloadMappings = async (epoch: number) => {
    const version = ++readVersion.current
    const rows = await client.listMappings()
    if (!current(epoch) || version !== readVersion.current) return
    if (rows.some((row) => row.profileId !== overview.profile.id))
      throw new MappedValidationError(
        t('mapped.the_received_mappings_do_not_match_the_current_profile'),
      )
    setMappings(rows)
  }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      editVersion.current++
      readVersion.current++
      pending.current = null
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: The trusted profile/session epoch resets volatile CSV state; current handlers are captured per request and do not restart reads on every render.
  useEffect(() => {
    const epoch = context.current.epoch
    const callbacks = handlers.current
    if (dataScope !== scope) {
      editVersion.current++
      pending.current = null
      setCsv('')
      setFileFormat('csv')
      setXlsxBase64('')
      setWorkbookLayout(null)
      setXlsxSheet('')
      setXlsxHeaderRow('')
      setFileName('')
      setLayout(null)
      setPreview(null)
      setAcknowledged(false)
      setMappings([])
      setSelectedSavedId(null)
      setMappingName('')
      setExpandedColumn(null)
      setMapping(emptyMapping(firstAccount?.balance.currency ?? 'EUR'))
      setStatusRows([])
      setAccountId(firstAccount?.id ?? '')
      setShowArchived(false)
      setVisibleRows(10)
      setBusy(false)
      setError(null)
      setNotice(null)
      setDataScope(scope)
    }
    let active = true
    setLoadingMappings(true)
    reloadMappings(epoch)
      .catch((cause) => {
        if (!active || !current(epoch) || callbacks.onError?.(cause)) return
        setError(
          cause instanceof ApiError
            ? i18n.problemMessage(cause)
            : cause instanceof MappedValidationError
              ? cause.message
              : t('mapped.saved_mappings_are_unavailable'),
        )
      })
      .finally(() => {
        if (active && current(epoch)) setLoadingMappings(false)
      })
    return () => {
      active = false
      readVersion.current++
    }
  }, [client, scope])
  const run = async (action: (epoch: number) => Promise<void>, savedMutation = false) => {
    const epoch = context.current.epoch
    if (busyEpoch.current === epoch) return
    busyEpoch.current = epoch
    const callbacks = handlers.current
    setBusy(true)
    setError(null)
    setNotice(null)
    let saved = false
    try {
      await action(epoch)
      if (!current(epoch)) return
      saved = savedMutation
      if (savedMutation) await callbacks.onChanged()
    } catch (cause) {
      if (!current(epoch) || callbacks.onError?.(cause)) return
      if (cause instanceof ApiError && cause.status === 409) {
        invalidate()
        try {
          await reloadMappings(epoch)
        } catch (refreshError) {
          if (current(epoch) && callbacks.onError?.(refreshError)) return
        }
        if (current(epoch))
          setError(
            t('mapped.the_account_transactions_or_mappings_changed_review_the_data_and_show_a_new'),
          )
      } else
        setError(
          saved
            ? t(
                'mapped.the_change_was_saved_but_i_could_not_refresh_the_data_refresh_before_contin',
              )
            : cause instanceof ApiError
              ? i18n.problemMessage(cause)
              : cause instanceof MappedValidationError
                ? cause.message
                : t(
                    'mapped.the_request_is_unconfirmed_for_an_uncertain_import_retry_with_the_same_prev',
                  ),
        )
    } finally {
      if (current(epoch)) {
        busyEpoch.current = null
        setBusy(false)
      }
    }
  }
  const importInput = (): MappedCsvImportInput => {
    if (!selectedAccount || (fileFormat === 'csv' ? !csv.trim() : !xlsxBase64))
      throw new MappedValidationError(t('mapped.choose_an_account_and_add_the_file_to_import'))
    const file =
      fileFormat === 'csv'
        ? { csv }
        : { xlsx: { base64: xlsxBase64, sheet: xlsxSheet, headerRow: Number(xlsxHeaderRow) } }
    if (fileFormat === 'xlsx' && (!xlsxSheet || !/^(?:[1-9]\d?|100)$/.test(xlsxHeaderRow)))
      throw new MappedValidationError(
        t('mapped.choose_the_excel_worksheet_and_enter_the_header_row_from_1_to_100'),
      )
    const used = Object.values(mapping.columns).filter(Boolean)
    if (
      !mapping.columns.bookedOn ||
      !mapping.columns.description ||
      (!mapping.columns.amount && (!mapping.columns.debit || !mapping.columns.credit))
    )
      throw new MappedValidationError(
        t('mapped.map_booking_date_description_and_amount_or_outgoing_and_incoming_amounts'),
      )
    if (new Set(used).size !== used.length)
      throw new MappedValidationError(t('mapped.each_column_can_be_mapped_to_only_one_field'))
    if (mapping.columns.currency ? mapping.defaultCurrency !== undefined : !mapping.defaultCurrency)
      throw new MappedValidationError(t('mapped.choose_the_currency_column_or_a_fixed_currency'))
    if (
      (mapping.dateFormat === 'long-it' || mapping.valueDateFormat === 'long-it') &&
      mapping.numberLocale !== 'it-IT'
    )
      throw new MappedValidationError(t('mapped.written_italian_dates_require_the_italian_format'))
    if (
      mapping.columns.status &&
      (!statusRows.length ||
        statusRows.some((row) => !row.raw) ||
        new Set(statusRows.map((row) => row.raw)).size !== statusRows.length)
    )
      throw new MappedValidationError(t('mapped.map_distinct_non_empty_status_values'))
    if (
      selectedSaved &&
      !selectedSaved.archived &&
      selectedSaved.accountId === accountId &&
      JSON.stringify(selectedSaved.mapping) === JSON.stringify(mapping)
    )
      return { accountId, ...file, mappingId: selectedSaved.id }
    return { accountId, ...file, mapping }
  }
  const inspectWorkbook = () =>
    run(async (epoch) => {
      const edit = editVersion.current
      const value = await client.workbookLayout({ base64: xlsxBase64 })
      if (!current(epoch) || edit !== editVersion.current) return
      setWorkbookLayout(value)
      setLayout(null)
      setPreview(null)
      setAcknowledged(false)
      if (!value.errors.length)
        setNotice(
          t('mapped.choose_a_worksheet_and_enter_the_header_row_no_worksheet_is_selected_automa'),
        )
    })
  const inspect = () =>
    run(async (epoch) => {
      const edit = editVersion.current
      const selectedWorkbook =
        fileFormat === 'xlsx'
          ? await client.workbookLayout({
              base64: xlsxBase64,
              sheet: xlsxSheet,
              headerRow: Number(xlsxHeaderRow),
            })
          : null
      const value: MappedCsvLayoutDto = selectedWorkbook
        ? {
            format: 'lilleri.csv-layout.v1',
            fileDigest: selectedWorkbook.workbookDigest,
            header: selectedWorkbook.header,
            rowCount: selectedWorkbook.rowCount,
            errors: selectedWorkbook.errors,
          }
        : await client.layout({ csv, delimiter: mapping.delimiter })
      if (!current(epoch) || edit !== editVersion.current) return
      setLayout(value)
      setPreview(null)
      setAcknowledged(false)
      if (!value.errors.length)
        setNotice(t('mapped.headersRead', { headers: value.header.length, rows: value.rowCount }))
    })
  const makePreview = () =>
    run(async (epoch) => {
      const input = importInput()
      const edit = editVersion.current
      const value = await client.preview(input)
      if (!current(epoch) || edit !== editVersion.current) return
      setPreview({ value, input, edit })
      setAcknowledged(false)
      setVisibleRows(10)
      pending.current = null
    })
  const commit = () =>
    run(async (epoch) => {
      if (
        !preview ||
        preview.edit !== editVersion.current ||
        preview.value.errors.length ||
        !preview.value.rows.length ||
        (preview.value.duplicateCandidates.length > 0 && !acknowledged)
      )
        throw new MappedValidationError(
          t('mapped.show_a_valid_preview_and_review_repeated_rows_before_importing'),
        )
      const fingerprint = `${preview.value.previewRevision}:${acknowledged}`
      if (!pending.current || pending.current.fingerprint !== fingerprint)
        pending.current = { fingerprint, requestId: manualRequestId() }
      const result = await client.commit({
        ...preview.input,
        previewRevision: preview.value.previewRevision,
        requestId: pending.current.requestId,
        acknowledgeGeneratedDuplicates: acknowledged,
      })
      if (!current(epoch)) return
      editVersion.current++
      pending.current = null
      setCsv('')
      setXlsxBase64('')
      setWorkbookLayout(null)
      setXlsxSheet('')
      setXlsxHeaderRow('')
      setFileName('')
      setLayout(null)
      setPreview(null)
      setAcknowledged(false)
      setNotice(
        t('mapped.importResult', {
          inserted: result.inserted,
          updated: result.updated,
          unchanged: result.unchanged,
          rejected: result.rejected,
        }),
      )
    }, true)
  const save = () =>
    run(async (epoch) => {
      const input = importInput()
      if (!mappingName.trim())
        throw new MappedValidationError(t('mapped.enter_a_name_for_the_mappings_to_save'))
      const result =
        selectedSaved && selectedSaved.accountId === accountId
          ? await client.updateMapping(selectedSaved.id, {
              revision: selectedSaved.revision,
              name: mappingName.trim(),
              mapping,
              archived: false,
            })
          : await client.saveMapping({
              accountId: input.accountId,
              name: mappingName.trim(),
              mapping,
            })
      if (!current(epoch)) return
      invalidate()
      setSelectedSavedId(result.id)
      replaceMapping(result.mapping)
      setMappingName(result.name)
      await reloadMappings(epoch)
      if (current(epoch))
        setNotice(
          t('mapped.mappings_saved_for_this_account_prepare_a_new_preview_before_importing'),
        )
    })
  const archive = (saved: SavedCsvMappingDto) =>
    run(async (epoch) => {
      await client.updateMapping(saved.id, { revision: saved.revision, archived: !saved.archived })
      if (!current(epoch)) return
      invalidate()
      setSelectedSavedId(null)
      await reloadMappings(epoch)
      if (current(epoch))
        setNotice(
          saved.archived
            ? t('mapped.mappings_restored_select_them_and_show_a_new_preview')
            : t('mapped.mappings_archived_previously_imported_transactions_are_retained'),
        )
    })
  const loadSaved = (saved: SavedCsvMappingDto) => {
    if (!overview.accounts.some((account) => account.id === saved.accountId)) return
    invalidate(true)
    setAccountId(saved.accountId)
    setSelectedSavedId(saved.id)
    setMappingName(saved.name)
    replaceMapping(saved.mapping)
  }
  const pickFile = () => {
    if (Platform.OS !== 'web' || busy) return
    const epoch = context.current.epoch
    const callbacks = handlers.current
    const input = document.createElement('input')
    input.type = 'file'
    input.accept =
      fileFormat === 'xlsx'
        ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : '.csv,.tsv,text/csv,text/tab-separated-values'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file || !current(epoch)) return
      invalidate(true)
      setCsv('')
      setXlsxBase64('')
      setWorkbookLayout(null)
      setXlsxSheet('')
      setXlsxHeaderRow('')
      setFileName('')
      if (file.size > (fileFormat === 'xlsx' ? 512 : 256) * 1024) {
        setError(
          fileFormat === 'xlsx'
            ? t('mapped.the_excel_file_exceeds_the_512_kib_limit')
            : t('mapped.the_file_exceeds_the_256_kib_limit'),
        )
        return
      }
      const edit = editVersion.current
      const fileVersion = ++fileReadVersion.current
      const reading =
        fileFormat === 'xlsx'
          ? file.arrayBuffer().then((buffer) => {
              const bytes = new Uint8Array(buffer)
              let binary = ''
              for (let offset = 0; offset < bytes.length; offset += 8192)
                binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
              return btoa(binary)
            })
          : file.text()
      reading
        .then((value) => {
          if (
            current(epoch) &&
            edit === editVersion.current &&
            fileVersion === fileReadVersion.current
          ) {
            invalidate(true)
            if (fileFormat === 'xlsx') setXlsxBase64(value)
            else setCsv(value)
            setFileName(file.name)
          }
        })
        .catch((cause) => {
          if (
            current(epoch) &&
            edit === editVersion.current &&
            fileVersion === fileReadVersion.current &&
            !callbacks.onError?.(cause)
          )
            setError(t('mapped.i_could_not_read_the_selected_file'))
        })
    }
    input.click()
  }
  const button = (label: string, action: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy }}
      aria-disabled={disabled || busy}
      disabled={disabled || busy}
      onPress={action}
      style={[s.button, (disabled || busy) && s.disabled]}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  )
  const choices = <T extends string>(
    label: string,
    values: readonly T[],
    selected: T,
    names: Readonly<Record<T, string>>,
    choose: (value: T) => void,
  ) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        {values.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${names[value]}`}
            aria-checked={value === selected}
            aria-disabled={busy}
            accessibilityState={{ checked: value === selected, disabled: busy }}
            disabled={busy}
            onPress={() => choose(value)}
            style={[s.choice, selected === value && s.selected]}
          >
            <Text style={s.body}>{names[value]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
  const column = (key: Column, optional = false) => (
    <View style={s.field}>
      <Text style={s.label}>
        {fieldLabels[key]}
        {optional ? t('mapped.optional') : ''}
      </Text>
      {button(`${fieldLabels[key]}: ${mapping.columns[key] || t('mapped.select_column')}`, () =>
        setExpandedColumn(expandedColumn === key ? null : key),
      )}
      {expandedColumn === key && (
        <View style={s.row}>
          {[...(optional ? [''] : []), ...(layout?.header ?? [])].map((header) => (
            <Pressable
              key={header || 'none'}
              accessibilityRole="radio"
              accessibilityLabel={`${fieldLabels[key]}: ${header || t('mapped.none')}`}
              aria-checked={mapping.columns[key] === header || (!header && !mapping.columns[key])}
              aria-disabled={busy}
              accessibilityState={{
                checked: mapping.columns[key] === header || (!header && !mapping.columns[key]),
                disabled: busy,
              }}
              disabled={busy}
              onPress={() => {
                const columns = { ...mapping.columns }
                if (header) columns[key] = header
                else delete columns[key]
                const next = { ...mapping, columns }
                if (key === 'valueOn' && !header) delete next.valueDateFormat
                if (key === 'status') {
                  if (header && !next.statusValues) next.statusValues = { booked: 'booked' }
                  if (!header) delete next.statusValues
                }
                changeMapping(next)
                setExpandedColumn(null)
              }}
              style={[s.choice, mapping.columns[key] === header && s.selected]}
            >
              <Text style={s.body}>{header || t('mapped.none')}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
  if (dataScope !== scope)
    return (
      <ActivityIndicator
        accessibilityLabel={t('mapped.loading_current_account')}
        color={colors[theme].primary}
      />
    )
  const errors = preview?.value.errors ?? layout?.errors ?? workbookLayout?.errors ?? []
  const duplicateReview = Boolean(preview?.value.duplicateCandidates.length)
  const canCommit = Boolean(
    preview &&
      preview.edit === editVersion.current &&
      !preview.value.errors.length &&
      preview.value.rows.length &&
      (preview.value.canImport || (duplicateReview && acknowledged)),
  )
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.title}>
        {t(fileFormat === 'xlsx' ? 'mapped.xlsxTitle' : 'mapped.import_csv_with_mappings')}
      </Text>
      <Text style={s.body}>
        {t('mapped.choose_the_account_read_the_headers_and_map_the_columns_a_manual_account_ba')}
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={s.notice}>
          {notice}
        </Text>
      )}
      <View style={s.card}>
        <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
          {t('mapped.1_account_and_file')}
        </Text>
        <View style={s.row}>
          {overview.accounts.map((account) => (
            <Pressable
              key={account.id}
              accessibilityRole="radio"
              accessibilityLabel={t('mapped.accountChoice', {
                name: account.name,
                currency: account.balance.currency,
              })}
              aria-checked={accountId === account.id}
              aria-disabled={busy}
              accessibilityState={{ checked: accountId === account.id, disabled: busy }}
              disabled={busy}
              onPress={() => {
                invalidate()
                setAccountId(account.id)
                setSelectedSavedId(null)
                if (mapping.defaultCurrency)
                  setMapping({ ...mapping, defaultCurrency: account.balance.currency })
              }}
              style={[s.choice, accountId === account.id && s.selected]}
            >
              <Text style={s.body}>
                {account.name} · {account.balance.currency}
              </Text>
            </Pressable>
          ))}
        </View>
        {!overview.accounts.length && (
          <Text style={s.body}>{t('mapped.add_a_manual_account_before_importing_a_file')}</Text>
        )}
        {Platform.OS === 'web' &&
          choices(
            t('mapped.file_format'),
            ['csv', 'xlsx'] as const,
            fileFormat,
            { csv: 'CSV UTF-8', xlsx: t('mapped.excel_xlsx') },
            (value) => {
              invalidate(true)
              setFileFormat(value)
              setCsv('')
              setXlsxBase64('')
              setWorkbookLayout(null)
              setXlsxSheet('')
              setXlsxHeaderRow('')
              setFileName('')
            },
          )}
        {fileFormat === 'csv' && (
          <>
            <Text style={s.label}>
              {t('mapped.utf_8_csv_content_maximum_256_kib_and_1_000_rows')}
            </Text>
            <TextInput
              accessibilityLabel={t('mapped.csv_to_map')}
              multiline
              autoCapitalize="none"
              editable={!busy}
              value={csv}
              onChangeText={(value) => {
                invalidate(true)
                setCsv(value)
                setFileName('')
              }}
              placeholder={t('mapped.paste_file_headers_and_rows')}
              placeholderTextColor={colors[theme].textTertiary}
              style={[s.input, s.csv]}
            />
          </>
        )}
        {fileFormat === 'xlsx' && (
          <Text style={s.body}>
            {t(
              'mapped.excel_xlsx_maximum_512_kib_8_worksheets_and_1_000_transactions_choose_a_sim',
            )}
          </Text>
        )}
        {Platform.OS === 'web' &&
          button(
            fileFormat === 'xlsx'
              ? t('mapped.choose_excel_xlsx_file')
              : t('mapped.choose_csv_file'),
            pickFile,
          )}
        {fileName && <Text style={s.body}>{t('mapped.selectedFile', { name: fileName })}</Text>}
        {fileFormat === 'xlsx' && (
          <>
            {button(
              t('mapped.read_excel_worksheets'),
              inspectWorkbook,
              !xlsxBase64 || !selectedAccount,
            )}
            {workbookLayout && !workbookLayout.errors.length && (
              <>
                {choices(
                  t('mapped.excel_worksheet'),
                  workbookLayout.sheets.map((sheet) => sheet.name),
                  xlsxSheet,
                  Object.fromEntries(
                    workbookLayout.sheets.map((sheet) => [sheet.name, sheet.name]),
                  ),
                  (value) => {
                    invalidate(true)
                    setXlsxSheet(value)
                  },
                )}
                <Text style={s.label}>{t('mapped.worksheet_header_row_from_1_to_100')}</Text>
                <TextInput
                  accessibilityLabel={t('mapped.excel_header_row')}
                  editable={!busy}
                  keyboardType="number-pad"
                  value={xlsxHeaderRow}
                  onChangeText={(value) => {
                    invalidate(true)
                    setXlsxHeaderRow(value)
                  }}
                  placeholder={t('mapped.enter_the_row_number')}
                  placeholderTextColor={colors[theme].textTertiary}
                  style={s.input}
                />
              </>
            )}
          </>
        )}
        {fileFormat === 'csv' &&
          choices(
            t('mapped.separator'),
            [';', ',', '\t'] as const,
            mapping.delimiter,
            { ';': t('mapped.semicolon'), ',': t('mapped.comma'), '\t': t('mapped.tab') },
            (value) => changeMapping({ ...mapping, delimiter: value }, true),
          )}
        {button(
          fileFormat === 'xlsx' ? t('mapped.read_excel_headers') : t('mapped.read_csv_headers'),
          inspect,
          !selectedAccount ||
            (fileFormat === 'csv'
              ? !csv.trim()
              : !xlsxBase64 || !xlsxSheet || !/^(?:[1-9]\d?|100)$/.test(xlsxHeaderRow)),
        )}
      </View>
      <View style={s.card}>
        <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
          {t('mapped.saved_mappings_for_your_accounts')}
        </Text>
        {loadingMappings && <ActivityIndicator color={colors[theme].primary} />}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={t('mapped.show_archived_mappings')}
          aria-checked={showArchived}
          aria-disabled={busy}
          accessibilityState={{ checked: showArchived, disabled: busy }}
          disabled={busy}
          onPress={() => setShowArchived(!showArchived)}
          style={s.choice}
        >
          <Text style={s.body}>
            {showArchived ? '✓ ' : ''}
            {t('mapped.show_archived_mappings')}
          </Text>
        </Pressable>
        {mappings
          .filter((saved) => showArchived || !saved.archived)
          .map((saved) => (
            <View key={saved.id} style={s.saved}>
              <Text style={s.body}>
                {saved.name} ·{' '}
                {overview.accounts.find((account) => account.id === saved.accountId)?.name ??
                  t('mapped.account_unavailable')}
                {saved.archived ? t('mapped.archived') : ''}
              </Text>
              <View style={s.row}>
                {button(
                  t('mapped.useMapping', { name: saved.name }),
                  () => loadSaved(saved),
                  saved.archived ||
                    !overview.accounts.some((account) => account.id === saved.accountId),
                )}
                {button(
                  t('mapped.mappingAction', {
                    action: saved.archived ? t('mapped.restore') : t('mapped.archive'),
                    name: saved.name,
                  }),
                  () => {
                    void archive(saved)
                  },
                )}
              </View>
            </View>
          ))}
        {!loadingMappings && !mappings.some((saved) => showArchived || !saved.archived) && (
          <Text style={s.body}>
            {t('mapped.no_saved_mappings_prepare_the_columns_below_and_give_the_format_a_name')}
          </Text>
        )}
      </View>
      {layout && !layout.errors.length && (
        <View style={s.card}>
          <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
            {t('mapped.2_map_the_columns')}
          </Text>
          <Text style={s.body}>
            {t('mapped.layoutSummary', {
              rows: layout.rowCount,
              headers: layout.header.join(', '),
            })}
          </Text>
          {column('bookedOn')}
          {column('description')}
          {choices(
            t('mapped.amount_columns'),
            ['single', 'separate'] as const,
            mapping.columns.amount !== undefined ? 'single' : 'separate',
            {
              single: t('mapped.one_signed_amount'),
              separate: t('mapped.separate_outgoing_and_incoming_amounts'),
            },
            (value) => {
              const columns = { ...mapping.columns }
              if (value === 'single') {
                delete columns.debit
                delete columns.credit
                columns.amount = ''
              } else {
                delete columns.amount
                columns.debit = ''
                columns.credit = ''
              }
              changeMapping({ ...mapping, columns })
            },
          )}
          {mapping.columns.amount !== undefined ? (
            column('amount')
          ) : (
            <>
              {column('debit')}
              {column('credit')}
            </>
          )}
          {choices(
            t('mapped.number_format'),
            ['it-IT', 'en-GB'] as const,
            mapping.numberLocale,
            { 'it-IT': t('mapped.italian_1_234_56'), 'en-GB': t('mapped.english_1_234_56') },
            (value) => changeMapping({ ...mapping, numberLocale: value }),
          )}
          {choices(
            t('mapped.booking_date_format'),
            ['dd/MM/yyyy', 'yyyy-MM-dd', 'long-it'] as const,
            mapping.dateFormat,
            dateLabels,
            (value) => changeMapping({ ...mapping, dateFormat: value }),
          )}
          {choices(
            t('mapped.currency_source'),
            ['fixed', 'column'] as const,
            mapping.columns.currency !== undefined ? 'column' : 'fixed',
            {
              fixed: t('mapped.fixed_currency_for_the_file'),
              column: t('mapped.a_currency_column'),
            },
            (value) => {
              const next = { ...mapping, columns: { ...mapping.columns } }
              if (value === 'column') {
                delete next.defaultCurrency
                next.columns.currency = ''
              } else {
                delete next.columns.currency
                next.defaultCurrency = selectedAccount?.balance.currency ?? 'EUR'
              }
              changeMapping(next)
            },
          )}
          {mapping.columns.currency !== undefined ? (
            column('currency')
          ) : (
            <View style={s.field}>
              <Text style={s.label}>{t('mapped.fixed_currency')}</Text>
              <TextInput
                accessibilityLabel={t('mapped.fixed_csv_currency')}
                editable={!busy}
                autoCapitalize="characters"
                value={mapping.defaultCurrency ?? ''}
                onChangeText={(value) =>
                  changeMapping({
                    ...mapping,
                    defaultCurrency: value.toUpperCase() as CurrencyCode,
                  })
                }
                style={s.input}
              />
            </View>
          )}
          {column('externalId', true)}
          {column('valueOn', true)}
          {mapping.columns.valueOn &&
            choices(
              t('mapped.value_date_format'),
              ['dd/MM/yyyy', 'yyyy-MM-dd', 'long-it'] as const,
              mapping.valueDateFormat ?? mapping.dateFormat,
              dateLabels,
              (value) => changeMapping({ ...mapping, valueDateFormat: value }),
            )}
          {column('merchant', true)}
          {column('reference', true)}
          {column('status', true)}
          {mapping.columns.status ? (
            <View style={s.field}>
              <Text style={s.body}>{t('mapped.values_are_exact_and_case_sensitive')}</Text>
              {statusRows.map((row, index) => (
                <View key={row.id} style={s.field}>
                  <Text style={s.label}>
                    {statusLabels[row.status]}
                    {t('mapped.value_in_the_file')}
                  </Text>
                  <TextInput
                    accessibilityLabel={t('mapped.statusAlias', {
                      status: statusLabels[row.status],
                      index: index + 1,
                    })}
                    editable={!busy}
                    autoCapitalize="none"
                    value={row.raw}
                    onChangeText={(value) => {
                      const rows = statusRows.map((item) =>
                        item.id === row.id ? { ...item, raw: value } : item,
                      )
                      invalidate()
                      setStatusRows(rows)
                      setMapping({
                        ...mapping,
                        statusValues: Object.fromEntries(
                          rows.map((item) => [item.raw, item.status]),
                        ),
                      })
                    }}
                    style={s.input}
                  />
                </View>
              ))}
              <View style={s.row}>
                {(['booked', 'pending', 'reversed'] as const).map((status) => (
                  <View key={status}>
                    {button(t('mapped.addStatus', { status: statusLabels[status] }), () => {
                      const values = { ...mapping.statusValues }
                      values[status] = status
                      changeMapping({ ...mapping, statusValues: values })
                    })}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={s.body}>
              {t('mapped.without_a_status_column_rows_are_treated_as_booked')}
            </Text>
          )}
          <Text style={s.label}>{t('mapped.mapping_name_for_this_account')}</Text>
          <TextInput
            accessibilityLabel={t('mapped.csv_mapping_name')}
            editable={!busy}
            value={mappingName}
            onChangeText={(value) => {
              invalidate()
              setMappingName(value)
            }}
            placeholder={t('mapped.for_example_my_account_export')}
            style={s.input}
          />
          <View style={s.row}>
            {button(
              selectedSaved ? t('mapped.save_mapping_changes') : t('mapped.save_csv_mappings'),
              () => {
                void save()
              },
              !mappingName.trim(),
            )}
            {button(
              t('mapped.show_import_preview'),
              () => {
                void makePreview()
              },
              !selectedAccount || (fileFormat === 'csv' ? !csv.trim() : !xlsxBase64),
            )}
          </View>
        </View>
      )}
      {errors.length > 0 && (
        <View style={s.card}>
          <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
            {t('mapped.correct_the_file_or_mappings')}
          </Text>
          <Text style={s.body}>{t('mapped.no_rows_are_imported_while_errors_remain')}</Text>
          {uniqueIssues(errors).map((issue) => (
            <Text key={issueKey(issue)} style={s.error}>
              {issueText(issue)}
            </Text>
          ))}
        </View>
      )}
      {preview && (
        <View style={s.card}>
          <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
            {t('mapped.3_review_the_preview')}
          </Text>
          <Text style={s.body}>
            {t('mapped.previewSummary', {
              name: selectedAccount?.name ?? t('mapped.unavailable'),
              rows: preview.value.rowCount,
              valid: preview.value.rows.length,
            })}
          </Text>
          {uniqueIssues(preview.value.warnings).map((issue) => (
            <Text key={issueKey(issue)} style={s.body}>
              {issueText(issue)}
            </Text>
          ))}
          {preview.value.rows.slice(0, visibleRows).map((row) => (
            <View key={row.rowNumber} style={s.previewRow}>
              <Text style={s.label}>
                {t('mapped.previewRow', {
                  row: row.rowNumber,
                  date: i18n.calendarDate(row.record.bookedOn),
                  amount: rowAmount(row, i18n),
                })}
              </Text>
              <Text style={s.body}>
                {row.record.description} · {statusLabels[row.record.status]}
              </Text>
              {row.provenance.valueOn && (
                <Text style={s.small}>
                  {t('mapped.valueDateOriginal', {
                    date: i18n.calendarDate(row.provenance.valueOn),
                    original: row.provenance.rawValueOn ?? '',
                  })}
                </Text>
              )}
              <Text style={s.small}>
                {t('mapped.identity')}{' '}
                {row.provenance.identity === 'external'
                  ? t('mapped.source_identifier_full')
                  : t('mapped.file_content_and_repetition_position')}
              </Text>
            </View>
          ))}
          {visibleRows < preview.value.rows.length &&
            button(t('mapped.show_more_preview_rows'), () => setVisibleRows((value) => value + 20))}
          {preview.value.duplicateCandidates.map((group) => (
            <View key={group.contentFingerprint} style={s.previewRow}>
              <Text style={s.label}>
                {t('mapped.duplicateRows', { rows: group.rowNumbers.join(', ') })}
              </Text>
              <Text style={s.body}>
                {t(
                  'mapped.these_may_be_separate_purchases_all_will_remain_present_if_you_confirm_them',
                )}
              </Text>
              {preview.value.rows
                .filter((row) => group.rowNumbers.includes(row.rowNumber))
                .map((row) => (
                  <Text key={row.rowNumber} style={s.small}>
                    {t('mapped.duplicateRow', {
                      row: row.rowNumber,
                      date: i18n.calendarDate(row.record.bookedOn),
                      amount: rowAmount(row, i18n),
                      description: row.record.description,
                    })}
                  </Text>
                ))}
            </View>
          ))}
          {duplicateReview && (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={t(
                'mapped.i_reviewed_the_identical_rows_and_want_to_keep_all_of_them',
              )}
              aria-checked={acknowledged}
              aria-disabled={busy}
              accessibilityState={{ checked: acknowledged, disabled: busy }}
              disabled={busy}
              onPress={() => {
                pending.current = null
                setAcknowledged(!acknowledged)
              }}
              style={[s.choice, acknowledged && s.selected]}
            >
              <Text style={s.body}>
                {acknowledged ? '✓ ' : ''}
                {t('mapped.i_reviewed_the_identical_rows_and_want_to_keep_all_of_them_full')}
              </Text>
            </Pressable>
          )}
          {button(
            t('mapped.import_preview_rows'),
            () => {
              void commit()
            },
            !canCommit,
          )}
        </View>
      )}
    </View>
  )
}

const styles = (c: ThemeColors) =>
  StyleSheet.create({
    panel: { gap: 16 },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    title: { fontFamily: 'GeistSemibold', fontSize: 24, lineHeight: 31, color: c.textPrimary },
    subtitle: { fontFamily: 'GeistSemibold', fontSize: 18, lineHeight: 25, color: c.textPrimary },
    body: {
      fontFamily: 'Geist',
      fontSize: 15,
      lineHeight: 23,
      color: c.textSecondary,
      flexShrink: 1,
    },
    label: { fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 22, color: c.textPrimary },
    small: { fontFamily: 'Geist', fontSize: 13, lineHeight: 20, color: c.textSecondary },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    field: { gap: 7 },
    saved: { gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border },
    previewRow: { gap: 4, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    input: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 9,
      padding: 11,
      backgroundColor: c.surfaceElevated,
      fontFamily: 'Geist',
      fontSize: 15,
      lineHeight: 23,
      color: c.textPrimary,
    },
    csv: { minHeight: 150, textAlignVertical: 'top' },
    button: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: 13,
      paddingVertical: 11,
      backgroundColor: c.primary,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 1,
    },
    buttonText: {
      fontFamily: 'GeistSemibold',
      fontSize: 14,
      lineHeight: 22,
      color: c.onPrimary,
      textAlign: 'center',
    },
    choice: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 9,
      justifyContent: 'center',
      flexShrink: 1,
    },
    selected: { borderColor: c.primary, backgroundColor: c.primarySoft },
    disabled: { opacity: 0.5 },
    error: { fontFamily: 'Geist', fontSize: 15, lineHeight: 23, color: c.danger },
    notice: { fontFamily: 'Geist', fontSize: 15, lineHeight: 23, color: c.success },
  })
