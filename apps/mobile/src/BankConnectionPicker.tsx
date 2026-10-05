import type {
  ApiClient,
  ConnectionDirectoryDto,
  ConnectionDirectoryEntry,
  ConnectionDirectoryKind,
} from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { AccessibleStatus } from './accessibility/AccessibilityPrimitives'
import { focusWebElement } from './accessibility/web-focus'
import { BankServiceLogo } from './BankServiceLogo'
import { bankServiceCountry, filterBankServices } from './bank-directory-search'
import { FinanceVisual } from './FinanceVisual'
import { bankCountryLabel, bankPickerCopy } from './i18n/bank-picker-messages'
import { useI18n } from './i18n/context'

export interface BankConnectionPickerProps {
  readonly api: Pick<ApiClient, 'connectionDirectory'>
  readonly theme: BrandTheme
  /** A profile/session change invalidates pending reads and the visible selection. */
  readonly resetKey: string | number
  readonly protectedPersonalAccess?: boolean
  readonly onImportStatement?: (entryId: string) => void
  /** Only a verified, available provider institution can reach this callback. */
  readonly onSelectConnect?: (institutionId: string, providerId: string) => void
}

type Scope = BankConnectionPickerProps['resetKey']
interface DirectoryState {
  readonly scope: Scope
  readonly attempt: number
  readonly value: ConnectionDirectoryDto | null
  readonly failed: boolean
}

function secureUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

/** Read-only discovery. Brand directory IDs never enter the synthetic connection writer. */
export function BankConnectionPicker({
  api,
  theme,
  resetKey,
  protectedPersonalAccess = false,
  onImportStatement,
  onSelectConnect,
}: BankConnectionPickerProps) {
  const { locale } = useI18n()
  const copy = useMemo(() => bankPickerCopy(locale), [locale])
  const c = colors[theme]
  const s = useMemo(() => makeStyles(c), [c])
  const window = useWindowDimensions()
  const [width, setWidth] = useState(window.width)
  const [state, setState] = useState<DirectoryState>({
    scope: resetKey,
    attempt: 0,
    value: null,
    failed: false,
  })
  const [reload, setReload] = useState(0)
  const [queryState, setQuery] = useState({ scope: resetKey, value: '' })
  const [filterState, setFilter] = useState<{
    scope: Scope
    value: 'all' | ConnectionDirectoryKind
  }>({ scope: resetKey, value: 'all' })
  const [countryState, setCountry] = useState({ scope: resetKey, value: 'IT' })
  const [countryMenuState, setCountryMenu] = useState({ scope: resetKey, open: false })
  const [selection, setSelection] = useState<{ scope: Scope; id: string | null }>({
    scope: resetKey,
    id: null,
  })
  const requestEpoch = useRef(0)
  const scopeRef = useRef(resetKey)
  scopeRef.current = resetKey
  const headingRef = useRef<Text | null>(null)
  const searchRef = useRef<TextInput | null>(null)
  const focusDetail = useRef(false)
  const returnToSearch = useRef(false)

  useEffect(() => {
    const epoch = ++requestEpoch.current
    const abort = new AbortController()
    setState({ scope: resetKey, attempt: reload, value: null, failed: false })
    void api.connectionDirectory(abort.signal).then(
      (value) => {
        if (
          !abort.signal.aborted &&
          requestEpoch.current === epoch &&
          scopeRef.current === resetKey
        )
          setState({ scope: resetKey, attempt: reload, value, failed: false })
      },
      () => {
        if (
          !abort.signal.aborted &&
          requestEpoch.current === epoch &&
          scopeRef.current === resetKey
        )
          setState({ scope: resetKey, attempt: reload, value: null, failed: true })
      },
    )
    return () => {
      abort.abort()
      requestEpoch.current++
    }
  }, [api, resetKey, reload])

  const currentState = state.scope === resetKey && state.attempt === reload
  const directory = currentState ? state.value : null
  const query = queryState.scope === resetKey ? queryState.value : ''
  const filter = filterState.scope === resetKey ? filterState.value : 'all'
  const country =
    countryState.scope === resetKey ? countryState.value : (directory?.country ?? 'IT')
  const countryMenuOpen = countryMenuState.scope === resetKey && countryMenuState.open
  const countries = [
    ...new Set([
      directory?.country ?? 'IT',
      ...((
        directory as (ConnectionDirectoryDto & { readonly countries?: readonly string[] }) | null
      )?.countries ??
        directory?.entries.map(bankServiceCountry) ??
        []),
    ]),
  ]
  const selected =
    selection.scope === resetKey
      ? directory?.entries.find((entry) => entry.id === selection.id)
      : undefined
  const compact = width < 760
  const showingDirectory = !selected || !compact
  const listWidth = selected && !compact ? width - 340 - 24 : width
  const columns = listWidth >= 940 ? 4 : listWidth >= 600 ? 3 : listWidth >= 248 ? 2 : 1
  const tileWidth = (listWidth - (columns - 1) * 8) / columns
  const filtered = filterBankServices(directory?.entries ?? [], query, filter, country)

  useEffect(() => {
    if (selected && focusDetail.current) {
      focusDetail.current = false
      focusWebElement(headingRef.current)
    } else if (!selected && returnToSearch.current) {
      returnToSearch.current = false
      focusWebElement(searchRef.current, true)
    }
  }, [selected])

  const resetSearch = () => {
    setQuery({ scope: resetKey, value: '' })
    setFilter({ scope: resetKey, value: 'all' })
  }
  const select = (entry: ConnectionDirectoryEntry) => {
    focusDetail.current = true
    setSelection({ scope: resetKey, id: entry.id })
  }
  const clearSelection = () => {
    returnToSearch.current = true
    setSelection({ scope: resetKey, id: null })
  }
  const chooseCountry = (value: string) => {
    setCountry({ scope: resetKey, value })
    setCountryMenu({ scope: resetKey, open: false })
    focusDetail.current = false
    returnToSearch.current = false
    setSelection({ scope: resetKey, id: null })
  }
  const serviceKinds = ['bank', 'card', 'wallet'] as const
  const kindLabel = (kind: ConnectionDirectoryKind) =>
    kind === 'bank' ? copy.singularBank : kind === 'card' ? copy.singularCard : copy.singularWallet

  function externalLink(label: string, value: string | null) {
    const url = secureUrl(value)
    if (!url) return null
    if (Platform.OS === 'web')
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label}. ${copy.newWindow}`}
          style={{
            color: c.primary,
            fontFamily: 'GeistMedium',
            fontSize: 13,
            lineHeight: '20px',
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          {label}
        </a>
      )
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={() => void Linking.openURL(url)}
        style={s.linkButton}
      >
        <Text style={s.linkText}>{label}</Text>
      </Pressable>
    )
  }

  function details(entry: ConnectionDirectoryEntry) {
    const available =
      entry.automatic.state === 'available' &&
      directory?.prerequisites.privateAccess === 'ready' &&
      directory.prerequisites.bankProvider === 'ready' &&
      protectedPersonalAccess &&
      !!entry.automatic.institutionId &&
      !!entry.automatic.providerId &&
      !!onSelectConnect
    const automaticCopy =
      entry.automatic.state === 'unsupported'
        ? copy.automaticUnsupported
        : entry.automatic.state === 'unverified'
          ? copy.automaticUnverified
          : available
            ? copy.automaticReady
            : directory?.prerequisites.bankProvider === 'required' && !protectedPersonalAccess
              ? copy.automaticSetup
              : !protectedPersonalAccess || directory?.prerequisites.privateAccess === 'required'
                ? copy.automaticPrivateAccess
                : copy.automaticProviderSetup
    const canImport =
      entry.statement.state !== 'unsupported' &&
      entry.statement.formats.length > 0 &&
      !!onImportStatement
    const statementCopy =
      entry.statement.reason === 'pdf_not_supported'
        ? copy.statementPdf
        : entry.statement.state === 'unsupported'
          ? copy.statementUnsupported
          : entry.statement.state === 'available'
            ? copy.statementReady
            : canImport
              ? copy.statementConditional
              : copy.statementUnknown
    return (
      <View testID="bank-service-detail" style={[s.details, !compact && s.detailsWide]}>
        <Pressable accessibilityRole="button" onPress={clearSelection} style={s.backButton}>
          <Text aria-hidden={true} style={s.backArrow}>
            ←
          </Text>
          <Text style={s.linkText}>{copy.back}</Text>
        </Pressable>
        <View style={s.detailHeading}>
          <BankServiceLogo entryId={entry.id} name={entry.name} theme={theme} detail />
          <View style={s.detailName}>
            <Text ref={headingRef} accessibilityRole="header" aria-level={3} style={s.detailTitle}>
              {entry.name}
            </Text>
            <Text style={s.caption}>
              {kindLabel(entry.kind)} · {bankCountryLabel(bankServiceCountry(entry), locale)}
            </Text>
          </View>
        </View>
        <View style={s.route}>
          <View style={s.routeHeading}>
            <FinanceVisual kind="link" size={28} mode={theme} bare color={c.textSecondary} />
            <Text accessibilityRole="header" aria-level={4} style={s.routeTitle}>
              {copy.automatic}
            </Text>
          </View>
          <Text style={s.body}>{automaticCopy}</Text>
          {available && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (
                  scopeRef.current === resetKey &&
                  entry.automatic.institutionId &&
                  entry.automatic.providerId
                )
                  onSelectConnect?.(entry.automatic.institutionId, entry.automatic.providerId)
              }}
              style={[s.action, s.primaryAction]}
            >
              <Text style={s.primaryActionText}>{copy.connect}</Text>
            </Pressable>
          )}
        </View>
        <View style={s.route}>
          <View style={s.routeHeading}>
            <FinanceVisual kind="card" size={28} mode={theme} bare color={c.textSecondary} />
            <Text accessibilityRole="header" aria-level={4} style={s.routeTitle}>
              {copy.statement}
            </Text>
          </View>
          <Text style={s.body}>{statementCopy}</Text>
          {canImport && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !protectedPersonalAccess }}
                disabled={!protectedPersonalAccess}
                onPress={() => {
                  if (scopeRef.current === resetKey && protectedPersonalAccess)
                    onImportStatement?.(entry.id)
                }}
                style={[s.action, s.secondaryAction, !protectedPersonalAccess && s.disabledAction]}
              >
                <Text style={[s.secondaryActionText, !protectedPersonalAccess && s.caption]}>
                  {entry.statement.state === 'available'
                    ? copy.importStatement
                    : copy.importExistingFile}
                </Text>
              </Pressable>
              {!protectedPersonalAccess && (
                <Text style={s.caption}>{copy.personalAccessRequired}</Text>
              )}
            </>
          )}
          {entry.statement.guideUrl && externalLink(copy.statementGuide, entry.statement.guideUrl)}
        </View>
        {externalLink(copy.officialSite, entry.officialUrl)}
      </View>
    )
  }

  return (
    <View
      testID="bank-connection-picker"
      style={s.root}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View style={s.heading}>
        <FinanceVisual kind="bank" size={64} mode={theme} />
        <View style={s.headingCopy}>
          <Text accessibilityRole="header" aria-level={2} style={s.title}>
            {copy.title}
          </Text>
          <Text style={s.body}>{copy.intro}</Text>
        </View>
      </View>
      {!directory ? (
        <AccessibleStatus style={s.empty} urgent={currentState && state.failed}>
          {currentState && state.failed ? (
            <>
              <Text style={s.body}>{copy.unavailable}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setReload((value) => value + 1)}
                style={[s.action, s.secondaryAction]}
              >
                <Text style={s.secondaryActionText}>{copy.retry}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={c.primary} size="small" />
              <Text style={s.body}>{copy.loading}</Text>
            </>
          )}
        </AccessibleStatus>
      ) : (
        <>
          {showingDirectory && (
            <>
              <View style={s.search}>
                <FinanceVisual kind="search" size={22} mode={theme} bare color={c.textSecondary} />
                <TextInput
                  ref={searchRef}
                  accessibilityLabel={copy.search}
                  placeholder={copy.search}
                  placeholderTextColor={c.textTertiary}
                  value={query}
                  onChangeText={(value) => setQuery({ scope: resetKey, value })}
                  style={s.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={copy.clearSearch}
                    onPress={() => {
                      setQuery({ scope: resetKey, value: '' })
                      focusWebElement(searchRef.current, true)
                    }}
                    style={s.clearSearch}
                  >
                    <Text aria-hidden={true} style={s.clearGlyph}>
                      ×
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={s.controls}>
                <View style={s.countryField}>
                  <Text style={s.caption}>{copy.country}</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      aria-label={copy.country}
                      value={country}
                      onChange={(event) => chooseCountry(event.target.value)}
                      style={{
                        color: c.textPrimary,
                        backgroundColor: c.surface,
                        colorScheme: theme,
                        border: `1px solid ${c.borderStrong}`,
                        borderRadius: 8,
                        fontFamily: 'Geist',
                        fontSize: 14,
                        padding: '0 10px',
                        height: 44,
                        minWidth: 0,
                        width: '100%',
                        flex: 1,
                      }}
                    >
                      {countries.map((code) => (
                        <option key={code} value={code}>
                          {bankCountryLabel(code, locale)}
                        </option>
                      ))}
                      <option value="all">{copy.allCountries}</option>
                    </select>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${copy.country}: ${country === 'all' ? copy.allCountries : bankCountryLabel(country, locale)}`}
                      accessibilityState={{ expanded: countryMenuOpen }}
                      onPress={() => setCountryMenu({ scope: resetKey, open: !countryMenuOpen })}
                      style={s.countryButton}
                    >
                      <Text style={s.countryText}>
                        {country === 'all' ? copy.allCountries : bankCountryLabel(country, locale)}
                      </Text>
                      <Text aria-hidden={true} style={s.caption}>
                        ▾
                      </Text>
                    </Pressable>
                  )}
                </View>
                <View style={s.filters}>
                  {(['all', ...serviceKinds] as const).map((kind) => (
                    <Pressable
                      key={kind}
                      accessibilityRole="button"
                      accessibilityLabel={copy[kind]}
                      accessibilityState={{ selected: filter === kind }}
                      aria-pressed={filter === kind}
                      onPress={() => setFilter({ scope: resetKey, value: kind })}
                      style={[s.filter, filter === kind && s.selectedFilter]}
                    >
                      <Text style={[s.filterText, filter === kind && s.selectedFilterText]}>
                        {copy[kind]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {Platform.OS !== 'web' && countryMenuOpen && (
                <ScrollView style={s.countryMenu}>
                  <View accessibilityRole="radiogroup" accessibilityLabel={copy.country}>
                    {[...countries, 'all'].map((code) => (
                      <Pressable
                        key={code}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: country === code }}
                        onPress={() => chooseCountry(code)}
                        style={[s.countryOption, country === code && s.selectedTile]}
                      >
                        <Text style={s.countryText}>
                          {code === 'all' ? copy.allCountries : bankCountryLabel(code, locale)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
            </>
          )}
          <View style={[s.content, selected && !compact && s.contentWide]}>
            {showingDirectory && (
              <View style={s.directory}>
                {filtered.length === 0 ? (
                  <AccessibleStatus style={s.empty}>
                    <FinanceVisual kind="search" size={48} mode={theme} />
                    <Text accessibilityRole="header" aria-level={3} style={s.routeTitle}>
                      {directory.entries.length ? copy.empty : copy.emptyDirectory}
                    </Text>
                    {directory.entries.length > 0 && (
                      <>
                        <Text style={s.body}>{copy.emptyHelp}</Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={resetSearch}
                          style={s.linkButton}
                        >
                          <Text style={s.linkText}>{copy.clearFilters}</Text>
                        </Pressable>
                      </>
                    )}
                  </AccessibleStatus>
                ) : (
                  serviceKinds.map((kind) => {
                    const entries = filtered.filter((entry) => entry.kind === kind)
                    if (!entries.length) return null
                    return (
                      <View key={kind} style={s.group}>
                        <View style={s.groupHeading}>
                          <FinanceVisual
                            kind={kind}
                            size={24}
                            mode={theme}
                            bare
                            color={c.textSecondary}
                          />
                          <Text accessibilityRole="header" aria-level={3} style={s.groupTitle}>
                            {copy[kind]}
                          </Text>
                          <Text style={s.caption}>{entries.length}</Text>
                        </View>
                        <View style={s.grid}>
                          {entries.map((entry) => (
                            <Pressable
                              key={entry.id}
                              testID={`bank-service-${entry.id}`}
                              accessibilityRole="button"
                              accessibilityLabel={`${entry.name}, ${bankCountryLabel(bankServiceCountry(entry), locale)}`}
                              accessibilityHint={copy.choose}
                              accessibilityState={{ selected: selected?.id === entry.id }}
                              aria-pressed={selected?.id === entry.id}
                              onPress={() => select(entry)}
                              style={({ pressed }) => [
                                s.tile,
                                { width: Math.max(0, tileWidth) },
                                selected?.id === entry.id && s.selectedTile,
                                pressed && s.pressed,
                              ]}
                            >
                              <BankServiceLogo entryId={entry.id} name={entry.name} theme={theme} />
                              <View style={s.bankIdentity}>
                                <Text style={s.bankName}>{entry.name}</Text>
                                <Text style={s.caption}>
                                  {bankCountryLabel(bankServiceCountry(entry), locale)}
                                </Text>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )
                  })
                )}
              </View>
            )}
            {selected && details(selected)}
          </View>
          {!selected && directory.prerequisites.bankProvider === 'required' && (
            <Text style={s.caption}>{copy.publicSetup}</Text>
          )}
        </>
      )}
    </View>
  )
}

function makeStyles(c: typeof colors.light | typeof colors.dark) {
  return StyleSheet.create({
    root: { gap: 20, minWidth: 0 },
    heading: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    headingCopy: { flex: 1, minWidth: 0, gap: 6 },
    title: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: -0.5,
    },
    body: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 14, lineHeight: 21 },
    caption: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 12, lineHeight: 18 },
    search: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      borderBottomColor: c.borderStrong,
      borderBottomWidth: 1,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      height: 48,
      color: c.textPrimary,
      fontFamily: 'Geist',
      fontSize: 15,
      paddingVertical: 12,
    },
    clearSearch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    clearGlyph: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 24, lineHeight: 28 },
    controls: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    countryField: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      width: 250,
      maxWidth: '100%',
    },
    countryButton: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      backgroundColor: c.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    countryText: { color: c.textPrimary, fontFamily: 'Geist', fontSize: 14, lineHeight: 21 },
    countryMenu: { maxHeight: 280, borderWidth: 1, borderColor: c.border, borderRadius: 8 },
    countryOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
    filters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      borderBottomColor: c.border,
      borderBottomWidth: 1,
    },
    filter: {
      minHeight: 44,
      paddingHorizontal: 1,
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    selectedFilter: { borderBottomColor: c.primary },
    filterText: { color: c.textSecondary, fontFamily: 'GeistMedium', fontSize: 13, lineHeight: 20 },
    selectedFilterText: { color: c.primary, fontFamily: 'GeistSemibold' },
    content: { gap: 24, minWidth: 0 },
    contentWide: { flexDirection: 'row', alignItems: 'flex-start' },
    directory: { flex: 1, minWidth: 0, gap: 24 },
    group: { gap: 10 },
    groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    groupTitle: { color: c.textPrimary, fontFamily: 'GeistSemibold', fontSize: 15, lineHeight: 22 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tile: {
      minHeight: 108,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      backgroundColor: c.surface,
      gap: 10,
    },
    selectedTile: { borderColor: c.primary, backgroundColor: c.primarySoft },
    pressed: { opacity: 0.76 },
    bankName: { color: c.textPrimary, fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 20 },
    bankIdentity: { gap: 3 },
    details: { minWidth: 0, gap: 18 },
    detailsWide: {
      width: 340,
      flexShrink: 0,
      paddingLeft: 20,
      borderLeftWidth: 1,
      borderLeftColor: c.border,
    },
    backButton: {
      minHeight: 44,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    backArrow: { color: c.primary, fontFamily: 'Geist', fontSize: 20, lineHeight: 24 },
    detailHeading: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    detailName: { flex: 1, minWidth: 0, gap: 4 },
    detailTitle: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 22,
      lineHeight: 29,
      letterSpacing: -0.4,
    },
    route: { gap: 10, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    routeHeading: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    routeTitle: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 15,
      lineHeight: 22,
      flexShrink: 1,
    },
    action: {
      minHeight: 44,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 8,
      justifyContent: 'center',
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    primaryAction: { backgroundColor: c.primary },
    primaryActionText: {
      color: c.onPrimary,
      fontFamily: 'GeistMedium',
      fontSize: 14,
      lineHeight: 21,
    },
    secondaryAction: { backgroundColor: c.primarySoft },
    secondaryActionText: {
      color: c.primary,
      fontFamily: 'GeistMedium',
      fontSize: 14,
      lineHeight: 21,
    },
    disabledAction: { backgroundColor: c.background },
    linkButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
    linkText: { color: c.primary, fontFamily: 'GeistMedium', fontSize: 13, lineHeight: 20 },
    empty: { gap: 10, paddingVertical: 24, alignItems: 'flex-start' },
  })
}
