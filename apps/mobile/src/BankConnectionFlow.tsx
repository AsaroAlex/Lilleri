import type { ApiClient, ConnectionDirectoryEntry } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { AccessibleStatus } from './accessibility/AccessibilityPrimitives'
import { focusWebElement } from './accessibility/web-focus'
import { BankServiceLogo } from './BankServiceLogo'
import { bankConnectionFlowCopy } from './i18n/bank-connection-flow-messages'
import { bankCountryLabel } from './i18n/bank-picker-messages'
import { useI18n } from './i18n/context'

export interface BankConnectionFlowProps {
  readonly api: Pick<ApiClient, 'connectionCheck'>
  readonly entry: ConnectionDirectoryEntry
  readonly theme: BrandTheme
  readonly resetKey: string | number
  readonly protectedPersonalAccess: boolean
  readonly onBack: () => void
  readonly onSignIn?: () => void
  readonly onImportStatement?: (entryId: string) => void
  readonly onManualAccount?: (entryId: string) => void
  readonly onSelectConnect?: (institutionId: string, providerId: string) => void
}

type ConnectionCheck = Awaited<ReturnType<ApiClient['connectionCheck']>>
interface CheckState {
  readonly scope: BankConnectionFlowProps['resetKey']
  readonly entryId: string
  readonly attempt: number
  readonly value: ConnectionCheck | null
  readonly failed: boolean
}

/** Reads current connection support; only a separate user gesture can start authorisation. */
export function BankConnectionFlow({
  api,
  entry,
  theme,
  resetKey,
  protectedPersonalAccess,
  onBack,
  onSignIn,
  onImportStatement,
  onManualAccount,
  onSelectConnect,
}: BankConnectionFlowProps) {
  const { locale } = useI18n()
  const copy = useMemo(() => bankConnectionFlowCopy(locale), [locale])
  const c = colors[theme]
  const s = useMemo(() => makeStyles(c), [c])
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<CheckState>({
    scope: resetKey,
    entryId: entry.id,
    attempt: 0,
    value: null,
    failed: false,
  })
  const requestEpoch = useRef(0)
  const context = useRef({ scope: resetKey, entryId: entry.id, attempt, protectedPersonalAccess })
  context.current = { scope: resetKey, entryId: entry.id, attempt, protectedPersonalAccess }
  const heading = useRef<Text | null>(null)

  useEffect(() => {
    const epoch = ++requestEpoch.current
    const abort = new AbortController()
    const current = () =>
      !abort.signal.aborted &&
      requestEpoch.current === epoch &&
      context.current.scope === resetKey &&
      context.current.entryId === entry.id &&
      context.current.attempt === attempt
    setState({ scope: resetKey, entryId: entry.id, attempt, value: null, failed: false })
    void api.connectionCheck(entry.id, abort.signal).then(
      (value) => {
        if (!current()) return
        setState({
          scope: resetKey,
          entryId: entry.id,
          attempt,
          value: value.entry.id === entry.id ? value : null,
          failed: value.entry.id !== entry.id,
        })
      },
      () => {
        if (current())
          setState({ scope: resetKey, entryId: entry.id, attempt, value: null, failed: true })
      },
    )
    return () => {
      abort.abort()
      requestEpoch.current++
    }
  }, [api, entry.id, resetKey, attempt])

  useEffect(() => {
    if (context.current.scope === resetKey && context.current.entryId === entry.id)
      focusWebElement(heading.current)
  }, [entry.id, resetKey])

  const currentState =
    state.scope === resetKey && state.entryId === entry.id && state.attempt === attempt
  const check = currentState ? state.value : null
  const failed = currentState && state.failed
  const loading = !check && !failed
  const checkedEntry = check?.entry ?? entry
  const automatic = check?.entry.automatic
  const ready =
    automatic?.state === 'available' &&
    check?.prerequisites.privateAccess === 'ready' &&
    check.prerequisites.bankProvider === 'ready' &&
    protectedPersonalAccess &&
    !!automatic.institutionId &&
    !!automatic.providerId &&
    !!onSelectConnect
  const unsupported = automatic?.state === 'unsupported'
  const unverified = automatic?.state === 'unverified'
  const canSignIn =
    !!check &&
    !unsupported &&
    !unverified &&
    check.prerequisites.privateAccess === 'ready' &&
    !protectedPersonalAccess &&
    !!onSignIn
  const needsSignIn = canSignIn && check?.prerequisites.bankProvider === 'ready'
  const canImport =
    !!check &&
    protectedPersonalAccess &&
    check.entry.statement.state !== 'unsupported' &&
    check.entry.statement.formats.length > 0 &&
    !!onImportStatement
  const canAddManual = !!check && protectedPersonalAccess && !!onManualAccount
  const title = loading
    ? copy.checkingTitle
    : failed
      ? copy.failedTitle
      : unsupported
        ? copy.unsupportedTitle
        : unverified
          ? copy.unverifiedTitle
          : ready
            ? copy.readyTitle
            : needsSignIn
              ? copy.signInTitle
              : copy.activationTitle
  const explanation = failed
    ? copy.failedHelp
    : unsupported
      ? copy.unsupportedHelp
      : unverified
        ? copy.unverifiedHelp
        : ready
          ? copy.readyHelp
          : needsSignIn
            ? copy.signInHelp
            : copy.activationHelp
  const isCurrent = () =>
    context.current.scope === resetKey &&
    context.current.entryId === entry.id &&
    context.current.attempt === attempt &&
    context.current.protectedPersonalAccess === protectedPersonalAccess

  return (
    <View testID="bank-connection-flow" style={s.container}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (isCurrent()) onBack()
        }}
        style={s.back}
      >
        <Text aria-hidden={true} style={s.backArrow}>
          ←
        </Text>
        <Text style={s.linkText}>{copy.back}</Text>
      </Pressable>
      <View style={s.serviceHeading}>
        <BankServiceLogo entryId={checkedEntry.id} name={checkedEntry.name} theme={theme} detail />
        <View style={s.serviceName}>
          <Text style={s.name}>{checkedEntry.name}</Text>
          <Text style={s.caption}>{bankCountryLabel(checkedEntry.countryCode, locale)}</Text>
        </View>
      </View>
      <Text ref={heading} accessibilityRole="header" aria-level={2} style={s.title}>
        {title}
      </Text>
      {loading ? (
        <AccessibleStatus style={s.loading}>
          <ActivityIndicator color={c.primary} />
          <Text style={s.body}>{copy.checking}</Text>
        </AccessibleStatus>
      ) : (
        <>
          <AccessibleStatus urgent={failed}>
            <Text style={s.body}>{explanation}</Text>
          </AccessibleStatus>
          <View style={s.actions}>
            {ready && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (isCurrent() && ready && automatic?.institutionId && automatic.providerId)
                    onSelectConnect?.(automatic.institutionId, automatic.providerId)
                }}
                style={[s.button, s.primaryButton]}
              >
                <Text style={s.primaryText}>{copy.continueInBank}</Text>
              </Pressable>
            )}
            {canSignIn && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (isCurrent() && canSignIn) onSignIn?.()
                }}
                style={[s.button, s.primaryButton]}
              >
                <Text style={s.primaryText}>{copy.signIn}</Text>
              </Pressable>
            )}
            {!ready && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (isCurrent()) setAttempt((value) => value + 1)
                }}
                style={[s.button, s.secondaryButton]}
              >
                <Text style={s.linkText}>{copy.retry}</Text>
              </Pressable>
            )}
          </View>
          {(canImport || canAddManual) && (
            <View style={s.alternatives}>
              <Text accessibilityRole="header" aria-level={3} style={s.alternativeTitle}>
                {copy.alternatives}
              </Text>
              {canImport && (
                <>
                  <Text style={s.caption}>{copy.importHelp}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (isCurrent() && canImport) onImportStatement?.(checkedEntry.id)
                    }}
                    style={s.alternativeAction}
                  >
                    <Text style={s.linkText}>{copy.importStatement}</Text>
                  </Pressable>
                </>
              )}
              {canAddManual && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (isCurrent() && canAddManual) onManualAccount?.(checkedEntry.id)
                  }}
                  style={s.alternativeAction}
                >
                  <Text style={s.linkText}>{copy.manualAccount}</Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}
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
    body: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 15, lineHeight: 23 },
    caption: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 13, lineHeight: 20 },
    loading: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    button: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButton: { backgroundColor: c.primary },
    secondaryButton: { borderWidth: 1, borderColor: c.borderStrong },
    primaryText: { color: c.onPrimary, fontFamily: 'GeistSemibold', fontSize: 14, lineHeight: 20 },
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
