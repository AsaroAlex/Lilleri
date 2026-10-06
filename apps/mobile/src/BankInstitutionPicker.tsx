import type {
  ApiClient,
  BankInstitutionDto,
  BankInstitutionsDto,
  ConnectionDirectoryEntry,
} from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
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
import { AccessibleStatus } from './accessibility/AccessibilityPrimitives'
import { focusWebElement } from './accessibility/web-focus'
import { BankServiceLogo } from './BankServiceLogo'
import { matchesBankService } from './bank-directory-search'
import { BANK_RETURN_TARGET, openBankAuthorization } from './bank-session'
import {
  BANK_AUTHORIZATION_PROBLEM_MESSAGES,
  type BankAuthorizationProblem,
  bankAuthorizationLanguage,
  bankAuthorizationProblem,
  consentDays,
  normaliseBankInstitutions,
} from './hosted-flows'
import { bankCountryLabel } from './i18n/bank-picker-messages'
import { useI18n } from './i18n/context'

/** Real bank authorisation is available to a signed-in hosted profile only. */
export interface BankAuthorizationRoute {
  /** Opens the subscription screen from the Plus explanation. */
  readonly onOpenPlus: () => void
  /** Parent identity handling for session loss; true means the failure was handled. */
  readonly onError?: (cause: unknown) => boolean
}
export interface BankInstitutionPickerProps {
  readonly api: Pick<ApiClient, 'bankInstitutions' | 'startBankAuthorization'>
  readonly entry: ConnectionDirectoryEntry
  readonly theme: BrandTheme
  /** A profile/session change invalidates the list, the choice and any pending authorisation. */
  readonly resetKey: string | number
  readonly route: BankAuthorizationRoute
  readonly onBack: () => void
  readonly onImportStatement?: (entryId: string) => void
  readonly onManualAccount?: (entryId: string) => void
}
interface LoadState {
  readonly key: string
  readonly value: BankInstitutionsDto | null
  readonly failed: boolean
}
type Blocked = 'plus_required' | 'capacity_reached' | 'provider_not_configured'
type Problem =
  | { readonly kind: Exclude<BankAuthorizationProblem, 'unknown'> | 'unsafe_redirect' }
  | { readonly kind: 'unknown'; readonly code: string | null }
const RESULT_LIMIT = 60
const blocking = (value: BankAuthorizationProblem): value is Blocked =>
  value === 'plus_required' || value === 'capacity_reached' || value === 'provider_not_configured'

/**
 * The user explicitly picks the exact provider institution and reviews what is shared before the
 * window leaves for the bank. Nothing is selected automatically, even when only one name matches.
 */
export function BankInstitutionPicker({
  api,
  entry,
  theme,
  resetKey,
  route,
  onBack,
  onImportStatement,
  onManualAccount,
}: BankInstitutionPickerProps) {
  const i18n = useI18n()
  const { t, locale } = i18n
  const c = colors[theme]
  const s = useMemo(() => makeStyles(c), [c])
  const [attempt, setAttempt] = useState(0)
  const loadKey = `${String(resetKey)}:${entry.id}:${entry.countryCode}:${attempt}`
  const [load, setLoad] = useState<LoadState>({ key: loadKey, value: null, failed: false })
  const [query, setQuery] = useState(entry.name)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [step, setStep] = useState<'choose' | 'review'>('choose')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)
  const routeRef = useRef(route)
  routeRef.current = route
  const current = useRef(loadKey)
  current.current = loadKey
  const mounted = useRef(true)
  const heading = useRef<Text | null>(null)
  const searchRef = useRef<TextInput | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    const abort = new AbortController()
    const key = `${String(resetKey)}:${entry.id}:${entry.countryCode}:${attempt}`
    setLoad({ key, value: null, failed: false })
    void api.bankInstitutions(entry.countryCode, abort.signal).then(
      (value) => {
        if (abort.signal.aborted || current.current !== key) return
        const usable = normaliseBankInstitutions(value, entry.countryCode)
        setLoad({ key, value: usable, failed: usable === null })
      },
      (cause: unknown) => {
        if (abort.signal.aborted || current.current !== key || routeRef.current.onError?.(cause))
          return
        setLoad({ key, value: null, failed: true })
      },
    )
    return () => abort.abort()
  }, [api, entry.id, entry.countryCode, attempt, resetKey])
  // A page restored from the browser's back cache must not stay locked in "leaving".
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted && mounted.current) setBusy(false)
    }
    window.addEventListener('pageshow', restored)
    return () => window.removeEventListener('pageshow', restored)
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Each step change moves focus to the step heading.
  useEffect(() => {
    if (mounted.current) focusWebElement(heading.current, true)
  }, [step])

  const catalogue = load.key === loadKey ? load.value : null
  const failed = load.key === loadKey && load.failed
  const loading = !catalogue && !failed
  const postBlocked = problem && problem.kind !== 'unknown' && problem.kind !== 'unsafe_redirect'
  const blocked: Blocked | null =
    postBlocked && blocking(problem.kind)
      ? problem.kind
      : catalogue && !catalogue.available
        ? (catalogue.reason ?? 'provider_not_configured')
        : null
  const institutions = catalogue?.institutions ?? []
  const selectable = !!catalogue && catalogue.available && !blocked
  const noInstitutions = !!catalogue && !blocked && institutions.length === 0
  const matches = useMemo(
    () =>
      institutions.filter((item) => matchesBankService({ name: item.name, aliases: [] }, query)),
    [institutions, query],
  )
  const visible = matches.slice(0, RESULT_LIMIT)
  const selected = institutions.find((item) => item.id === selectedId) ?? null
  const reviewing = step === 'review' && !!selected && selectable
  const showList =
    institutions.length > 0 &&
    (selectable || blocked === 'plus_required' || blocked === 'capacity_reached')
  const showFallbacks =
    !reviewing &&
    (failed || noInstitutions || !!blocked) &&
    !!(onImportStatement || onManualAccount)
  const countryName = bankCountryLabel(entry.countryCode, locale)
  const title = reviewing
    ? t('bankInstitutions.reviewTitle')
    : blocked === 'plus_required'
      ? t('bankInstitutions.plusTitle')
      : blocked === 'capacity_reached'
        ? t('bankInstitutions.capacityTitle')
        : blocked
          ? t('bankConnectionFlow.activationTitle')
          : noInstitutions
            ? t('bankInstitutions.countryUnavailableTitle')
            : t('bankInstitutions.title')
  const problemText =
    !problem || (postBlocked && blocking(problem.kind))
      ? null
      : problem.kind === 'unsafe_redirect'
        ? t('bankInstitutions.unsafeRedirect')
        : problem.kind === 'unknown'
          ? i18n.problemMessage(problem.code ?? '')
          : t(BANK_AUTHORIZATION_PROBLEM_MESSAGES[problem.kind])

  const choose = (institution: BankInstitutionDto) => {
    if (busy || !selectable) return
    setProblem(null)
    setSelectedId(institution.id)
  }
  const review = () => {
    if (!selected || busy || !selectable) return
    setProblem(null)
    setStep('review')
  }
  const backToChoice = () => {
    if (busy) return
    setProblem(null)
    setStep('choose')
  }
  const confirm = async () => {
    if (!selected || busy || !selectable) return
    const key = loadKey
    setBusy(true)
    setProblem(null)
    try {
      const result = await api.startBankAuthorization({
        institutionId: selected.id,
        language: bankAuthorizationLanguage(locale),
        returnTo: BANK_RETURN_TARGET,
      })
      if (!mounted.current || current.current !== key) return
      const outcome = await openBankAuthorization(result?.url)
      if (outcome === 'left') return
      if (outcome === 'blocked') setProblem({ kind: 'unsafe_redirect' })
    } catch (cause) {
      if (!mounted.current || current.current !== key || routeRef.current.onError?.(cause)) return
      const next = bankAuthorizationProblem(cause)
      if (blocking(next)) setStep('choose')
      setProblem(
        next === 'unknown'
          ? {
              kind: 'unknown',
              code:
                cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : null,
            }
          : { kind: next },
      )
    }
    if (mounted.current && current.current === key) setBusy(false)
  }

  const fallbackActions = showFallbacks && (
    <View style={s.alternatives}>
      <Text accessibilityRole="header" aria-level={3} style={s.alternativeTitle}>
        {t('bankConnectionFlow.alternatives')}
      </Text>
      {onImportStatement && (
        <>
          <Text style={s.caption}>{t('bankConnectionFlow.importHelp')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onImportStatement(entry.id)}
            style={s.alternativeAction}
          >
            <Text style={s.linkText}>{t('bankConnectionFlow.importStatement')}</Text>
          </Pressable>
        </>
      )}
      {onManualAccount && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onManualAccount(entry.id)}
          style={s.alternativeAction}
        >
          <Text style={s.linkText}>{t('bankConnectionFlow.manualAccount')}</Text>
        </Pressable>
      )}
    </View>
  )

  return (
    <View testID="bank-institution-picker" style={s.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        aria-disabled={busy}
        disabled={busy}
        onPress={() => (reviewing ? backToChoice() : onBack())}
        style={s.back}
      >
        <Text aria-hidden={true} style={s.backArrow}>
          ←
        </Text>
        <Text style={s.linkText}>{t('bankInstitutions.back')}</Text>
      </Pressable>
      <View style={s.serviceHeading}>
        <BankServiceLogo entryId={entry.id} name={entry.name} theme={theme} detail />
        <View style={s.serviceName}>
          <Text
            nativeID="lilleri-bank-heading"
            accessibilityRole="header"
            aria-level={1}
            style={s.name}
          >
            {entry.name}
          </Text>
          <Text style={s.caption}>{countryName}</Text>
        </View>
      </View>
      <Text ref={heading} accessibilityRole="header" aria-level={2} style={s.title}>
        {title}
      </Text>
      {reviewing ? (
        <View style={s.section}>
          <Text style={s.strong}>
            {t('bankInstitutions.reviewSelected', { name: selected.name })}
          </Text>
          <View style={s.trust}>
            {(
              [
                t('bankInstitutions.trustReads'),
                t('bankInstitutions.trustNoMoney'),
                t('bankInstitutions.trustCredentials'),
                t('bankInstitutions.trustProvider'),
                t('bankInstitutions.trustDuration', {
                  days: consentDays(selected.maximumConsentDays),
                }),
              ] as const
            ).map((line) => (
              <View key={line} style={s.trustRow}>
                <Text aria-hidden={true} style={s.trustMark}>
                  ✓
                </Text>
                <Text style={s.body}>{line}</Text>
              </View>
            ))}
          </View>
          {problemText && (
            <AccessibleStatus urgent>
              <Text style={s.error}>{problemText}</Text>
            </AccessibleStatus>
          )}
          {busy && (
            <AccessibleStatus style={s.inline}>
              <ActivityIndicator color={c.primary} size="small" />
              <Text style={s.body}>{t('bankInstitutions.redirecting')}</Text>
            </AccessibleStatus>
          )}
          <View style={s.actions}>
            <Pressable
              testID="bank-authorization-confirm"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              aria-disabled={busy}
              disabled={busy}
              onPress={() => void confirm()}
              style={[s.button, s.primaryButton, busy && s.disabled]}
            >
              <Text style={s.primaryText}>
                {t('bankInstitutions.confirm', { name: selected.name })}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              aria-disabled={busy}
              disabled={busy}
              onPress={backToChoice}
              style={[s.button, s.secondaryButton, busy && s.disabled]}
            >
              <Text style={s.linkText}>{t('bankInstitutions.otherBank')}</Text>
            </Pressable>
          </View>
        </View>
      ) : loading ? (
        <AccessibleStatus style={s.inline}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.body}>{t('bankInstitutions.loading')}</Text>
        </AccessibleStatus>
      ) : failed ? (
        <AccessibleStatus urgent style={s.section}>
          <Text style={s.body}>{t('bankInstitutions.loadFailed')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAttempt((value) => value + 1)}
            style={[s.button, s.secondaryButton]}
          >
            <Text style={s.linkText}>{t('bankInstitutions.retry')}</Text>
          </Pressable>
        </AccessibleStatus>
      ) : (
        <View style={s.section}>
          {blocked === 'plus_required' ? (
            <AccessibleStatus style={s.section}>
              <Text style={s.body}>{t('bankInstitutions.plusHelp')}</Text>
              <Pressable
                testID="bank-plus-upsell"
                accessibilityRole="button"
                onPress={() => route.onOpenPlus()}
                style={[s.button, s.primaryButton]}
              >
                <Text style={s.primaryText}>{t('bankInstitutions.plusAction')}</Text>
              </Pressable>
              {institutions.length > 0 && (
                <Text style={s.caption}>{t('bankInstitutions.listReadOnly')}</Text>
              )}
            </AccessibleStatus>
          ) : blocked === 'capacity_reached' ? (
            <AccessibleStatus>
              <Text style={s.body}>{t('bankInstitutions.capacityHelp')}</Text>
            </AccessibleStatus>
          ) : blocked ? (
            <AccessibleStatus>
              <Text style={s.body}>{t('bankConnectionFlow.activationHelp')}</Text>
            </AccessibleStatus>
          ) : noInstitutions ? (
            <AccessibleStatus>
              <Text style={s.body}>
                {t('bankInstitutions.countryUnavailable', { country: countryName })}
              </Text>
            </AccessibleStatus>
          ) : (
            <Text style={s.body}>{t('bankInstitutions.intro')}</Text>
          )}
          {showList && (
            <>
              <View style={s.search}>
                <TextInput
                  ref={searchRef}
                  accessibilityLabel={t('bankInstitutions.search')}
                  placeholder={t('bankInstitutions.search')}
                  placeholderTextColor={c.textTertiary}
                  value={query}
                  onChangeText={setQuery}
                  editable={!busy}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  style={s.searchInput}
                />
                {query.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('bankInstitutions.clearSearch')}
                    onPress={() => {
                      setQuery('')
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
              <AccessibleStatus>
                <Text style={s.caption}>
                  {t('bankInstitutions.resultCount', { count: matches.length })}
                  {matches.length > visible.length
                    ? ` ${t('bankInstitutions.moreResults', { shown: visible.length, count: matches.length })}`
                    : ''}
                </Text>
                {matches.length === 0 && (
                  <Text style={s.caption}>{t('bankInstitutions.noMatchHelp')}</Text>
                )}
              </AccessibleStatus>
              {selectable ? (
                <View
                  role="radiogroup"
                  accessibilityLabel={t('bankInstitutions.listLabel')}
                  style={s.list}
                >
                  {visible.map((item) => {
                    const checked = item.id === selectedId
                    return (
                      <Pressable
                        key={item.id}
                        testID={`bank-institution-${item.id}`}
                        accessibilityRole="radio"
                        accessibilityLabel={
                          item.beta
                            ? t('bankInstitutions.optionNew', { name: item.name })
                            : item.name
                        }
                        accessibilityState={{ checked, disabled: busy }}
                        aria-checked={checked}
                        aria-disabled={busy}
                        disabled={busy}
                        onPress={() => choose(item)}
                        style={({ pressed }) => [
                          s.option,
                          checked && s.selectedOption,
                          pressed && s.pressed,
                        ]}
                      >
                        <Text aria-hidden={true} style={[s.radio, checked && s.radioChecked]}>
                          {checked ? '●' : '○'}
                        </Text>
                        <View style={s.optionCopy}>
                          <Text style={[s.optionName, checked && s.selectedText]}>{item.name}</Text>
                          {item.beta && (
                            <Text style={s.badge}>{t('bankInstitutions.newIntegration')}</Text>
                          )}
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              ) : (
                <View accessibilityLabel={t('bankInstitutions.listLabel')} style={s.list}>
                  {visible.map((item) => (
                    <View key={item.id} style={[s.option, s.readOnlyOption]}>
                      <View style={s.optionCopy}>
                        <Text style={s.optionName}>{item.name}</Text>
                        {item.beta && (
                          <Text style={s.badge}>{t('bankInstitutions.newIntegration')}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {selectable &&
                (selected ? (
                  <Pressable
                    testID="bank-institution-continue"
                    accessibilityRole="button"
                    onPress={review}
                    style={[s.button, s.primaryButton]}
                  >
                    <Text style={s.primaryText}>
                      {t('bankInstitutions.continue', { name: selected.name })}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={s.caption}>{t('bankInstitutions.chooseFirst')}</Text>
                ))}
            </>
          )}
          {problemText && (
            <AccessibleStatus urgent>
              <Text style={s.error}>{problemText}</Text>
            </AccessibleStatus>
          )}
        </View>
      )}
      {fallbackActions}
    </View>
  )
}

function makeStyles(c: (typeof colors)['light'] | (typeof colors)['dark']) {
  return StyleSheet.create({
    container: { gap: 16, minWidth: 0, maxWidth: 620, width: '100%' },
    back: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
    },
    backArrow: { color: c.primary, fontSize: 22, lineHeight: 24 },
    serviceHeading: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    serviceName: { flex: 1, minWidth: 0, gap: 3 },
    name: { color: c.textPrimary, fontFamily: 'GeistSemibold', fontSize: 22, lineHeight: 28 },
    title: { color: c.textPrimary, fontFamily: 'GeistSemibold', fontSize: 24, lineHeight: 30 },
    section: { gap: 12, minWidth: 0 },
    body: {
      color: c.textSecondary,
      fontFamily: 'Geist',
      fontSize: 15,
      lineHeight: 23,
      flexShrink: 1,
    },
    strong: { color: c.textPrimary, fontFamily: 'GeistSemibold', fontSize: 15, lineHeight: 23 },
    caption: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 13, lineHeight: 20 },
    error: { color: c.danger, fontFamily: 'Geist', fontSize: 15, lineHeight: 23 },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
    search: {
      flexDirection: 'row',
      gap: 8,
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
      fontSize: 16,
      paddingVertical: 12,
    },
    clearSearch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    clearGlyph: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 24, lineHeight: 28 },
    list: { gap: 8, minWidth: 0 },
    option: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      backgroundColor: c.surface,
    },
    readOnlyOption: { minHeight: 44 },
    selectedOption: { borderColor: c.primary, backgroundColor: c.primarySoft },
    pressed: { opacity: 0.76 },
    radio: { color: c.textSecondary, fontSize: 18, lineHeight: 22, width: 20 },
    radioChecked: { color: c.primary },
    optionCopy: { flex: 1, minWidth: 0, gap: 4 },
    optionName: { color: c.textPrimary, fontFamily: 'GeistMedium', fontSize: 15, lineHeight: 22 },
    selectedText: { color: c.primary },
    badge: {
      alignSelf: 'flex-start',
      color: c.textSecondary,
      backgroundColor: c.background,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      fontFamily: 'GeistMedium',
      fontSize: 12,
      lineHeight: 18,
    },
    trust: {
      gap: 10,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    trustRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    trustMark: { color: c.success, fontSize: 16, lineHeight: 23, width: 18 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    button: {
      minHeight: 44,
      maxWidth: '100%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    primaryButton: { backgroundColor: c.primary },
    secondaryButton: { borderWidth: 1, borderColor: c.borderStrong },
    disabled: { opacity: 0.5 },
    primaryText: {
      color: c.onPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    linkText: { color: c.primary, fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 20 },
    alternatives: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 20,
      marginTop: 4,
      gap: 8,
    },
    alternativeTitle: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 16,
      lineHeight: 23,
    },
    alternativeAction: {
      minHeight: 44,
      paddingVertical: 12,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
  })
}
