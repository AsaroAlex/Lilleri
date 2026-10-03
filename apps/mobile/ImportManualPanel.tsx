import {
  ApiError,
  createManualClient,
  type DemoOverview,
  type ManualAccountDto,
  type ManualBalanceEventDto,
  type ManualEntryDto,
  manualRequestId,
} from '@lilleri/api-client'
import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import { type CurrencyCode, parseDecimal } from '@lilleri/domain'
import { formatMoney, fromJson } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

type Request = <T>(path: string, init?: RequestInit) => Promise<T>
type CsvReport = {
  readonly inserted: number
  readonly updated: number
  readonly unchanged: number
  readonly rejected: number
  readonly importedAt: string
}
type Mode = 'entry' | 'account' | 'csv' | 'balance'
type ThemeColors = typeof colors.light | typeof colors.dark
export interface ImportManualPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly request: Request
  readonly importCsv: (accountId: string, csv: string) => Promise<CsvReport>
  readonly onChanged: () => Promise<void>
  readonly onError?: (cause: unknown) => boolean
}
const currencyAmount = (amountMinor: string, currency: CurrencyCode) =>
  formatMoney(fromJson({ amountMinor, currency }), { symbolPosition: 'before' })
const localDate = (timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value ?? '')
    .join('-')
}
function inputMinor(value: string, currency: CurrencyCode): string {
  const normalized = value.trim().replace(',', '.')
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized))
    throw new Error('Scrivi un importo senza separatori delle migliaia, per esempio 2,50.')
  try {
    return parseDecimal(normalized, currency).amountMinor.toString()
  } catch {
    throw new Error(
      'L’importo o la valuta non è valido. Le cifre decimali devono essere esatte per questa valuta.',
    )
  }
}
const modeLabels: Readonly<Record<Mode, string>> = {
  entry: 'Aggiungi movimento',
  account: 'Aggiungi conto',
  csv: 'Importa CSV',
  balance: 'Correggi il saldo',
}
const eventLabels: Readonly<Record<ManualBalanceEventDto['operation'], string>> = {
  opening: 'Saldo iniziale',
  entry: 'Inserimento a mano',
  import: 'Importazione CSV',
  adjustment: 'Correzione del saldo',
  reversal: 'Inserimento annullato',
}

/** Explicit local sources and file fallback; command IDs are preserved after an uncertain response. */
export function ImportManualPanel({
  overview,
  theme,
  request,
  importCsv,
  onChanged,
  onError,
}: ImportManualPanelProps) {
  const c = colors[theme],
    s = useMemo(() => styles(c), [c]),
    client = useMemo(() => createManualClient(request), [request])
  const [mode, setMode] = useState<Mode>('entry')
  const [accounts, setAccounts] = useState<readonly ManualAccountDto[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null)
  const [accountName, setAccountName] = useState('Contanti'),
    [accountKind, setAccountKind] = useState<ManualAccountDto['kind']>('cash')
  const [newCurrency, setNewCurrency] = useState('EUR'),
    [openingAmount, setOpeningAmount] = useState('0')
  const [openingOn, setOpeningOn] = useState(() => localDate(overview.profile.timezone))
  const [entryAmount, setEntryAmount] = useState(''),
    [entryDescription, setEntryDescription] = useState('')
  const [entryDate, setEntryDate] = useState(() => localDate(overview.profile.timezone)),
    [entryKind, setEntryKind] = useState<'expense' | 'income' | 'transfer'>('expense')
  const [transferReference, setTransferReference] = useState('')
  const [balanceAmount, setBalanceAmount] = useState(''),
    [balanceReason, setBalanceReason] = useState('')
  const [csv, setCsv] = useState(''),
    [csvAccountId, setCsvAccountId] = useState('')
  const [preview, setPreview] = useState<{
    csv: string
    report: Awaited<ReturnType<typeof client.previewCsv>>
  } | null>(null)
  const [lastEntry, setLastEntry] = useState<ManualEntryDto | null>(null)
  const [lastAdjustment, setLastAdjustment] = useState<{
    accountId: string
    revision: number
    beforeMinor: string
  } | null>(null)
  const [events, setEvents] = useState<readonly ManualBalanceEventDto[]>([])
  const pending = useRef<{ fingerprint: string; requestId: string } | null>(null)
  const mounted = useRef(true)
  const selected = accounts.find((account) => account.id === selectedId) ?? accounts[0]
  const selectedCsv =
    overview.accounts.find((account) => account.id === csvAccountId) ?? overview.accounts[0]
  const reload = useCallback(async () => {
    const current = await client.list()
    if (mounted.current) {
      setAccounts(current)
      setSelectedId((id) => (current.some((item) => item.id === id) ? id : (current[0]?.id ?? '')))
    }
  }, [client])
  useEffect(() => {
    mounted.current = true
    setLoading(true)
    reload()
      .catch((cause) => {
        if (mounted.current && !onError?.(cause))
          setError(
            cause instanceof Error
              ? cause.message
              : 'I conti locali non sono disponibili. Riprova.',
          )
      })
      .finally(() => {
        if (mounted.current) setLoading(false)
      })
    return () => {
      mounted.current = false
    }
  }, [reload, onError])
  useEffect(() => {
    if (mode !== 'balance' || !selected) {
      setEvents([])
      return
    }
    let active = true
    client
      .history(selected.id)
      .then((rows) => {
        if (active) setEvents(rows)
      })
      .catch((cause) => {
        if (active && !onError?.(cause))
          setError(cause instanceof Error ? cause.message : 'Lo storico non è disponibile.')
      })
    return () => {
      active = false
    }
  }, [client, mode, selected, onError])
  const commandId = (fingerprint: string) => {
    if (!pending.current || pending.current.fingerprint !== fingerprint)
      pending.current = { fingerprint, requestId: manualRequestId() }
    return pending.current.requestId
  }
  const run = async (action: () => Promise<void>, success: string | (() => string)) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    let saved = false
    try {
      await action()
      saved = true
      pending.current = null
      await reload()
      await onChanged()
      if (mounted.current) setNotice(typeof success === 'function' ? success() : success)
    } catch (cause) {
      if (!mounted.current || onError?.(cause)) return
      if (saved)
        setError(
          'La modifica è stata salvata, ma non riesco ad aggiornare i dati. Ricarica la pagina per vedere il saldo corrente.',
        )
      else if (cause instanceof ApiError && cause.code === 'manual_balance_changed') {
        try {
          await reload()
          await onChanged()
          setLastEntry(null)
          setLastAdjustment(null)
          setError(
            'Il saldo è cambiato. Ho aggiornato i dati: controllali prima di scegliere di nuovo.',
          )
        } catch (refreshError) {
          if (!onError?.(refreshError))
            setError(
              'Il saldo è cambiato e l’aggiornamento non è riuscito. Ricarica i dati prima di scegliere di nuovo.',
            )
        }
      } else
        setError(
          cause instanceof Error
            ? cause.message
            : 'Non sappiamo ancora se la modifica è stata salvata. Riprova con gli stessi dati per evitare un doppio inserimento.',
        )
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  const createAccount = () =>
    run(async () => {
      const currency = newCurrency.trim().toUpperCase() as CurrencyCode
      const body = {
        name: accountName.trim(),
        kind: accountKind,
        currency,
        openingBalanceMinor: inputMinor(openingAmount, currency),
        openingOn,
      }
      const result = await client.create({
        ...body,
        requestId: commandId(JSON.stringify({ operation: 'account', body })),
      })
      setSelectedId(result.id)
      setAccountName('')
      setMode('entry')
    }, 'Conto locale aggiunto. Il saldo iniziale non è una nuova entrata.')
  const addEntry = () =>
    run(
      async () => {
        if (!selected) throw new Error('Aggiungi prima un conto locale.')
        const parsed = BigInt(inputMinor(entryAmount, selected.currency))
        if (entryKind === 'income' && parsed < 0n)
          throw new Error('Per un’entrata scrivi un importo positivo, oppure scegli Spesa.')
        const amountMinor = (
          entryKind === 'expense'
            ? -(parsed < 0n ? -parsed : parsed)
            : entryKind === 'income'
              ? parsed < 0n
                ? -parsed
                : parsed
              : parsed
        ).toString()
        const body = {
          accountId: selected.id,
          currency: selected.currency,
          amountMinor,
          bookedOn: entryDate,
          kind: entryKind,
          description:
            entryDescription.trim() ||
            (entryKind === 'expense'
              ? 'Spesa in contanti'
              : entryKind === 'income'
                ? 'Entrata a mano'
                : 'Trasferimento a mano'),
          ...(transferReference.trim() ? { reference: transferReference.trim() } : {}),
        }
        const result = await client.enter({
          ...body,
          requestId: commandId(JSON.stringify({ operation: 'entry', body })),
        })
        setLastEntry(result)
        setLastAdjustment(null)
        setEntryAmount('')
        setEntryDescription('')
        setTransferReference('')
      },
      entryKind === 'transfer'
        ? 'Movimento aggiunto. Controlla e conferma il collegamento tra conti prima di escluderlo dai totali.'
        : 'Movimento aggiunto e saldo aggiornato.',
    )
  const adjust = () =>
    run(async () => {
      if (!selected) throw new Error('Scegli un conto locale.')
      const body = {
        revision: selected.revision,
        currency: selected.currency,
        balanceMinor: inputMinor(balanceAmount, selected.currency),
        reason: balanceReason.trim(),
      }
      const result = await client.adjust(selected.id, {
        ...body,
        requestId: commandId(JSON.stringify({ operation: 'adjust', accountId: selected.id, body })),
      })
      setLastAdjustment({
        accountId: selected.id,
        revision: result.revision,
        beforeMinor: result.beforeMinor,
      })
      setLastEntry(null)
      setBalanceAmount('')
      setBalanceReason('')
    }, 'Saldo corretto. La differenza è nello storico e non conta come entrata o spesa.')
  const reverseEntry = () =>
    run(async () => {
      if (!lastEntry) throw new Error('Non c’è un inserimento da annullare.')
      const body = {
        revision: lastEntry.transactionRevision,
        accountRevision: lastEntry.accountRevision,
        reason: 'Annullamento dell’ultimo inserimento',
      }
      await client.reverse(lastEntry.transactionId, {
        ...body,
        requestId: commandId(
          JSON.stringify({ operation: 'reverse', id: lastEntry.transactionId, body }),
        ),
      })
      setLastEntry(null)
    }, 'Inserimento annullato. Il saldo e i totali sono stati aggiornati; lo storico è conservato.')
  const undoAdjustment = () =>
    run(async () => {
      if (!selected || !lastAdjustment) throw new Error('Non c’è una correzione da annullare.')
      const body = {
        revision: selected.revision,
        currency: selected.currency,
        balanceMinor: lastAdjustment.beforeMinor,
        reason: 'Annullamento della correzione precedente',
      }
      await client.adjust(selected.id, {
        ...body,
        requestId: commandId(JSON.stringify({ operation: 'undo-adjust', id: selected.id, body })),
      })
      setLastAdjustment(null)
    }, 'Correzione annullata con un nuovo evento nello storico.')
  const validateCsv = async () => {
    if (busy || !selectedCsv) return
    setBusy(true)
    setError(null)
    setNotice(null)
    setPreview(null)
    try {
      const report = await client.previewCsv(selectedCsv.id, csv)
      setPreview({ csv, report })
    } catch (cause) {
      if (!onError?.(cause))
        setError(cause instanceof Error ? cause.message : 'Il CSV non è valido.')
    } finally {
      setBusy(false)
    }
  }
  const applyCsv = () => {
    let completed = 'Importazione completata.'
    return run(
      async () => {
        if (!preview || preview.csv !== csv || preview.report.accountId !== selectedCsv?.id)
          throw new Error('Controlla una nuova anteprima prima di importare.')
        const report = await importCsv(preview.report.accountId, preview.csv)
        setCsv('')
        setPreview(null)
        setLastEntry(null)
        setLastAdjustment(null)
        completed = `${report.inserted} nuovi movimenti, ${report.unchanged} già presenti. Nessuna riga è stata modificata.`
      },
      () => completed,
    )
  }
  const button = (label: string, onPress: () => void, disabled = false, quiet = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        quiet && s.quiet,
        pressed && { opacity: 0.8 },
        (disabled || busy) && { opacity: 0.5 },
      ]}
    >
      <Text style={[s.buttonText, quiet && { color: c.primary }]}>{label}</Text>
    </Pressable>
  )
  const field = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder = '',
    multiline = false,
  ) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        editable={!busy}
        multiline={multiline}
        autoCapitalize="none"
        style={[s.input, multiline && s.textarea]}
      />
    </View>
  )
  return (
    <View style={s.root}>
      <Text accessibilityRole="header" aria-level={2} style={s.heading}>
        Conti manuali e importazione
      </Text>
      <Text style={s.body}>
        Tieni traccia di contanti, carte e conti non collegati. Crea un conto, aggiungi un movimento
        o importa un CSV. Ogni importo resta nella valuta del conto.
      </Text>
      <View style={s.row}>
        {(Object.keys(modeLabels) as Mode[]).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === key, disabled: busy }}
            disabled={busy}
            onPress={() => {
              setMode(key)
              setError(null)
              setNotice(null)
            }}
            style={[
              s.mode,
              mode === key && { backgroundColor: c.primarySoft, borderColor: c.primary },
            ]}
          >
            <Text style={s.modeText}>{modeLabels[key]}</Text>
          </Pressable>
        ))}
      </View>
      {loading && (
        <ActivityIndicator color={c.primary} accessibilityLabel="Caricamento conti locali" />
      )}
      {busy && <ActivityIndicator color={c.primary} accessibilityLabel="Salvataggio in corso" />}
      {error && (
        <Text accessibilityRole="alert" style={[s.feedback, { color: c.danger }]}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={[s.feedback, { color: c.success }]}>
          {notice}
        </Text>
      )}
      {mode === 'account' ? (
        <View style={s.card}>
          <Text style={s.title}>Da quale saldo inizi?</Text>
          <Text style={s.body}>
            Il saldo iniziale è quello all’inizio della data scelta. Inserimenti e CSV da quella
            data lo aggiorneranno. Questo conto resta non collegato a una banca.
          </Text>
          {field('Nome del conto', accountName, setAccountName, 'Contanti')}
          <View style={s.row}>
            {(['cash', 'current', 'card', 'savings'] as const).map((kind) => (
              <Pressable
                key={kind}
                accessibilityRole="radio"
                accessibilityState={{ checked: accountKind === kind, disabled: busy }}
                disabled={busy}
                onPress={() => setAccountKind(kind)}
                style={[
                  s.choice,
                  accountKind === kind && {
                    borderColor: c.primary,
                    backgroundColor: c.primarySoft,
                  },
                ]}
              >
                <Text style={s.body}>
                  {
                    {
                      cash: 'Contanti',
                      current: 'Portafoglio o altro',
                      card: 'Carta manuale',
                      savings: 'Risparmio',
                    }[kind]
                  }
                </Text>
              </Pressable>
            ))}
          </View>
          {field('Valuta ISO del conto', newCurrency, setNewCurrency, 'EUR')}
          {field('Saldo iniziale', openingAmount, setOpeningAmount, '0,00')}
          {field('Data del saldo iniziale', openingOn, setOpeningOn, 'YYYY-MM-DD')}
          {button(
            'Crea conto locale',
            () => {
              void createAccount()
            },
            loading,
          )}
        </View>
      ) : mode === 'csv' ? (
        <View style={s.card}>
          <Text style={s.title}>Importa movimenti da un CSV</Text>
          <Text style={s.body}>
            Fino a 1.000 righe e 256 KiB. È supportato questo formato CSV, con virgole tra le
            colonne, importi con punto decimale e date YYYY-MM-DD. Mantieni lo stesso id quando
            ripeti un’importazione. Gli abbinamenti con altre fonti vanno controllati.
          </Text>
          <Text selectable style={s.sample}>
            id,date,amount,currency,description,merchant,reference{'\n'}
            caffe-1,2026-10-03,-2.50,EUR,Caffe,Bar,
          </Text>
          <Text style={s.label}>Conto di destinazione</Text>
          <View style={s.row}>
            {overview.accounts.map((account) => (
              <Pressable
                key={account.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedCsv?.id === account.id, disabled: busy }}
                disabled={busy}
                onPress={() => {
                  setCsvAccountId(account.id)
                  setPreview(null)
                }}
                style={[
                  s.choice,
                  selectedCsv?.id === account.id && {
                    borderColor: c.primary,
                    backgroundColor: c.primarySoft,
                  },
                ]}
              >
                <Text style={s.body}>
                  {account.name} · {account.balance.currency}
                </Text>
              </Pressable>
            ))}
          </View>
          {!selectedCsv && <Text style={s.body}>Aggiungi un conto locale per iniziare.</Text>}
          {field(
            'Contenuto del CSV',
            csv,
            (value) => {
              setCsv(value)
              setPreview(null)
            },
            'Incolla intestazione e righe',
            true,
          )}
          {button(
            'Controlla anteprima CSV',
            () => {
              void validateCsv()
            },
            !selectedCsv || !csv.trim() || loading,
          )}
          {preview && (
            <View style={s.preview}>
              <Text style={s.title}>{preview.report.rowCount} righe valide</Text>
              <Text style={s.body}>
                {preview.report.newRows} nuove · {preview.report.unchangedRows} già presenti.
                Variazione dei nuovi movimenti:{' '}
                {currencyAmount(preview.report.newAmountTotalMinor, preview.report.currency)}.
              </Text>
              <Text style={s.body}>
                {preview.report.manualBalanceWillChange
                  ? 'Il saldo del conto locale verrà aggiornato con le sole righe nuove.'
                  : 'Il saldo della fonte resta quello dichiarato dalla fonte; il CSV aggiunge solo i movimenti.'}
              </Text>
              {button('Importa righe controllate', () => {
                void applyCsv()
              })}
            </View>
          )}
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.label}>Conto locale</Text>
          <View style={s.row}>
            {accounts.map((account) => (
              <Pressable
                key={account.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected?.id === account.id, disabled: busy }}
                disabled={busy}
                onPress={() => {
                  setSelectedId(account.id)
                  setLastEntry(null)
                  setLastAdjustment(null)
                }}
                style={[
                  s.choice,
                  selected?.id === account.id && {
                    borderColor: c.primary,
                    backgroundColor: c.primarySoft,
                  },
                ]}
              >
                <Text style={s.body}>
                  {account.name} · {currencyAmount(account.balanceMinor, account.currency)}
                </Text>
              </Pressable>
            ))}
          </View>
          {!selected ? (
            <View style={s.field}>
              <Text style={s.body}>
                Non hai ancora conti locali. Parti dal saldo dei tuoi contanti o di un portafoglio.
              </Text>
              {button('Aggiungi il primo conto', () => setMode('account'), loading)}
            </View>
          ) : mode === 'entry' ? (
            <>
              <Text style={s.title}>{selected.name} · non collegato</Text>
              <View style={s.row}>
                {(['expense', 'income', 'transfer'] as const).map((kind) => (
                  <Pressable
                    key={kind}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: entryKind === kind, disabled: busy }}
                    disabled={busy}
                    onPress={() => setEntryKind(kind)}
                    style={[
                      s.choice,
                      entryKind === kind && {
                        borderColor: c.primary,
                        backgroundColor: c.primarySoft,
                      },
                    ]}
                  >
                    <Text style={s.body}>
                      {{ expense: 'Spesa', income: 'Entrata', transfer: 'Trasferimento' }[kind]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {field(`Importo in ${selected.currency}`, entryAmount, setEntryAmount, '2,50')}
              {field(
                'Descrizione facoltativa',
                entryDescription,
                setEntryDescription,
                'Spesa in contanti',
              )}
              {field('Data del movimento', entryDate, setEntryDate, 'YYYY-MM-DD')}
              {entryKind === 'transfer' && (
                <>
                  <Text style={s.body}>
                    Per un trasferimento in entrata usa un importo positivo; in uscita usa un
                    importo negativo. Per contanti prelevati da un tuo conto, aggiungi qui il lato
                    in entrata. Poi controlla il collegamento in Da controllare: richiede una
                    conferma.
                  </Text>
                  {field(
                    'Riferimento del trasferimento facoltativo',
                    transferReference,
                    setTransferReference,
                  )}
                </>
              )}
              {button(
                'Salva movimento',
                () => {
                  void addEntry()
                },
                !entryAmount.trim(),
              )}
              {lastEntry &&
                button(
                  'Annulla ultimo inserimento',
                  () => {
                    void reverseEntry()
                  },
                  selected.id !== lastEntry.accountId ||
                    selected.revision !== lastEntry.accountRevision,
                  true,
                )}
            </>
          ) : (
            <>
              <Text style={s.title}>
                Saldo corrente: {currencyAmount(selected.balanceMinor, selected.currency)}
              </Text>
              <Text style={s.body}>
                Scrivi il saldo che hai verificato e il motivo. La differenza diventa un evento
                nello storico e non una spesa o un’entrata.
              </Text>
              {field(
                `Saldo corretto in ${selected.currency}`,
                balanceAmount,
                setBalanceAmount,
                '0,00',
              )}
              {field(
                'Motivo della correzione',
                balanceReason,
                setBalanceReason,
                'Contanti contati a mano',
              )}
              {button(
                'Conferma saldo corretto',
                () => {
                  void adjust()
                },
                !balanceAmount.trim() || !balanceReason.trim(),
              )}
              {lastAdjustment &&
                button(
                  'Annulla ultima correzione',
                  () => {
                    void undoAdjustment()
                  },
                  lastAdjustment.accountId !== selected.id ||
                    lastAdjustment.revision !== selected.revision,
                  true,
                )}
              <Text style={s.title}>Storico del saldo</Text>
              {[...events]
                .reverse()
                .slice(0, 10)
                .map((event) => (
                  <View key={event.id} style={s.event}>
                    <Text style={s.label}>
                      {eventLabels[event.operation]} · {event.createdAt.slice(0, 10)}
                    </Text>
                    <Text style={s.body}>{event.reason}</Text>
                    <Text style={s.body}>
                      {currencyAmount(event.beforeMinor, selected.currency)} →{' '}
                      {currencyAmount(event.afterMinor, selected.currency)}
                    </Text>
                  </View>
                ))}
            </>
          )}
        </View>
      )}
    </View>
  )
}
function styles(c: ThemeColors) {
  return StyleSheet.create({
    root: { gap: tokens.spacing.md },
    heading: {
      fontFamily: 'GeistSemibold',
      fontSize: tokens.typography.scale.h2.size,
      lineHeight: tokens.typography.scale.h2.lineHeight,
      color: c.textPrimary,
    },
    title: {
      fontFamily: 'GeistSemibold',
      fontSize: tokens.typography.scale.title.size,
      lineHeight: tokens.typography.scale.title.lineHeight,
      color: c.textPrimary,
    },
    body: {
      fontFamily: 'Geist',
      fontSize: 16,
      lineHeight: 24,
      color: c.textSecondary,
      flexShrink: 1,
    },
    label: { fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 20, color: c.textPrimary },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.lg,
      padding: 16,
      gap: 16,
    },
    field: { gap: 8 },
    input: {
      fontFamily: 'Geist',
      fontSize: 16,
      lineHeight: 24,
      color: c.textPrimary,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.sm,
      minHeight: 48,
      padding: 12,
    },
    textarea: { minHeight: 176, textAlignVertical: 'top' },
    button: {
      backgroundColor: c.primary,
      borderRadius: tokens.radius.md,
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    buttonText: {
      fontFamily: 'GeistMedium',
      fontSize: 14,
      lineHeight: 20,
      color: c.onPrimary,
      textAlign: 'center',
    },
    quiet: { backgroundColor: 'transparent', borderColor: c.primary, borderWidth: 1 },
    mode: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
      justifyContent: 'center',
    },
    modeText: { fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 20, color: c.textPrimary },
    choice: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.sm,
      padding: 12,
      justifyContent: 'center',
      maxWidth: '100%',
    },
    sample: {
      fontFamily: 'Geist',
      fontSize: 12,
      lineHeight: 18,
      color: c.textPrimary,
      backgroundColor: c.surfaceElevated,
      padding: 12,
      borderRadius: tokens.radius.sm,
    },
    preview: {
      gap: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: tokens.radius.md,
    },
    feedback: {
      fontFamily: 'GeistMedium',
      fontSize: 14,
      lineHeight: 20,
      padding: 12,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    event: { gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderColor: c.border },
  })
}
