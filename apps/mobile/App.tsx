import {
  createApiClient,
  type DemoOverview,
  type MoneyDto,
  type TransactionDto,
} from '@lilleri/api-client'
import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import { CATEGORIES, type CategoryId } from '@lilleri/domain'
import { formatMoney, formatMoneyAccessibleIt, fromJson } from '@lilleri/money'
import { useFonts } from 'expo-font'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } }
const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3001')
const tabs = ['Home', 'Movimenti', 'Da controllare', 'Ricorrenti', 'Privacy'] as const
type Tab = (typeof tabs)[number]
type ThemeColors = typeof colors.light | typeof colors.dark
type Scope = 'once' | 'merchant'
const date = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(value.includes('T') ? value : `${value}T00:00:00Z`))
    : 'Data non disponibile'
const formatInstant = (value: string | null | undefined, timezone: string) =>
  value
    ? new Intl.DateTimeFormat('it-IT', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
        timeZoneName: 'short',
      }).format(new Date(value))
    : 'Non ancora aggiornato'
const name = (transaction: TransactionDto) =>
  transaction.merchantName?.trim() ||
  transaction.description.trim() ||
  'Descrizione non disponibile'

const evidenceLabels: Readonly<Record<string, string>> = {
  'sticky-user-correction': 'Hai corretto la categoria di questo movimento.',
  'no-deterministic-match': 'Gli indizi disponibili non bastano per scegliere una categoria.',
  'same-account': 'I movimenti riguardano lo stesso conto.',
  'provider-related-transaction': 'La fonte collega esplicitamente i due movimenti.',
  'unique-provider-reference': 'I due movimenti condividono un riferimento univoco della fonte.',
  'same-amount': 'Gli importi coincidono.',
  'changed-amount': 'L’importo è cambiato tra la prenotazione e la contabilizzazione.',
  'different-sources': 'I movimenti provengono da fonti diverse.',
  'same-account-merchant-date-amount': 'Conto, esercente, data e importo coincidono.',
  'relationship-unproven': 'Il collegamento tra i movimenti non è ancora dimostrato.',
  'owned-accounts': 'Entrambi i conti sono inclusi nel profilo dimostrativo.',
  'opposite-exact-amount': 'Gli importi hanno lo stesso valore con segni opposti.',
  'provider-account-relationship': 'La fonte collega esplicitamente i due conti.',
  'account-relationship-unproven': 'Il collegamento tra i conti non è ancora dimostrato.',
  'reference-unproven': 'Manca un riferimento univoco condiviso.',
  'same-account-currency': 'Conto e valuta coincidono.',
  'cumulative-refund-bound':
    'L’importo complessivo dei rimborsi è stato confrontato con l’acquisto.',
  'competing-candidates': 'Ci sono più collegamenti possibili per uno stesso movimento.',
  'original-not-counted': 'Il movimento originale è escluso dai totali.',
  'three-observed-monthly-payments': 'Tre movimenti osservati a distanza di circa un mese.',
  'not-a-confirmed-contract': 'La ricorrenza non conferma un contratto o un addebito futuro.',
  'provider-kind:income': 'La fonte indica un’entrata.',
  'provider-kind:expense': 'La fonte indica una spesa.',
  'provider-kind:transfer': 'La fonte indica un trasferimento.',
  'provider-kind:card_settlement': 'La fonte indica un addebito carta.',
  'provider-kind:cash_withdrawal': 'La fonte indica un prelievo di contante.',
  'provider-kind:refund': 'La fonte indica un rimborso.',
}

function humanEvidence(value: string, explanation: string, merchant?: string): string {
  if (evidenceLabels[value]) return evidenceLabels[value]
  if (value.startsWith('rule:')) return 'La categoria segue una tua regola per questo esercente.'
  if (value.startsWith('merchant:')) return 'Hai scelto la categoria per questo esercente.'
  if (value.startsWith('dictionary:')) {
    return merchant && merchant !== 'Descrizione non disponibile'
      ? `Esercente riconosciuto nei dati dimostrativi: ${merchant}.`
      : 'Esercente riconosciuto nei dati dimostrativi.'
  }
  return explanation.trim() || 'L’indizio disponibile richiede una verifica.'
}
const amount = (value: MoneyDto, signed = false) =>
  formatMoney(fromJson(value), { symbolPosition: 'before', sign: signed ? 'exceptZero' : 'auto' })
const statusLabels = {
  pending: 'In attesa',
  booked: 'Contabilizzato',
  reversed: 'Stornato',
} as const
const matchLabels = {
  pending_to_booked: 'Da attesa a contabilizzato',
  duplicate: 'Possibile duplicato',
  internal_transfer: 'Trasferimento tra conti',
  card_settlement: 'Addebito carta',
  refund: 'Rimborso',
  cash_transfer: 'Trasferimento di contante',
} as const
const matchStates = {
  suggested: 'Da confermare',
  confirmed: 'Confermato',
  rejected: 'Rifiutato',
  undone: 'Decisione annullata',
} as const

export default function App() {
  const systemTheme = useColorScheme()
  const [themeChoice, setThemeChoice] = useState<BrandTheme | null>(null)
  const theme = themeChoice ?? (systemTheme === 'dark' ? 'dark' : 'light')
  const c = colors[theme]
  const s = useMemo(() => styles(c), [c])
  const wide = useWindowDimensions().width >= 960
  const [fontsLoaded, fontError] = useFonts({
    Geist: require('../../packages/brand/fonts/Geist-Regular.ttf'),
    GeistMedium: require('../../packages/brand/fonts/Geist-Medium.ttf'),
    GeistSemibold: require('../../packages/brand/fonts/Geist-Semibold.ttf'),
    Newsreader: require('../../packages/brand/fonts/Newsreader-Variable.ttf'),
  })
  const [tab, setTab] = useState<Tab>('Home')
  const [data, setData] = useState<DemoOverview | null>(null)
  const datetime = (value: string | null | undefined) =>
    formatInstant(value, data?.profile.timezone ?? 'Europe/Rome')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [retrievedAt, setRetrievedAt] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'review'>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [category, setCategory] = useState<CategoryId>('uncategorised')
  const [scope, setScope] = useState<Scope>('once')
  const [undoCategory, setUndoCategory] = useState<{ id: string; category: CategoryId } | null>(
    null,
  )
  const [confirm, setConfirm] = useState<
    { type: 'disconnect'; id: string } | { type: 'erase' } | null
  >(null)
  const [exported, setExported] = useState<string | null>(null)
  const [erased, setErased] = useState(false)
  const scroll = useRef<ScrollView>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: These state changes reveal the relevant route, confirmation, or feedback at the top of the screen.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false })
  }, [tab, detailId, confirm, notice, error])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const overview = await api.overview()
      setData(overview)
      setRetrievedAt(new Date().toISOString())
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === 'ApiError'
          ? cause.message
          : 'Le informazioni non sono disponibili. Verifica che il servizio della demo sia avviato e riprova.',
      )
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const mutate = async (key: string, action: () => Promise<unknown>, success: string) => {
    if (busy) return false
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      await action()
      const overview = await api.overview()
      setData(overview)
      setRetrievedAt(new Date().toISOString())
      setNotice(success)
      return true
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === 'ApiError'
          ? cause.message
          : 'Non siamo riusciti a completare l’azione. Riprova: i dati già disponibili restano visibili.',
      )
      return false
    } finally {
      setBusy(null)
    }
  }

  const classification = (id: string) =>
    data?.analysis.classifications.find((item) => item.transactionId === id)
  const openDetail = (transaction: TransactionDto) => {
    setDetailId(transaction.id)
    setCategory(classification(transaction.id)?.categoryId ?? 'uncategorised')
    setScope('once')
    setNotice(null)
  }
  const selected = data?.transactions.find((transaction) => transaction.id === detailId)
  const sorted = useMemo(
    () =>
      [...(data?.transactions ?? [])].sort((a, b) =>
        (b.bookedOn ?? b.authorizedOn ?? '').localeCompare(a.bookedOn ?? a.authorizedOn ?? ''),
      ),
    [data],
  )
  const dates = sorted
    .map((transaction) => transaction.bookedOn ?? transaction.authorizedOn)
    .filter((value): value is string => value !== null)
    .sort()
  const history = dates.length
    ? `${date(dates[0])} – ${date(dates[dates.length - 1])}`
    : 'Nessun periodo disponibile'
  const activeConnections =
    data?.connections.filter((connection) => connection.status === 'active') ?? []
  const reviewCount = data?.analysis.reviewItems.length ?? 0
  const orderedMatches = [...(data?.analysis.matches ?? [])].sort((first, second) => {
    const awaiting = (state: string) => (state === 'suggested' || state === 'undone' ? 0 : 1)
    return awaiting(first.state) - awaiting(second.state)
  })
  const filtered = sorted.filter((transaction) => {
    const matchesSearch =
      `${name(transaction)} ${transaction.description} ${CATEGORIES[classification(transaction.id)?.categoryId ?? 'uncategorised']}`
        .toLocaleLowerCase('it')
        .includes(query.toLocaleLowerCase('it'))
    return (
      matchesSearch &&
      (filter === 'all' ||
        (filter === 'pending' && transaction.status === 'pending') ||
        (filter === 'review' &&
          data?.analysis.reviewItems.some((item) => item.transactionIds.includes(transaction.id))))
    )
  })
  const go = (destination: Tab) => {
    setTab(destination)
    setDetailId(null)
    setConfirm(null)
  }

  const transactionRow = (transaction: TransactionDto) => {
    const categoryName = CATEGORIES[classification(transaction.id)?.categoryId ?? 'uncategorised']
    const account = data?.accounts.find((item) => item.id === transaction.accountId)
    const match = data?.analysis.matches.find(
      (item) => item.state === 'confirmed' && item.transactionIds.includes(transaction.id),
    )
    const excluded =
      match && ['internal_transfer', 'card_settlement', 'cash_transfer'].includes(match.type)
    return (
      <Pressable
        key={transaction.id}
        accessibilityRole="button"
        accessibilityLabel={`Apri ${name(transaction)}, ${formatMoneyAccessibleIt(fromJson(transaction.amount))}, ${categoryName}, ${statusLabels[transaction.status]}`}
        onPress={() => openDetail(transaction)}
        style={({ pressed }) => [s.transaction, pressed && s.pressed]}
      >
        <View style={s.transactionTop}>
          <View style={s.merchantCircle}>
            <Text style={s.merchantLetter}>{name(transaction).slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={s.transactionName}>
            <Text style={s.strong}>{name(transaction)}</Text>
            <Text style={s.caption}>
              {date(transaction.bookedOn ?? transaction.authorizedOn)} ·{' '}
              {account?.name ?? 'Conto dimostrativo'}
            </Text>
          </View>
          <Text
            accessibilityLabel={formatMoneyAccessibleIt(fromJson(transaction.amount))}
            style={[
              s.rowAmount,
              { color: BigInt(transaction.amount.amountMinor) > 0n ? c.positive : c.textPrimary },
            ]}
          >
            {amount(transaction.amount, true)}
          </Text>
        </View>
        <View style={s.transactionMeta}>
          <Text style={s.categoryLabel}>{categoryName}</Text>
          <Text style={[s.caption, transaction.status === 'pending' && { color: c.warning }]}>
            {statusLabels[transaction.status]}
            {excluded ? ' · Escluso dalle spese' : match ? ' · Corrispondenza confermata' : ''}
          </Text>
        </View>
      </Pressable>
    )
  }

  const saveCategory = async () => {
    if (!selected) return
    const previous = classification(selected.id)?.categoryId ?? 'uncategorised'
    const saved = await mutate(
      'category',
      () => api.correct(selected.id, category, scope, selected.revision),
      scope === 'merchant'
        ? 'Categoria aggiornata. La scelta vale anche per i prossimi acquisti dallo stesso esercente.'
        : 'Categoria aggiornata per questo movimento.',
    )
    if (saved) {
      setUndoCategory(scope === 'once' ? { id: selected.id, category: previous } : null)
      setDetailId(null)
    }
  }
  const undoCorrection = async () => {
    if (!undoCategory) return
    const transaction = data?.transactions.find((item) => item.id === undoCategory.id)
    if (
      transaction &&
      (await mutate(
        'undo-category',
        () => api.correct(transaction.id, undoCategory.category, 'once', transaction.revision),
        'Categoria precedente ripristinata.',
      ))
    )
      setUndoCategory(null)
  }
  const exportData = async () => {
    setBusy('export')
    setError(null)
    try {
      const payload = JSON.stringify(await api.exportData(), null, 2)
      setExported(payload)
      setNotice(
        'Esportazione pronta. Il file contiene il profilo dimostrativo, le fonti e lo storico disponibile.',
      )
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'lilleri-dati-dimostrativi.json'
        anchor.click()
        URL.revokeObjectURL(url)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Esportazione non disponibile. Riprova.')
    } finally {
      setBusy(null)
    }
  }
  const confirmAction = async () => {
    if (!confirm || busy) return
    if (confirm.type === 'disconnect') {
      if (
        await mutate(
          'disconnect',
          () => api.disconnect(confirm.id),
          'Fonte simulata scollegata. Lo storico resta disponibile; gli aggiornamenti sono fermi.',
        )
      )
        setConfirm(null)
    } else {
      setBusy('erase')
      setError(null)
      try {
        await api.erase()
        setData(null)
        setErased(true)
        setConfirm(null)
        setDetailId(null)
        setExported(null)
        setNotice(null)
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Non siamo riusciti a eliminare i dati. Riprova.',
        )
      } finally {
        setBusy(null)
      }
    }
  }

  if (!fontsLoaded && !fontError)
    return (
      <SafeAreaView style={s.root}>
        <View style={s.loader}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.body}>Sto preparando la demo.</Text>
        </View>
      </SafeAreaView>
    )

  return (
    <SafeAreaView style={s.root}>
      <View style={s.appHeader}>
        <Image
          source={
            theme === 'dark'
              ? require('../../packages/brand/png/lockup-dark.png')
              : require('../../packages/brand/png/lockup-light.png')
          }
          style={s.logo}
          resizeMode="contain"
          accessibilityLabel="Lilleri"
        />
        <View style={s.headerActions}>
          <Text style={s.demoBadge}>Dati dimostrativi</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={theme === 'dark' ? 'Usa aspetto chiaro' : 'Usa aspetto scuro'}
            onPress={() => setThemeChoice(theme === 'dark' ? 'light' : 'dark')}
            style={s.themeButton}
          >
            <Text style={s.themeGlyph}>{theme === 'dark' ? '☼' : '◐'}</Text>
          </Pressable>
        </View>
      </View>
      <View style={[s.shell, wide && s.wideShell]}>
        {wide && (
          <View style={s.rail}>
            <Text style={s.railLabel}>IL TUO QUADRO</Text>
            {tabs.map((destination, index) => (
              <Pressable
                key={destination}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === destination }}
                onPress={() => go(destination)}
                style={[s.railTab, tab === destination && s.selectedTab]}
              >
                <Text style={[s.railNumber, tab === destination && s.selectedText]}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <Text style={[s.navLabel, tab === destination && s.selectedText]}>
                  {destination}
                  {destination === 'Da controllare' && reviewCount > 0 ? ` (${reviewCount})` : ''}
                </Text>
              </Pressable>
            ))}
            <View style={s.railFooter}>
              <Signature color={c.primary} />
              <Text style={s.caption}>{'Un po’ di ordine.\nUn po’ più di spazio.'}</Text>
            </View>
          </View>
        )}
        <ScrollView
          ref={scroll}
          style={s.scroll}
          contentContainerStyle={[s.content, wide && s.wideContent]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.pageHeading}>
            <View style={s.headingCopy}>
              <Text style={s.eyebrow}>IL PROTOTIPO LILLERI</Text>
              <Text accessibilityRole="header" style={s.heading}>
                {selected ? 'Il movimento' : tab === 'Home' ? 'Un quadro più chiaro.' : tab}
              </Text>
            </View>
            {!erased && (
              <Button
                label={loading ? 'Recupero…' : 'Aggiorna'}
                onPress={() => void refresh()}
                quiet
                disabled={loading || !!busy}
                c={c}
                s={s}
              />
            )}
          </View>
          <Text style={s.demoIntro}>
            Una demo locale con un profilo sintetico. Non servono credenziali bancarie; nessuna
            banca reale è collegata.
          </Text>
          {fontError && (
            <Text accessibilityRole="alert" style={s.errorText}>
              Il carattere di Lilleri non è disponibile. Puoi continuare con il carattere del
              dispositivo.
            </Text>
          )}
          {error && (
            <View accessibilityRole="alert" style={s.errorBanner}>
              <Text style={s.strong}>Non siamo riusciti ad aggiornare i dati.</Text>
              <Text style={s.body}>{error}</Text>
              {data && (
                <Text style={s.caption}>
                  I dati precedenti restano visibili. Recuperati {datetime(retrievedAt)}.
                </Text>
              )}
              <Button
                label="Riprova"
                onPress={() => void refresh()}
                quiet
                disabled={loading || !!busy || erased}
                c={c}
                s={s}
              />
            </View>
          )}
          {notice && (
            <View accessibilityLiveRegion="polite" style={s.notice}>
              <Text style={s.body}>{notice}</Text>
              {undoCategory && (
                <Button
                  label="Annulla modifica categoria"
                  onPress={() => void undoCorrection()}
                  quiet
                  disabled={!!busy}
                  c={c}
                  s={s}
                />
              )}
            </View>
          )}
          {busy && (
            <View accessibilityLiveRegion="polite" style={s.busy}>
              <ActivityIndicator color={c.primary} size="small" />
              <Text style={s.caption}>
                {busy === 'export'
                  ? 'Sto preparando l’esportazione.'
                  : busy === 'sync'
                    ? 'Sto aggiornando la fonte simulata.'
                    : 'Sto salvando l’azione.'}
              </Text>
            </View>
          )}
          {confirm && (
            <View style={s.confirmation} accessibilityRole="alert">
              <Text accessibilityRole="header" style={s.sectionTitle}>
                {confirm.type === 'erase'
                  ? 'Eliminare i dati dimostrativi?'
                  : 'Scollegare la fonte simulata?'}
              </Text>
              <Text style={s.body}>
                {confirm.type === 'erase'
                  ? 'Elimineremo il profilo locale e tutti i suoi dati finanziari dimostrativi. Lo storico non sarà più disponibile. Questa azione non può essere annullata.'
                  : 'Gli aggiornamenti della fonte simulata si fermeranno. I movimenti già recuperati e le tue correzioni resteranno nello storico.'}
              </Text>
              <View style={s.actions}>
                <Button
                  label={
                    confirm.type === 'erase' ? 'Conferma eliminazione' : 'Conferma scollegamento'
                  }
                  onPress={() => void confirmAction()}
                  destructive
                  disabled={!!busy}
                  c={c}
                  s={s}
                />
                <Button
                  label="Annulla"
                  onPress={() => setConfirm(null)}
                  quiet
                  disabled={!!busy}
                  c={c}
                  s={s}
                />
              </View>
            </View>
          )}
          {erased ? (
            <View style={s.card}>
              <Signature color={c.primary} />
              <Text accessibilityRole="header" style={s.sectionTitle}>
                Dati dimostrativi eliminati.
              </Text>
              <Text style={s.body}>
                Il profilo locale è stato rimosso. Nessun conto bancario reale è stato coinvolto.
                Per iniziare una nuova demo, prepara un nuovo archivio locale dal servizio.
              </Text>
            </View>
          ) : !data ? (
            <View style={s.card}>
              {loading ? (
                <>
                  <ActivityIndicator color={c.primary} />
                  <Text accessibilityLiveRegion="polite" style={s.body}>
                    Sto recuperando i movimenti dimostrativi.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={s.sectionTitle}>La demo non è ancora disponibile.</Text>
                  <Text style={s.body}>
                    Avvia il servizio locale e riprova per vedere i dati dimostrativi.
                  </Text>
                  <Button label="Recupera i dati" onPress={() => void refresh()} c={c} s={s} />
                </>
              )}
            </View>
          ) : selected ? (
            <>
              <Button
                label="← Torna all’elenco"
                onPress={() => setDetailId(null)}
                quiet
                c={c}
                s={s}
              />
              <View style={s.card}>
                <Text accessibilityRole="header" style={s.detailMerchant}>
                  {name(selected)}
                </Text>
                <Text style={s.bigAmount}>{amount(selected.amount, true)}</Text>
                <Text style={s.caption}>
                  {statusLabels[selected.status]} ·{' '}
                  {date(selected.bookedOn ?? selected.authorizedOn)} ·{' '}
                  {data.accounts.find((account) => account.id === selected.accountId)?.name}
                </Text>
                <View style={s.divider} />
                <Text style={s.label}>DESCRIZIONE ORIGINALE</Text>
                <Text selectable style={s.body}>
                  {selected.description.trim() || 'Descrizione non disponibile'}
                </Text>
                <Text style={s.label}>PERCHÉ QUESTA CATEGORIA</Text>
                <Text style={s.body}>
                  {classification(selected.id)?.explanation ??
                    'La categoria richiede una tua scelta.'}
                </Text>
                {classification(selected.id)?.evidence.map((item) => (
                  <Text key={item} style={s.caption}>
                    •{' '}
                    {humanEvidence(
                      item,
                      classification(selected.id)?.explanation ?? '',
                      name(selected),
                    )}
                  </Text>
                ))}
              </View>
              {data.analysis.matches
                .filter((match) => match.transactionIds.includes(selected.id))
                .map((match) => (
                  <View key={match.id} style={s.card}>
                    <Text accessibilityRole="header" style={s.sectionTitle}>
                      {matchLabels[match.type]}
                    </Text>
                    <Text style={s.stateBadge}>{matchStates[match.state]}</Text>
                    <Text style={s.body}>{match.explanation}</Text>
                    {match.evidence.map((item) => (
                      <Text key={item} style={s.caption}>
                        • {humanEvidence(item, match.explanation)}
                      </Text>
                    ))}
                    <Button
                      label="Controlla la corrispondenza"
                      onPress={() => go('Da controllare')}
                      quiet
                      c={c}
                      s={s}
                    />
                  </View>
                ))}
              <View style={s.card}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  Scegli la categoria
                </Text>
                <View style={s.categories}>
                  {(Object.entries(CATEGORIES) as [CategoryId, string][]).map(([id, label]) => (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: category === id }}
                      onPress={() => setCategory(id)}
                      style={[s.categoryOption, category === id && s.selectedOption]}
                    >
                      <Text style={[s.body, category === id && s.selectedText]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.label}>A QUALI MOVIMENTI SI APPLICA?</Text>
                <View style={s.scopeChoices}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: scope === 'once' }}
                    onPress={() => setScope('once')}
                    style={[s.scopeChoice, scope === 'once' && s.selectedOption]}
                  >
                    <Text style={s.strong}>
                      {scope === 'once' ? '● ' : '○ '}Solo questo movimento
                    </Text>
                    <Text style={s.caption}>Le altre categorie non cambiano.</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: scope === 'merchant' }}
                    onPress={() => setScope('merchant')}
                    disabled={!selected.merchantKey}
                    style={[
                      s.scopeChoice,
                      scope === 'merchant' && s.selectedOption,
                      !selected.merchantKey && s.disabled,
                    ]}
                  >
                    <Text style={s.strong}>
                      {scope === 'merchant' ? '● ' : '○ '}Anche i prossimi acquisti
                    </Text>
                    <Text style={s.caption}>
                      {selected.merchantKey
                        ? `La stessa categoria per i futuri movimenti da ${name(selected)}. Lo storico precedente non viene riclassificato.`
                        : 'L’esercente non è identificato: puoi modificare solo questo movimento.'}
                    </Text>
                  </Pressable>
                </View>
                <Button
                  label="Salva categoria"
                  onPress={() => void saveCategory()}
                  disabled={!!busy}
                  c={c}
                  s={s}
                />
              </View>
            </>
          ) : tab === 'Home' ? (
            <>
              <View style={s.attention}>
                <View style={s.attentionCopy}>
                  <Text accessibilityRole="header" style={s.sectionTitle}>
                    {reviewCount
                      ? `${reviewCount} elementi da controllare.`
                      : 'Niente da controllare.'}
                  </Text>
                  <Text style={s.body}>
                    {reviewCount
                      ? 'Un dubbio si risolve meglio guardando le fonti.'
                      : 'Le proposte che richiedono una tua scelta compariranno qui.'}
                  </Text>
                </View>
                {reviewCount > 0 && (
                  <Button label="Controlla" onPress={() => go('Da controllare')} c={c} s={s} />
                )}
              </View>
              <View style={s.summary}>
                <View style={s.summaryHead}>
                  <Text style={s.label}>SPESE NEI DATI DIMOSTRATIVI</Text>
                  <Signature color={c.primary} />
                </View>
                <Text style={s.caption}>
                  {history} · {data.accounts.length} conti inclusi
                </Text>
                {data.analysis.summaries.length ? (
                  data.analysis.summaries.map((summary) => (
                    <View key={summary.currency} style={s.currencySummary}>
                      <Text style={s.currency}>{summary.currency}</Text>
                      <Text
                        accessibilityLabel={`Spese ${formatMoneyAccessibleIt(fromJson(summary.spend))}`}
                        style={s.bigAmount}
                      >
                        {amount(summary.spend)}
                      </Text>
                      <View style={s.summaryDetails}>
                        <View style={s.metric}>
                          <Text style={s.caption}>Entrate contabilizzate</Text>
                          <Text style={s.mediumAmount}>{amount(summary.income)}</Text>
                        </View>
                        <View style={s.metric}>
                          <Text style={s.caption}>In attesa (saldo)</Text>
                          <Text style={s.mediumAmount}>{amount(summary.pending)}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={s.body}>Nessun importo disponibile.</Text>
                )}
                <Text style={s.summaryNote}>
                  Le valute restano separate. I movimenti in attesa sono indicati a parte; le
                  corrispondenze confermate evitano i doppi conteggi.
                </Text>
                <Text style={s.caption}>Ultimo recupero {datetime(retrievedAt)}</Text>
              </View>
              <View style={s.sectionHeader}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  I conti nell’esempio
                </Text>
                <Button label="Gestisci" onPress={() => go('Privacy')} quiet c={c} s={s} />
              </View>
              <View style={s.card}>
                {data.accounts.length ? (
                  data.accounts.map((account) => (
                    <View style={s.accountRow} key={account.id}>
                      <View style={s.accountName}>
                        <Text style={s.strong}>{account.name}</Text>
                        <Text style={s.caption}>
                          {account.institutionName} · saldo al {datetime(account.balanceUpdatedAt)}
                        </Text>
                      </View>
                      <Text style={s.mediumAmount}>{amount(account.balance)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={s.body}>Nessun conto nella demo.</Text>
                )}
              </View>
              <View style={s.sectionHeader}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  Gli ultimi movimenti
                </Text>
                <Button label="Vedi tutti" onPress={() => go('Movimenti')} quiet c={c} s={s} />
              </View>
              <View style={s.list}>
                {sorted.slice(0, 4).map(transactionRow)}
                {!sorted.length && <Text style={s.body}>Qui vedrai i movimenti disponibili.</Text>}
              </View>
              <View style={s.footerNote}>
                <Signature color={c.primary} />
                <Text style={s.caption}>
                  Dati sintetici. Le proposte sono spiegate, le decisioni restano tue.
                </Text>
              </View>
            </>
          ) : tab === 'Movimenti' ? (
            <>
              <Text style={s.caption}>
                {sorted.length} movimenti · {history}
              </Text>
              <Text style={s.inputLabel}>Cerca un movimento</Text>
              <TextInput
                accessibilityLabel="Cerca un movimento"
                placeholder="Esercente, descrizione o categoria"
                placeholderTextColor={c.textTertiary}
                value={query}
                onChangeText={setQuery}
                style={s.input}
              />
              <View style={s.filters}>
                {(['all', 'pending', 'review'] as const).map((id) => (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === id }}
                    onPress={() => setFilter(id)}
                    style={[s.filter, filter === id && s.selectedOption]}
                  >
                    <Text style={[s.body, filter === id && s.selectedText]}>
                      {id === 'all' ? 'Tutti' : id === 'pending' ? 'In attesa' : 'Da controllare'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.list}>
                {filtered.map(transactionRow)}
                {!filtered.length && (
                  <View style={s.empty}>
                    <Text style={s.sectionTitle}>
                      {sorted.length ? 'Nessun risultato.' : 'Qui vedrai i movimenti.'}
                    </Text>
                    <Text style={s.body}>
                      {sorted.length
                        ? 'Prova un’altra ricerca o cambia filtro.'
                        : 'Non ci sono ancora movimenti nei dati dimostrativi.'}
                    </Text>
                    {sorted.length > 0 && (
                      <Button
                        label="Cancella ricerca e filtri"
                        onPress={() => {
                          setQuery('')
                          setFilter('all')
                        }}
                        quiet
                        c={c}
                        s={s}
                      />
                    )}
                  </View>
                )}
              </View>
            </>
          ) : tab === 'Da controllare' ? (
            <>
              <Text style={s.body}>
                Guarda gli indizi, poi scegli. Ogni corrispondenza mantiene i movimenti originali.
              </Text>
              {data.analysis.reviewItems
                .filter((item) => item.type === 'classification')
                .map((item) => (
                  <View style={s.card} key={item.id}>
                    <Text style={s.eyebrow}>CATEGORIA DA SCEGLIERE</Text>
                    <Text style={s.body}>{item.explanation}</Text>
                    {item.transactionIds
                      .map((id) => data.transactions.find((transaction) => transaction.id === id))
                      .filter((transaction): transaction is TransactionDto => !!transaction)
                      .map(transactionRow)}
                  </View>
                ))}
              {orderedMatches.map((match) => (
                <View style={s.card} key={match.id}>
                  <View style={s.matchHeader}>
                    <Text accessibilityRole="header" style={s.sectionTitle}>
                      {matchLabels[match.type]}
                    </Text>
                    <Text style={s.stateBadge}>{matchStates[match.state]}</Text>
                  </View>
                  <Text style={s.body}>{match.explanation}</Text>
                  {match.evidence.map((item) => (
                    <Text key={item} style={s.caption}>
                      • {humanEvidence(item, match.explanation)}
                    </Text>
                  ))}
                  <View style={s.matchTransactions}>
                    {match.transactionIds
                      .map((id) => data.transactions.find((transaction) => transaction.id === id))
                      .filter((transaction): transaction is TransactionDto => !!transaction)
                      .map(transactionRow)}
                  </View>
                  <Text style={s.caption}>
                    Una conferma aggiorna i totali; i dati di origine restano nello storico.
                  </Text>
                  <View style={s.actions}>
                    {match.state === 'suggested' || match.state === 'undone' ? (
                      <>
                        <Button
                          label="Conferma corrispondenza"
                          onPress={() =>
                            void mutate(
                              match.id,
                              () => api.decideMatch(match.id, 'confirmed'),
                              'Corrispondenza confermata. I totali sono stati ricalcolati.',
                            )
                          }
                          disabled={!!busy}
                          c={c}
                          s={s}
                        />
                        <Button
                          label="Rifiuta"
                          onPress={() =>
                            void mutate(
                              match.id,
                              () => api.decideMatch(match.id, 'rejected'),
                              'Proposta rifiutata. I movimenti restano distinti.',
                            )
                          }
                          quiet
                          disabled={!!busy}
                          c={c}
                          s={s}
                        />
                      </>
                    ) : (
                      <Button
                        label="Annulla decisione"
                        onPress={() =>
                          void mutate(
                            match.id,
                            () => api.decideMatch(match.id, 'undone'),
                            'Decisione annullata. Puoi controllare nuovamente gli indizi.',
                          )
                        }
                        quiet
                        disabled={!!busy}
                        c={c}
                        s={s}
                      />
                    )}
                  </View>
                </View>
              ))}
              {data.analysis.reviewItems
                .filter((item) => item.type === 'balance')
                .map((item) => (
                  <View style={s.card} key={item.id}>
                    <Text style={s.sectionTitle}>Saldo da verificare</Text>
                    <Text style={s.body}>{item.explanation}</Text>
                  </View>
                ))}
              {!reviewCount && (
                <View style={s.empty}>
                  <Signature color={c.primary} />
                  <Text style={s.sectionTitle}>Niente da controllare.</Text>
                  <Text style={s.body}>
                    Le decisioni già prese restano visibili qui, con la possibilità di annullarle.
                  </Text>
                </View>
              )}
            </>
          ) : tab === 'Ricorrenti' ? (
            <>
              <Text style={s.body}>
                Possibili ricorrenze riconosciute nello storico dimostrativo. Le prossime date e gli
                importi sono stime: non confermano un contratto o un addebito futuro.
              </Text>
              {data.analysis.recurring.map((series) => {
                const transactions = series.transactionIds
                  .map((id) => data.transactions.find((transaction) => transaction.id === id))
                  .filter((transaction): transaction is TransactionDto => !!transaction)
                return (
                  <View style={s.card} key={series.id}>
                    <Text style={s.eyebrow}>POSSIBILE RICORRENZA MENSILE</Text>
                    <Text accessibilityRole="header" style={s.sectionTitle}>
                      {transactions[0] ? name(transactions[0]) : 'Movimento ricorrente'}
                    </Text>
                    <View style={s.recurringAmount}>
                      <Text style={s.mediumAmount}>Stima: {amount(series.expectedAmount)}</Text>
                      <Text style={s.caption}>Prossima data stimata: {date(series.nextOn)}</Text>
                    </View>
                    <Text style={s.body}>{series.explanation}</Text>
                    {series.priceIncreased && (
                      <Text style={[s.body, { color: c.warning }]}>
                        L’ultimo importo rilevato è più alto. Controlla gli addebiti per
                        confrontarli.
                      </Text>
                    )}
                    {series.evidence.map((item) => (
                      <Text key={item} style={s.caption}>
                        • {humanEvidence(item, series.explanation)}
                      </Text>
                    ))}
                    <Text style={s.label}>MOVIMENTI USATI PER LA STIMA</Text>
                    {transactions.map(transactionRow)}
                  </View>
                )
              })}
              {!data.analysis.recurring.length && (
                <View style={s.empty}>
                  <Text style={s.sectionTitle}>Nessuna ricorrenza proposta.</Text>
                  <Text style={s.body}>
                    Servono più movimenti confrontabili per riconoscere una possibile ricorrenza.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={s.card}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  I dati di questa demo
                </Text>
                <Text style={s.body}>
                  Il profilo “{data.profile.name}” e i movimenti sono sintetici. Il servizio locale
                  conserva conti, movimenti, decisioni e correzioni. Nessun dato viene inviato a
                  un’AI esterna da questo prototipo.
                </Text>
                <View style={s.divider} />
                <Text style={s.strong}>Collegamenti bancari reali non disponibili</Text>
                <Text style={s.caption}>
                  La fonte simulata serve a verificare il percorso. Non inserire credenziali o dati
                  bancari personali.
                </Text>
              </View>
              <Text accessibilityRole="header" style={s.sectionTitle}>
                La fonte simulata
              </Text>
              {data.connections.map((connection) => (
                <View style={s.card} key={connection.id}>
                  <Text style={s.strong}>
                    Archivio dimostrativo ·{' '}
                    {connection.status === 'active'
                      ? 'Attivo'
                      : connection.status === 'revoked'
                        ? 'Scollegato'
                        : connection.status === 'expired'
                          ? 'Scaduto'
                          : 'Aggiornamento non riuscito'}
                  </Text>
                  <Text style={s.caption}>
                    Ultimo aggiornamento della fonte: {datetime(connection.lastSyncedAt)}
                  </Text>
                  <Text style={s.caption}>
                    Durata di accesso: non applicabile alla fonte simulata.
                  </Text>
                  <View style={s.actions}>
                    {connection.status === 'active' ? (
                      <>
                        <Button
                          label="Aggiorna fonte simulata"
                          onPress={() =>
                            void mutate(
                              'sync',
                              async () => {
                                const result = await api.sync(connection.id)
                                setNotice(
                                  `Fonte aggiornata: ${result.inserted} nuovi, ${result.updated} modificati, ${result.unchanged} invariati.`,
                                )
                                return result
                              },
                              'Fonte simulata aggiornata. I movimenti già presenti non vengono duplicati.',
                            )
                          }
                          disabled={!!busy}
                          c={c}
                          s={s}
                        />
                        <Button
                          label="Scollega fonte"
                          onPress={() => setConfirm({ type: 'disconnect', id: connection.id })}
                          quiet
                          disabled={!!busy}
                          c={c}
                          s={s}
                        />
                      </>
                    ) : (
                      <Text style={s.body}>
                        Gli aggiornamenti sono fermi. Lo storico resta disponibile.
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {!activeConnections.length && (
                <Button
                  label="Attiva fonte simulata"
                  onPress={() =>
                    void mutate(
                      'connect',
                      () => api.connectMock(),
                      'Fonte simulata attivata. Puoi aggiornarla per recuperare i movimenti.',
                    )
                  }
                  disabled={!!busy}
                  c={c}
                  s={s}
                />
              )}
              <View style={s.card}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  Esporta lo storico
                </Text>
                <Text style={s.body}>
                  Un file JSON con tutti i dati disponibili del profilo dimostrativo. Gli importi
                  conservano la loro valuta e la precisione originale.
                </Text>
                <Button
                  label="Esporta i dati"
                  onPress={() => void exportData()}
                  disabled={!!busy}
                  c={c}
                  s={s}
                />
                {exported && (
                  <>
                    <Text accessibilityLiveRegion="polite" style={s.caption}>
                      {Platform.OS === 'web'
                        ? 'Il file è pronto e il download è stato avviato. Puoi anche selezionare il contenuto qui sotto.'
                        : 'Esportazione pronta. Puoi selezionare e copiare il contenuto qui sotto.'}
                    </Text>
                    <ScrollView style={s.exportPreview} nestedScrollEnabled>
                      <Text selectable style={s.exportText}>
                        {exported}
                      </Text>
                    </ScrollView>
                  </>
                )}
              </View>
              <View style={s.card}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  Elimina i dati dimostrativi
                </Text>
                <Text style={s.body}>
                  Rimuove il profilo locale, i conti, lo storico e le correzioni. Scollegare una
                  fonte, invece, conserva lo storico.
                </Text>
                <Button
                  label="Elimina dati dimostrativi"
                  onPress={() => setConfirm({ type: 'erase' })}
                  destructive
                  disabled={!!busy}
                  c={c}
                  s={s}
                />
              </View>
            </>
          )}
          <View style={s.pageEnd}>
            <Text style={s.caption}>Lilleri · Prototipo in sviluppo</Text>
            <Text style={s.caption}>
              Le funzioni bancarie reali e l’accesso con un account personale non sono disponibili.
            </Text>
          </View>
        </ScrollView>
      </View>
      {!wide && (
        <View style={s.tabBar}>
          {tabs.map((destination, index) => (
            <Pressable
              key={destination}
              accessibilityRole="button"
              accessibilityLabel={`${destination}${destination === 'Da controllare' ? `, ${reviewCount} elementi` : ''}`}
              accessibilityState={{ selected: tab === destination }}
              onPress={() => go(destination)}
              style={[s.tab, tab === destination && s.selectedTab]}
            >
              <Text
                accessibilityElementsHidden
                style={[s.tabIcon, tab === destination && s.selectedText]}
              >
                {['⌂', '≡', '✓', '↻', '◉'][index]}
              </Text>
              <Text style={[s.tabLabel, tab === destination && s.selectedText]}>
                {destination === 'Da controllare' ? 'Controlla' : destination}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  )
}

function Signature({ color }: { color: string }) {
  return (
    <View
      accessibilityElementsHidden
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: 16 }}
    >
      <View style={{ width: 24, height: 2, backgroundColor: color }} />
      <View style={{ width: 24, height: 2, backgroundColor: color }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  )
}

type Styles = ReturnType<typeof styles>
function Button({
  label,
  onPress,
  quiet = false,
  destructive = false,
  disabled = false,
  c,
  s,
}: {
  label: string
  onPress: () => void
  quiet?: boolean
  destructive?: boolean
  disabled?: boolean
  c: ThemeColors
  s: Styles
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        quiet && s.quietButton,
        destructive && { backgroundColor: c.surface, borderColor: c.danger, borderWidth: 1 },
        pressed && s.pressed,
        disabled && s.disabled,
      ]}
    >
      <Text
        style={[s.buttonText, quiet && { color: c.primary }, destructive && { color: c.danger }]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function styles(c: ThemeColors) {
  const type = tokens.typography.scale
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    appHeader: {
      width: '100%',
      maxWidth: 1100,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 16,
      borderBottomWidth: 1,
      borderColor: c.border,
    },
    logo: { width: 122, height: 40 },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1 },
    demoBadge: {
      fontFamily: 'GeistMedium',
      fontSize: tokens.typography.scale.caption.size,
      lineHeight: 16,
      color: c.textSecondary,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      flexShrink: 1,
    },
    themeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    themeGlyph: { fontSize: 24, color: c.primary },
    shell: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center' },
    wideShell: { flexDirection: 'row' },
    scroll: { flex: 1 },
    content: { padding: 24, gap: 16, paddingBottom: 40 },
    wideContent: { padding: 40, maxWidth: 820 },
    rail: { width: 220, padding: 24, gap: 8, borderRightWidth: 1, borderColor: c.border },
    railLabel: {
      fontFamily: 'GeistMedium',
      fontSize: tokens.typography.scale.caption.size,
      color: c.textTertiary,
      letterSpacing: 1.3,
      paddingBottom: 24,
      paddingTop: 16,
    },
    railTab: {
      minHeight: 52,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
    },
    railNumber: {
      color: c.textTertiary,
      fontFamily: 'Geist',
      fontSize: 11,
      fontVariant: ['tabular-nums'],
    },
    navLabel: { color: c.textSecondary, fontFamily: 'GeistMedium', fontSize: 14, flexShrink: 1 },
    railFooter: { marginTop: 'auto', gap: 16, paddingTop: 40 },
    pageHeading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    headingCopy: { gap: 8, flex: 1 },
    eyebrow: {
      fontFamily: 'GeistMedium',
      fontSize: type.caption.size,
      lineHeight: type.caption.lineHeight,
      color: c.primary,
      letterSpacing: 1.1,
    },
    heading: {
      fontFamily: 'GeistSemibold',
      fontSize: type.h1.size,
      lineHeight: type.h1.lineHeight,
      color: c.textPrimary,
      letterSpacing: -0.6,
    },
    demoIntro: {
      fontFamily: 'Geist',
      fontSize: type.bodySmall.size,
      lineHeight: type.bodySmall.lineHeight,
      color: c.textSecondary,
      marginBottom: 8,
    },
    body: {
      fontFamily: 'Geist',
      fontSize: type.body.size,
      lineHeight: type.body.lineHeight,
      color: c.textPrimary,
      flexShrink: 1,
    },
    strong: {
      fontFamily: 'GeistSemibold',
      fontSize: type.body.size,
      lineHeight: type.body.lineHeight,
      color: c.textPrimary,
      flexShrink: 1,
    },
    caption: {
      fontFamily: 'Geist',
      fontSize: type.caption.size,
      lineHeight: type.caption.lineHeight,
      color: c.textSecondary,
      flexShrink: 1,
    },
    label: {
      fontFamily: 'GeistMedium',
      fontSize: type.caption.size,
      lineHeight: type.caption.lineHeight,
      color: c.textSecondary,
      letterSpacing: 0.9,
      marginTop: 8,
    },
    sectionTitle: {
      fontFamily: 'GeistSemibold',
      fontSize: type.title.size,
      lineHeight: type.title.lineHeight,
      color: c.textPrimary,
      flexShrink: 1,
    },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.lg,
      padding: 24,
      gap: 16,
    },
    summary: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.xl,
      padding: 24,
      gap: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    summaryHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    currencySummary: { gap: 8, paddingTop: 8 },
    currency: { fontFamily: 'GeistMedium', fontSize: 12, color: c.primary },
    bigAmount: {
      fontFamily: 'GeistMedium',
      fontSize: type.amountLarge.size,
      lineHeight: type.amountLarge.lineHeight,
      letterSpacing: type.amountLarge.letterSpacing,
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      flexShrink: 1,
    },
    mediumAmount: {
      fontFamily: 'GeistMedium',
      fontSize: type.amountMedium.size,
      lineHeight: type.amountMedium.lineHeight,
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
      flexShrink: 1,
    },
    summaryDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, paddingTop: 16 },
    metric: { gap: 8, minWidth: 140, flex: 1 },
    summaryNote: {
      fontFamily: 'Geist',
      fontSize: 12,
      lineHeight: 18,
      color: c.textSecondary,
      borderTopWidth: 1,
      borderColor: c.border,
      paddingTop: 16,
    },
    attention: {
      padding: 24,
      backgroundColor: c.primarySoft,
      borderRadius: tokens.radius.lg,
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    attentionCopy: { flex: 1, minWidth: 160, gap: 8 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      alignItems: 'center',
      paddingTop: 8,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: tokens.radius.md,
      paddingHorizontal: 20,
      paddingVertical: 12,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    quietButton: { backgroundColor: 'transparent', paddingHorizontal: 8 },
    buttonText: {
      fontFamily: 'GeistMedium',
      fontSize: type.label.size,
      lineHeight: type.label.lineHeight,
      color: c.onPrimary,
      textAlign: 'center',
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.75 },
    list: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    transaction: {
      padding: 16,
      gap: 8,
      borderBottomWidth: 1,
      borderColor: c.border,
      minHeight: 88,
    },
    transactionTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
    merchantCircle: {
      width: 36,
      height: 36,
      borderRadius: tokens.radius.sm,
      backgroundColor: c.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    merchantLetter: { fontFamily: 'Newsreader', fontSize: 22, color: c.primary },
    transactionName: { flex: 1, minWidth: 120, gap: 4 },
    rowAmount: {
      fontFamily: 'GeistMedium',
      fontSize: 16,
      lineHeight: 24,
      fontVariant: ['tabular-nums'],
      color: c.textPrimary,
      flexShrink: 1,
    },
    transactionMeta: {
      marginLeft: 48,
      gap: 4,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryLabel: { fontFamily: 'GeistMedium', fontSize: 12, lineHeight: 18, color: c.primary },
    accountRow: {
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
      flexWrap: 'wrap',
      borderBottomWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
    },
    accountName: { flex: 1, minWidth: 150, gap: 4 },
    footerNote: { gap: 16, paddingVertical: 24 },
    pageEnd: { gap: 4, paddingTop: 32, borderTopWidth: 1, borderColor: c.border, marginTop: 8 },
    detailMerchant: {
      fontFamily: 'GeistSemibold',
      fontSize: type.h2.size,
      lineHeight: type.h2.lineHeight,
      color: c.textPrimary,
    },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 8 },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryOption: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.sm,
    },
    selectedOption: { backgroundColor: c.primarySoft, borderColor: c.primary },
    selectedText: { color: c.primary },
    scopeChoices: { gap: 12 },
    scopeChoice: {
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.md,
      minHeight: 64,
    },
    inputLabel: {
      color: c.textPrimary,
      fontFamily: 'GeistMedium',
      fontSize: 14,
      lineHeight: 20,
      marginTop: 8,
    },
    input: {
      fontFamily: 'Geist',
      fontSize: 16,
      color: c.textPrimary,
      padding: 16,
      minHeight: 52,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.md,
      backgroundColor: c.surface,
    },
    filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    filter: {
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.sm,
    },
    empty: { padding: 24, gap: 16 },
    matchHeader: { gap: 12 },
    stateBadge: {
      fontFamily: 'GeistMedium',
      fontSize: 12,
      lineHeight: 18,
      color: c.primary,
      alignSelf: 'flex-start',
      backgroundColor: c.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: tokens.radius.pill,
    },
    matchTransactions: { borderTopWidth: 1, borderColor: c.border, marginHorizontal: -8 },
    actions: { gap: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    recurringAmount: { gap: 8 },
    errorBanner: {
      borderWidth: 1,
      borderColor: c.danger,
      backgroundColor: c.surface,
      padding: 20,
      borderRadius: tokens.radius.md,
      gap: 12,
    },
    errorText: { fontFamily: 'Geist', fontSize: 14, lineHeight: 20, color: c.danger },
    notice: {
      borderLeftWidth: 3,
      borderColor: c.success,
      padding: 16,
      backgroundColor: c.surface,
      gap: 8,
    },
    busy: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    confirmation: {
      borderWidth: 1,
      borderColor: c.danger,
      padding: 24,
      borderRadius: tokens.radius.lg,
      backgroundColor: c.surfaceElevated,
      gap: 16,
    },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
    exportPreview: {
      maxHeight: 220,
      padding: 16,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.sm,
    },
    exportText: { fontFamily: 'Geist', fontSize: 12, lineHeight: 18, color: c.textSecondary },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: c.surfaceElevated,
      borderTopWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 4,
      paddingTop: 8,
      paddingBottom: 8,
      gap: 2,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 2,
      minHeight: 64,
      borderRadius: tokens.radius.md,
    },
    selectedTab: { backgroundColor: c.primarySoft },
    tabIcon: { fontFamily: 'Geist', fontSize: 22, lineHeight: 24, color: c.textSecondary },
    tabLabel: {
      color: c.textSecondary,
      fontFamily: 'GeistMedium',
      fontSize: type.caption.size,
      lineHeight: type.caption.lineHeight,
      textAlign: 'center',
      flexShrink: 1,
    },
  })
}
