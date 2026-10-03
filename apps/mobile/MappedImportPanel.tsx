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
  manualRequestId,
  type SavedCsvMappingDto,
} from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { type CurrencyCode, parseDecimal } from '@lilleri/domain'
import { formatMoney } from '@lilleri/money'
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

type Request = <T>(path: string, init?: RequestInit) => Promise<T>
type ThemeColors = typeof colors.light | typeof colors.dark
type Column = keyof MappedCsvColumnsDto
type DateFormat = MappedCsvMappingDto['dateFormat']
type Status = 'booked' | 'pending' | 'reversed'
type StatusRow = { id: number; raw: string; status: Status }
export interface MappedImportPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly request: Request
  readonly resetKey: number | string
  readonly onChanged: () => Promise<void>
  readonly onError?: (cause: unknown) => boolean
}
const fieldLabels: Readonly<Record<Column, string>> = {
  bookedOn: 'Data di contabilizzazione',
  description: 'Descrizione',
  amount: 'Importo con segno',
  debit: 'Uscite',
  credit: 'Entrate',
  currency: 'Valuta',
  externalId: 'Identificatore della fonte',
  valueOn: 'Data valuta',
  merchant: 'Esercente',
  reference: 'Riferimento',
  status: 'Stato',
}
const issueLabels: Readonly<Record<string, string>> = {
  file_limit: 'Il file supera il limite di 256 KiB.',
  row_limit: 'Il file supera il limite di 1.000 righe.',
  column_limit: 'Il file contiene troppe colonne.',
  invalid_character: 'Il file contiene caratteri non ammessi. Usa un CSV UTF-8.',
  malformed_csv: 'Virgolette o separatori non validi nel CSV.',
  invalid_header: 'Le intestazioni devono essere distinte e non vuote.',
  empty_rows: 'Il file non contiene righe da importare.',
  missing_column: 'Una colonna associata non è presente nel file.',
  column_count: 'Il numero di celle non corrisponde alle intestazioni.',
  invalid_mapping: 'Controlla le associazioni, i formati e la valuta.',
  invalid_account: 'Il conto scelto non è disponibile.',
  account_currency_mismatch: 'La valuta del file deve corrispondere alla valuta del conto scelto.',
  invalid_id: 'Identificatore della fonte non valido.',
  duplicate_id: 'L’identificatore della fonte è ripetuto: correggi il file.',
  invalid_date: 'Data non valida per il formato scelto.',
  invalid_currency: 'La valuta non è valida per questo movimento.',
  invalid_amount: 'L’importo non è valido per il formato numerico scelto.',
  amount_range: 'L’importo supera il limite supportato.',
  debit_credit_conflict: 'Uscita ed entrata devono indicare un solo importo per riga.',
  invalid_description: 'La descrizione deve essere presente e valida.',
  invalid_text: 'Un campo di testo contiene caratteri non ammessi.',
  invalid_status: 'Il valore dello stato non corrisponde alle associazioni scelte.',
  duplicate_review_required: 'Controlla le righe uguali e scegli se mantenerle tutte.',
  generated_file_identity:
    'Il file non contiene un codice univoco per ogni movimento. Confrontiamo il contenuto e la posizione delle righe: se cambi il file, controlla di nuovo i possibili duplicati.',
  literal_formula_text:
    'Una cella simile a una formula sarà conservata come testo, senza eseguirla.',
  value_date_provenance:
    'La data valuta è conservata separatamente e non sostituisce la data di contabilizzazione.',
}
const dateLabels: Readonly<Record<DateFormat, string>> = {
  'dd/MM/yyyy': 'Giorno/mese/anno · 04/10/2026',
  'yyyy-MM-dd': 'Anno-mese-giorno · 2026-10-04',
  'long-it': 'Data italiana estesa · 4 ottobre 2026',
}
const statusLabels = {
  booked: 'Contabilizzato',
  pending: 'In attesa',
  reversed: 'Stornato',
} as const
const emptyMapping = (currency: CurrencyCode): MappedCsvMappingDto => ({
  format: 'lilleri.csv-mapping.v1',
  delimiter: ';',
  numberLocale: 'it-IT',
  dateFormat: 'dd/MM/yyyy',
  columns: { bookedOn: '', description: '', amount: '' },
  defaultCurrency: currency,
})
const issueText = (issue: MappedCsvIssueDto) =>
  `${issue.row ? `Riga ${issue.row}${issue.column ? ` · ${fieldLabels[issue.column]}` : ''}: ` : ''}${issueLabels[issue.code] ?? 'Il formato richiede una verifica. Nessuna riga è stata importata.'}`
const issueKey = (issue: MappedCsvIssueDto) => `${issue.code}:${issue.row}:${issue.column}`
const uniqueIssues = (issues: readonly MappedCsvIssueDto[]) => [
  ...new Map(issues.map((issue) => [issueKey(issue), issue])).values(),
]
function rowAmount(row: MappedCsvPreviewDto['rows'][number]): string {
  try {
    return formatMoney(parseDecimal(row.record.amount, row.record.currency), {
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
      throw new Error('Le associazioni ricevute non corrispondono al profilo corrente.')
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
          cause instanceof Error ? cause.message : 'Le associazioni salvate non sono disponibili.',
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
            'Il conto, i movimenti o le associazioni sono cambiati. Controlla i dati e mostra una nuova anteprima; l’importazione non viene ripetuta automaticamente.',
          )
      } else
        setError(
          saved
            ? 'La modifica è stata salvata, ma non riesco ad aggiornare i dati. Ricarica prima di continuare.'
            : cause instanceof Error
              ? cause.message
              : 'Non sappiamo ancora se l’importazione è stata completata. Riprova dalla stessa anteprima per evitare un doppio inserimento.',
        )
    } finally {
      if (current(epoch)) {
        busyEpoch.current = null
        setBusy(false)
      }
    }
  }
  const importInput = (): MappedCsvImportInput => {
    if (!selectedAccount || !csv.trim())
      throw new Error('Scegli un conto e aggiungi il contenuto del CSV.')
    const used = Object.values(mapping.columns).filter(Boolean)
    if (
      !mapping.columns.bookedOn ||
      !mapping.columns.description ||
      (!mapping.columns.amount && (!mapping.columns.debit || !mapping.columns.credit))
    )
      throw new Error(
        'Associa data di contabilizzazione, descrizione e importo, oppure uscite e entrate.',
      )
    if (new Set(used).size !== used.length)
      throw new Error('Ogni colonna può essere associata a un solo campo.')
    if (mapping.columns.currency ? mapping.defaultCurrency !== undefined : !mapping.defaultCurrency)
      throw new Error('Scegli la colonna della valuta oppure una valuta fissa.')
    if (
      (mapping.dateFormat === 'long-it' || mapping.valueDateFormat === 'long-it') &&
      mapping.numberLocale !== 'it-IT'
    )
      throw new Error('Le date italiane estese richiedono il formato italiano.')
    if (
      mapping.columns.status &&
      (!statusRows.length ||
        statusRows.some((row) => !row.raw) ||
        new Set(statusRows.map((row) => row.raw)).size !== statusRows.length)
    )
      throw new Error('Associa valori dello stato distinti e non vuoti.')
    if (
      selectedSaved &&
      !selectedSaved.archived &&
      selectedSaved.accountId === accountId &&
      JSON.stringify(selectedSaved.mapping) === JSON.stringify(mapping)
    )
      return { accountId, csv, mappingId: selectedSaved.id }
    return { accountId, csv, mapping }
  }
  const inspect = () =>
    run(async (epoch) => {
      const edit = editVersion.current
      const value = await client.layout({ csv, delimiter: mapping.delimiter })
      if (!current(epoch) || edit !== editVersion.current) return
      setLayout(value)
      setPreview(null)
      setAcknowledged(false)
      if (!value.errors.length)
        setNotice(
          `${value.header.length} intestazioni e ${value.rowCount} righe lette. Associa le colonne prima dell’anteprima.`,
        )
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
        throw new Error(
          'Mostra un’anteprima valida e controlla le righe ripetute prima di importare.',
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
      setFileName('')
      setLayout(null)
      setPreview(null)
      setAcknowledged(false)
      setNotice(
        `${result.inserted} nuovi movimenti, ${result.updated} aggiornati, ${result.unchanged} già presenti${result.rejected ? `; ${result.rejected} non acquisiti` : ''}. Controlla il saldo e lo storico del conto.`,
      )
    }, true)
  const save = () =>
    run(async (epoch) => {
      const input = importInput()
      if (!mappingName.trim()) throw new Error('Scrivi un nome per le associazioni da salvare.')
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
          'Associazioni salvate per questo conto. Prepara una nuova anteprima prima di importare.',
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
            ? 'Associazioni ripristinate. Sceglile e mostra una nuova anteprima.'
            : 'Associazioni archiviate. I movimenti già importati sono conservati.',
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
    input.accept = '.csv,.tsv,text/csv,text/tab-separated-values'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file || !current(epoch)) return
      invalidate(true)
      setCsv('')
      setFileName('')
      if (file.size > 256 * 1024) {
        setError('Il file supera il limite di 256 KiB.')
        return
      }
      const edit = editVersion.current
      const fileVersion = ++fileReadVersion.current
      file
        .text()
        .then((value) => {
          if (
            current(epoch) &&
            edit === editVersion.current &&
            fileVersion === fileReadVersion.current
          ) {
            invalidate(true)
            setCsv(value)
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
            setError('Non riesco a leggere il file CSV.')
        })
    }
    input.click()
  }
  const button = (label: string, action: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy }}
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
        {optional ? ' · facoltativo' : ''}
      </Text>
      {button(`${fieldLabels[key]}: ${mapping.columns[key] || 'Seleziona colonna'}`, () =>
        setExpandedColumn(expandedColumn === key ? null : key),
      )}
      {expandedColumn === key && (
        <View style={s.row}>
          {[...(optional ? [''] : []), ...(layout?.header ?? [])].map((header) => (
            <Pressable
              key={header || 'none'}
              accessibilityRole="radio"
              accessibilityLabel={`${fieldLabels[key]}: ${header || 'Nessuna'}`}
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
              <Text style={s.body}>{header || 'Nessuna'}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
  if (dataScope !== scope)
    return (
      <ActivityIndicator
        accessibilityLabel="Caricamento del conto corrente"
        color={colors[theme].primary}
      />
    )
  const errors = preview?.value.errors ?? layout?.errors ?? []
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
      <Text accessibilityRole="header" style={s.title}>
        Importa movimenti da file
      </Text>
      <Text style={s.body}>
        Scegli conto e file, indica quali colonne contengono data, descrizione e importo, poi
        controlla l’anteprima. I nuovi movimenti aggiornano il saldo dei conti manuali; il saldo dei
        conti collegati resta quello comunicato dalla fonte.
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
        <Text accessibilityRole="header" style={s.subtitle}>
          1. Conto e file
        </Text>
        <View style={s.row}>
          {overview.accounts.map((account) => (
            <Pressable
              key={account.id}
              accessibilityRole="radio"
              accessibilityLabel={`Conto per importazione: ${account.name}, ${account.balance.currency}`}
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
          <Text style={s.body}>Aggiungi un conto a mano prima di importare un file.</Text>
        )}
        <Text style={s.label}>Contenuto del CSV UTF-8 · massimo 256 KiB e 1.000 righe</Text>
        <TextInput
          accessibilityLabel="CSV da associare"
          multiline
          autoCapitalize="none"
          editable={!busy}
          value={csv}
          onChangeText={(value) => {
            invalidate(true)
            setCsv(value)
            setFileName('')
          }}
          placeholder="Incolla intestazioni e righe del file"
          placeholderTextColor={colors[theme].textTertiary}
          style={[s.input, s.csv]}
        />
        {Platform.OS === 'web' && button('Scegli file CSV', pickFile)}
        {fileName && <Text style={s.body}>File selezionato: {fileName}</Text>}
        {choices(
          'Separatore',
          [';', ',', '\t'] as const,
          mapping.delimiter,
          { ';': 'Punto e virgola', ',': 'Virgola', '\t': 'Tabulazione' },
          (value) => changeMapping({ ...mapping, delimiter: value }, true),
        )}
        {button('Leggi intestazioni CSV', inspect, !csv.trim() || !selectedAccount)}
      </View>
      <View style={s.card}>
        <Text accessibilityRole="header" style={s.subtitle}>
          Associazioni salvate per i tuoi conti
        </Text>
        {loadingMappings && <ActivityIndicator color={colors[theme].primary} />}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Mostra associazioni archiviate"
          aria-checked={showArchived}
          aria-disabled={busy}
          accessibilityState={{ checked: showArchived, disabled: busy }}
          disabled={busy}
          onPress={() => setShowArchived(!showArchived)}
          style={s.choice}
        >
          <Text style={s.body}>{showArchived ? '✓ ' : ''}Mostra associazioni archiviate</Text>
        </Pressable>
        {mappings
          .filter((saved) => showArchived || !saved.archived)
          .map((saved) => (
            <View key={saved.id} style={s.saved}>
              <Text style={s.body}>
                {saved.name} ·{' '}
                {overview.accounts.find((account) => account.id === saved.accountId)?.name ??
                  'Conto non disponibile'}
                {saved.archived ? ' · archiviate' : ''}
              </Text>
              <View style={s.row}>
                {button(
                  `Usa ${saved.name}`,
                  () => loadSaved(saved),
                  saved.archived ||
                    !overview.accounts.some((account) => account.id === saved.accountId),
                )}
                {button(`${saved.archived ? 'Ripristina' : 'Archivia'} ${saved.name}`, () => {
                  void archive(saved)
                })}
              </View>
            </View>
          ))}
        {!loadingMappings && !mappings.some((saved) => showArchived || !saved.archived) && (
          <Text style={s.body}>
            Nessuna associazione salvata. Prepara le colonne qui sotto e dai un nome al formato.
          </Text>
        )}
      </View>
      {layout && !layout.errors.length && (
        <View style={s.card}>
          <Text accessibilityRole="header" style={s.subtitle}>
            2. Associa le colonne
          </Text>
          <Text style={s.body}>
            {layout.rowCount} righe · intestazioni: {layout.header.join(', ')}
          </Text>
          {column('bookedOn')}
          {column('description')}
          {choices(
            'Colonne degli importi',
            ['single', 'separate'] as const,
            mapping.columns.amount !== undefined ? 'single' : 'separate',
            { single: 'Un importo con segno', separate: 'Uscite e entrate separate' },
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
            'Formato numerico',
            ['it-IT', 'en-GB'] as const,
            mapping.numberLocale,
            { 'it-IT': 'Italiano · 1.234,56', 'en-GB': 'Inglese · 1,234.56' },
            (value) => changeMapping({ ...mapping, numberLocale: value }),
          )}
          {choices(
            'Formato della data di contabilizzazione',
            ['dd/MM/yyyy', 'yyyy-MM-dd', 'long-it'] as const,
            mapping.dateFormat,
            dateLabels,
            (value) => changeMapping({ ...mapping, dateFormat: value }),
          )}
          {choices(
            'Origine della valuta',
            ['fixed', 'column'] as const,
            mapping.columns.currency !== undefined ? 'column' : 'fixed',
            { fixed: 'Valuta fissa per il file', column: 'Una colonna della valuta' },
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
              <Text style={s.label}>Valuta fissa</Text>
              <TextInput
                accessibilityLabel="Valuta fissa del CSV"
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
              'Formato della data valuta',
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
              <Text style={s.body}>I valori sono esatti e distinguono maiuscole e minuscole.</Text>
              {statusRows.map((row, index) => (
                <View key={row.id} style={s.field}>
                  <Text style={s.label}>{statusLabels[row.status]} · valore nel file</Text>
                  <TextInput
                    accessibilityLabel={`Valore dello stato ${statusLabels[row.status]}, ${index + 1}`}
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
                    {button(`Associa stato ${statusLabels[status]}`, () => {
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
              Senza una colonna Stato, le righe sono trattate come contabilizzate.
            </Text>
          )}
          <Text style={s.label}>Nome delle associazioni per questo conto</Text>
          <TextInput
            accessibilityLabel="Nome delle associazioni CSV"
            editable={!busy}
            value={mappingName}
            onChangeText={(value) => {
              invalidate()
              setMappingName(value)
            }}
            placeholder="Per esempio: esportazione del mio conto"
            style={s.input}
          />
          <View style={s.row}>
            {button(
              selectedSaved ? 'Salva modifiche alle associazioni' : 'Salva associazioni CSV',
              () => {
                void save()
              },
              !mappingName.trim(),
            )}
            {button(
              'Mostra anteprima importazione',
              () => {
                void makePreview()
              },
              !selectedAccount || !csv.trim(),
            )}
          </View>
        </View>
      )}
      {errors.length > 0 && (
        <View style={s.card}>
          <Text accessibilityRole="header" style={s.subtitle}>
            Correggi il file o le associazioni
          </Text>
          <Text style={s.body}>Nessuna riga viene importata finché restano errori.</Text>
          {uniqueIssues(errors).map((issue) => (
            <Text key={issueKey(issue)} style={s.error}>
              {issueText(issue)}
            </Text>
          ))}
        </View>
      )}
      {preview && (
        <View style={s.card}>
          <Text accessibilityRole="header" style={s.subtitle}>
            3. Controlla l’anteprima
          </Text>
          <Text style={s.body}>
            Conto: {selectedAccount?.name ?? 'Non disponibile'} · {preview.value.rowCount} righe nel
            file, {preview.value.rows.length} righe valide. Non è stato importato nulla.
          </Text>
          {uniqueIssues(preview.value.warnings).map((issue) => (
            <Text key={issueKey(issue)} style={s.body}>
              {issueText(issue)}
            </Text>
          ))}
          {preview.value.rows.slice(0, visibleRows).map((row) => (
            <View key={row.rowNumber} style={s.previewRow}>
              <Text style={s.label}>
                Riga {row.rowNumber} · {row.record.bookedOn} · {rowAmount(row)}
              </Text>
              <Text style={s.body}>
                {row.record.description} · {statusLabels[row.record.status]}
              </Text>
              {row.provenance.valueOn && (
                <Text style={s.small}>
                  Data valuta: {row.provenance.valueOn} · originale: {row.provenance.rawValueOn}
                </Text>
              )}
              <Text style={s.small}>
                Identità:{' '}
                {row.provenance.identity === 'external'
                  ? 'identificatore della fonte'
                  : 'contenuto del file e posizione della ripetizione'}
              </Text>
            </View>
          ))}
          {visibleRows < preview.value.rows.length &&
            button('Mostra altre righe dell’anteprima', () =>
              setVisibleRows((value) => value + 20),
            )}
          {preview.value.duplicateCandidates.map((group) => (
            <View key={group.contentFingerprint} style={s.previewRow}>
              <Text style={s.label}>
                Righe uguali da controllare: {group.rowNumbers.join(', ')}
              </Text>
              <Text style={s.body}>
                Possono essere acquisti distinti. Rimarranno tutte presenti se le confermi.
              </Text>
              {preview.value.rows
                .filter((row) => group.rowNumbers.includes(row.rowNumber))
                .map((row) => (
                  <Text key={row.rowNumber} style={s.small}>
                    Riga {row.rowNumber}: {row.record.bookedOn} · {rowAmount(row)} ·{' '}
                    {row.record.description}
                  </Text>
                ))}
            </View>
          ))}
          {duplicateReview && (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Ho controllato le righe uguali e voglio mantenerle tutte"
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
                {acknowledged ? '✓ ' : ''}Ho controllato le righe uguali e voglio mantenerle tutte.
              </Text>
            </Pressable>
          )}
          {button(
            'Importa righe dell’anteprima',
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
