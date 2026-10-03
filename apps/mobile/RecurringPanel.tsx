import { ApiError, type DemoOverview, type MoneyDto } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { fromJson } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useI18n } from './src/i18n/context'

type Request = <T>(path: string, init?: RequestInit) => Promise<T>
type Kind = 'subscription' | 'recurring_bill' | 'salary' | 'recurring_transfer' | 'installment'
type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual'
  | 'irregular'
interface Item {
  id: string
  revision: number
  canUndo: boolean
  kind: Kind
  frequency: Frequency
  status: 'observed' | 'confirmed' | 'not_recurring'
  nextOn: string | null
  expectedAmount: MoneyDto
  variability: 'fixed' | 'variable'
  transactionIds: string[]
  firstOn: string
  latestOn: string
  remainingInstallments: number | null
  noticePeriod: string | null
  cancellationInstructions: string | null
  statistics: {
    observedCount: number
    amountOutsideBand: boolean
    minimumAmount: MoneyDto
    maximumAmount: MoneyDto
  }
  forecast: {
    status: 'estimated' | 'unknown' | 'work_limit'
    occurrences: { on: string; amount: MoneyDto }[]
  }
}
interface Response {
  items: Item[]
  calculatedOn: string
  horizonOn: string
  policyVersion: string
  alertsAvailable: false
}
export interface RecurringPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly request: Request
  readonly resetKey: string | number
  readonly disabled?: boolean
  readonly onError?: (cause: unknown) => boolean
  readonly onChanged?: () => void | Promise<void>
  readonly onOpenTransaction?: (id: string) => void
}
const kinds: Readonly<Record<Kind, readonly [string, string]>> = {
  subscription: ['Abbonamento', 'Subscription'],
  recurring_bill: ['Spesa periodica', 'Recurring bill'],
  salary: ['Stipendio o pensione', 'Salary or pension'],
  recurring_transfer: ['Piano di risparmio', 'Savings plan'],
  installment: ['Rata con durata definita', 'Fixed-term installment'],
}
const frequencies: Readonly<Record<Frequency, readonly [string, string]>> = {
  weekly: ['Settimanale', 'Weekly'],
  biweekly: ['Ogni due settimane', 'Every two weeks'],
  monthly: ['Mensile', 'Monthly'],
  bimonthly: ['Ogni due mesi', 'Every two months'],
  quarterly: ['Trimestrale', 'Quarterly'],
  semiannual: ['Semestrale', 'Semiannual'],
  annual: ['Annuale', 'Annual'],
  irregular: ['Irregolare', 'Irregular'],
}

/** Profile epochs and captured ledger snapshots fence every async response and mutation. */
export function RecurringPanel({
  overview,
  theme,
  request,
  resetKey,
  disabled = false,
  onError,
  onChanged,
  onOpenTransaction,
}: RecurringPanelProps) {
  const i18n = useI18n(),
    english = i18n.locale === 'en-GB',
    label = (it: string, en: string) => (english ? en : it)
  const c = colors[theme],
    s = useMemo(() => styles(c), [c]),
    scope = `${overview.profile.id}:${resetKey}`
  const epoch = useRef({ scope, value: 0 })
  if (epoch.current.scope !== scope) epoch.current = { scope, value: epoch.current.value + 1 }
  const mounted = useRef(true),
    ticket = useRef(0),
    current = useRef(overview)
  current.current = overview
  const [response, setResponse] = useState<{
    scope: string
    overview: DemoOverview
    data: Response
  } | null>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null)
  const [kind, setKind] = useState<Kind>('recurring_bill'),
    [frequency, setFrequency] = useState<Frequency>('monthly')
  const [count, setCount] = useState(''),
    [index, setIndex] = useState(''),
    [marking, setMarking] = useState(false),
    [transactionId, setTransactionId] = useState<string | null>(null)
  const live = response?.scope === scope && response.overview === overview ? response.data : null
  const available = live && !busy && !disabled
  const callbacks = useRef({ onError, i18n, english })
  callbacks.current = { onError, i18n, english }
  const message = useCallback((cause: unknown) => {
    const active = callbacks.current
    if (active.onError?.(cause)) return
    setError(
      cause instanceof ApiError && cause.status === 409
        ? active.english
          ? 'The recurring item changed. Refresh and choose the correction again.'
          : 'La ricorrenza è cambiata. Aggiorna e scegli di nuovo la correzione.'
        : active.i18n.problemMessage(cause),
    )
  }, [])
  const load = useCallback(async () => {
    const captured = epoch.current.value,
      snapshot = overview,
      mine = ++ticket.current
    setBusy(true)
    setError(null)
    try {
      const data = await request<Response>('/v1/recurring')
      if (
        mounted.current &&
        epoch.current.value === captured &&
        mine === ticket.current &&
        current.current === snapshot
      )
        setResponse({ scope, overview: snapshot, data })
    } catch (cause) {
      if (
        mounted.current &&
        epoch.current.value === captured &&
        mine === ticket.current &&
        current.current === snapshot
      )
        message(cause)
    } finally {
      if (mounted.current && epoch.current.value === captured && mine === ticket.current)
        setBusy(false)
    }
  }, [overview, request, scope, message])
  useEffect(() => {
    mounted.current = true
    setEditing(null)
    setMarking(false)
    setTransactionId(null)
    setResponse(null)
    void load()
    return () => {
      mounted.current = false
      ticket.current++
    }
  }, [load])
  function edit(item: Item) {
    if (!available) return
    setEditing(item.id)
    setMarking(false)
    setKind(item.kind)
    setFrequency(item.frequency)
    setCount('')
    setIndex('')
    setError(null)
  }
  async function write(path: string, body: Record<string, unknown>, method = 'PATCH') {
    if (!available) return
    const captured = epoch.current.value,
      snapshot = overview,
      mine = ++ticket.current
    setBusy(true)
    setError(null)
    try {
      await request(path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (
        !mounted.current ||
        epoch.current.value !== captured ||
        mine !== ticket.current ||
        current.current !== snapshot
      )
        return
      setEditing(null)
      setMarking(false)
      setTransactionId(null)
      const data = await request<Response>('/v1/recurring')
      if (
        !mounted.current ||
        epoch.current.value !== captured ||
        mine !== ticket.current ||
        current.current !== snapshot
      )
        return
      setResponse({ scope, overview: snapshot, data })
      await onChanged?.()
    } catch (cause) {
      if (
        mounted.current &&
        epoch.current.value === captured &&
        mine === ticket.current &&
        current.current === snapshot
      )
        message(cause)
    } finally {
      if (mounted.current && epoch.current.value === captured && mine === ticket.current)
        setBusy(false)
    }
  }
  function save(item: Item | null) {
    const extra: Record<string, unknown> = { kind, frequency }
    if (kind === 'installment') {
      if (
        !/^[1-9]\d{0,3}$/.test(count) ||
        !/^[1-9]\d{0,3}$/.test(index) ||
        Number(index) > Number(count)
      ) {
        setError(
          label(
            'Indica il numero totale di rate e il numero dell’ultima rata osservata.',
            'Enter the total number of installments and the number of the latest observed installment.',
          ),
        )
        return
      }
      extra.installmentCount = Number(count)
      extra.installmentIndex = Number(index)
    }
    if (item)
      void write(`/v1/recurring/${encodeURIComponent(item.id)}`, {
        revision: item.revision,
        status: 'confirmed',
        ...extra,
      })
    else if (transactionId)
      void write(
        `/v1/transactions/${encodeURIComponent(transactionId)}/recurring`,
        { revision: 1, status: 'confirmed', ...extra },
        'POST',
      )
  }
  const editor = (item: Item | null) => (
    <View style={s.editor}>
      <Text style={s.label}>{label('Tipo dichiarato', 'Declared type')}</Text>
      <View style={s.wrap}>
        {(Object.keys(kinds) as Kind[]).map((value) => (
          <Pressable
            key={value}
            style={[s.button, kind === value && s.selected]}
            accessibilityRole="radio"
            accessibilityState={{ checked: kind === value, disabled: !available }}
            aria-checked={kind === value}
            disabled={!available}
            onPress={() => setKind(value)}
          >
            <Text style={s.text}>{kinds[value][english ? 1 : 0]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.label}>{label('Periodo', 'Period')}</Text>
      <View style={s.wrap}>
        {(Object.keys(frequencies) as Frequency[]).map((value) => (
          <Pressable
            key={value}
            style={[s.button, frequency === value && s.selected]}
            accessibilityRole="radio"
            accessibilityState={{ checked: frequency === value, disabled: !available }}
            aria-checked={frequency === value}
            disabled={!available}
            onPress={() => setFrequency(value)}
          >
            <Text style={s.text}>{frequencies[value][english ? 1 : 0]}</Text>
          </Pressable>
        ))}
      </View>
      {kind === 'installment' && (
        <>
          <Text style={s.label}>
            {label(
              'Totale rate / ultima rata osservata',
              'Total installments / latest observed installment',
            )}
          </Text>
          <TextInput
            accessibilityLabel={label('Numero totale di rate', 'Total installments')}
            style={s.input}
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            editable={Boolean(available)}
          />
          <TextInput
            accessibilityLabel={label(
              'Numero dell’ultima rata osservata',
              'Latest observed installment number',
            )}
            style={s.input}
            value={index}
            onChangeText={setIndex}
            keyboardType="number-pad"
            editable={Boolean(available)}
          />
        </>
      )}
      <Pressable
        style={s.button}
        accessibilityRole="button"
        disabled={!available || (!item && !transactionId)}
        onPress={() => save(item)}
      >
        <Text style={s.text}>
          {label('Salva correzione esplicita', 'Save explicit correction')}
        </Text>
      </Pressable>
    </View>
  )
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.title}>
        {label('Ricorrenze osservate', 'Observed recurring payments')}
      </Text>
      <Text style={s.note}>
        {label(
          'Date e importi sono stime dai dati disponibili. Le correzioni non confermano un contratto; nessun avviso viene inviato.',
          'Dates and amounts are estimates from available data. Corrections do not confirm a contract; no alerts are sent.',
        )}
      </Text>
      {live && (
        <Text style={s.note}>
          {label('Orizzonte:', 'Horizon:')} {i18n.calendarDate(live.calculatedOn)} —{' '}
          {i18n.calendarDate(live.horizonOn)}
        </Text>
      )}
      <Pressable
        style={s.button}
        accessibilityRole="button"
        disabled={busy || disabled}
        onPress={() => void load()}
      >
        <Text style={s.text}>{label('Aggiorna ricorrenze', 'Refresh recurring items')}</Text>
      </Pressable>
      {busy && (
        <ActivityIndicator
          accessibilityLabel={label('Aggiornamento ricorrenze', 'Updating recurring items')}
        />
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {live?.items.length === 0 && (
        <Text style={s.note}>
          {label(
            'Nessuna sequenza abbastanza chiara nei dati visibili. Puoi dichiarare esplicitamente un movimento ricorrente.',
            'No sufficiently clear sequence in the visible data. You can explicitly mark a recurring transaction.',
          )}
        </Text>
      )}
      {live?.items.map((item) => (
        <View key={item.id} style={s.card}>
          <Text style={s.label}>
            {kinds[item.kind][english ? 1 : 0]} · {frequencies[item.frequency][english ? 1 : 0]}
          </Text>
          <Text style={s.text}>
            {i18n.money(fromJson(item.expectedAmount))} ·{' '}
            {item.status === 'not_recurring'
              ? label('Esclusa da te', 'Excluded by you')
              : item.status === 'confirmed'
                ? label('Correzione esplicita', 'Explicit correction')
                : label('Sequenza osservata', 'Observed pattern')}
          </Text>
          <Text style={s.note}>
            {label('Prossima data stimata:', 'Next estimated date:')}{' '}
            {item.nextOn ? i18n.calendarDate(item.nextOn) : label('Non disponibile', 'Unavailable')}
          </Text>
          <Text style={s.note}>
            {item.statistics.observedCount} {label('movimenti osservati', 'observed transactions')}{' '}
            · {i18n.calendarDate(item.firstOn)} — {i18n.calendarDate(item.latestOn)}
          </Text>
          {item.statistics.amountOutsideBand && (
            <Text style={s.note}>
              {label(
                'L’ultimo importo supera la fascia osservata: controlla i movimenti.',
                'The latest amount is outside the observed band: review the transactions.',
              )}
            </Text>
          )}
          {item.remainingInstallments !== null && (
            <Text style={s.note}>
              {label('Rate residue dichiarate:', 'Declared remaining installments:')}{' '}
              {item.remainingInstallments}
            </Text>
          )}
          {item.noticePeriod && (
            <Text style={s.note}>
              {label('Preavviso fornito:', 'Supplied notice period:')} {item.noticePeriod}
            </Text>
          )}
          {item.cancellationInstructions && (
            <Text style={s.note}>{item.cancellationInstructions}</Text>
          )}
          {item.forecast.status !== 'estimated' && (
            <Text style={s.note}>
              {label('Le scadenze future richiedono verifica.', 'Future dates require review.')}
            </Text>
          )}
          {item.forecast.occurrences.map((occurrence) => (
            <Text key={occurrence.on} style={s.note}>
              {i18n.calendarDate(occurrence.on)} · {i18n.money(fromJson(occurrence.amount))}{' '}
              {label('(stima)', '(estimate)')}
            </Text>
          ))}
          <View style={s.wrap}>
            <Pressable
              style={s.button}
              accessibilityRole="button"
              disabled={!available}
              onPress={() => edit(item)}
            >
              <Text style={s.text}>
                {label('Correggi periodo o tipo', 'Correct period or type')}
              </Text>
            </Pressable>
            <Pressable
              style={s.button}
              accessibilityRole="button"
              disabled={!available}
              onPress={() =>
                void write(`/v1/recurring/${encodeURIComponent(item.id)}`, {
                  revision: item.revision,
                  status: item.status === 'not_recurring' ? 'observed' : 'not_recurring',
                })
              }
            >
              <Text style={s.text}>
                {item.status === 'not_recurring'
                  ? label('Ripristina osservazione', 'Restore observation')
                  : label('Non è ricorrente', 'Not recurring')}
              </Text>
            </Pressable>
            {item.canUndo && (
              <Pressable
                style={s.button}
                accessibilityRole="button"
                disabled={!available}
                onPress={() =>
                  void write(
                    `/v1/recurring/${encodeURIComponent(item.id)}/undo`,
                    { revision: item.revision },
                    'POST',
                  )
                }
              >
                <Text style={s.text}>
                  {label('Annulla ultima correzione', 'Undo latest correction')}
                </Text>
              </Pressable>
            )}
          </View>
          {editing === item.id && editor(item)}
          {onOpenTransaction && (
            <View style={s.wrap}>
              {item.transactionIds.map((id) => (
                <Pressable
                  key={id}
                  style={s.button}
                  accessibilityRole="button"
                  disabled={busy || disabled}
                  onPress={() => onOpenTransaction(id)}
                >
                  <Text style={s.text}>
                    {label('Apri movimento', 'Open transaction')}{' '}
                    {overview.transactions.find((row) => row.id === id)?.bookedOn
                      ? i18n.calendarDate(
                          overview.transactions.find((row) => row.id === id)?.bookedOn,
                        )
                      : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ))}
      <Pressable
        style={s.button}
        accessibilityRole="button"
        disabled={!available}
        onPress={() => {
          setMarking(!marking)
          setEditing(null)
          setTransactionId(null)
          setKind('recurring_bill')
          setFrequency('monthly')
          setCount('')
          setIndex('')
        }}
      >
        <Text style={s.text}>
          {label('Dichiara un movimento ricorrente', 'Mark a recurring transaction')}
        </Text>
      </Pressable>
      {marking && (
        <View style={s.editor}>
          <Text style={s.note}>
            {label(
              'Scegli un movimento contabilizzato. Per un trasferimento, il tipo Piano di risparmio è una tua dichiarazione esplicita.',
              'Choose a booked transaction. For a transfer, Savings plan is your explicit declaration.',
            )}
          </Text>
          {overview.transactions
            .filter(
              (row) =>
                row.status === 'booked' &&
                row.bookedOn &&
                ['expense', 'income', 'transfer'].includes(row.kind),
            )
            .map((row) => (
              <Pressable
                key={row.id}
                style={[s.button, row.id === transactionId && s.selected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: row.id === transactionId, disabled: !available }}
                aria-checked={row.id === transactionId}
                disabled={!available}
                onPress={() => setTransactionId(row.id)}
              >
                <Text style={s.text}>
                  {i18n.calendarDate(row.bookedOn)} · {row.merchantName ?? row.description} ·{' '}
                  {i18n.money(fromJson(row.amount))}
                </Text>
              </Pressable>
            ))}
          {editor(null)}
        </View>
      )}
    </View>
  )
}
function styles(c: (typeof colors)[BrandTheme]) {
  return StyleSheet.create({
    panel: { gap: 12, padding: 16, backgroundColor: c.surface, borderRadius: 16 },
    title: { fontSize: 20, fontWeight: '700', color: c.textPrimary },
    text: { color: c.textPrimary, fontSize: 15 },
    label: { color: c.textPrimary, fontWeight: '700', fontSize: 15 },
    note: { color: c.textSecondary, fontSize: 14, lineHeight: 21 },
    error: { color: c.danger, fontSize: 14 },
    card: { gap: 10, padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12 },
    editor: { gap: 10, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 12 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    button: {
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      justifyContent: 'center',
    },
    selected: { borderWidth: 2, borderColor: c.accent },
    input: {
      minHeight: 48,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      color: c.textPrimary,
    },
  })
}
