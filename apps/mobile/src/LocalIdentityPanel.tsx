import { ApiError } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { AccessibleDialog, AccessibleStatus } from './accessibility/AccessibilityPrimitives'
import { useI18n } from './i18n/context'
import {
  createHostedIdentityClient,
  createLocalIdentityClient,
  type LocalIdentitySession,
  type LocalPasskeyRecord,
  type LocalSessionRecord,
} from './identity-client'
import { consumeIdentityRecoveryLocation } from './identity-recovery'

export type LocalIdentityChangeReason = 'signed-out' | 'session-renewed' | 'identity-changed'

interface Props {
  readonly baseUrl: string
  readonly hostedIdentity?: {
    readonly termsVersion: string
    readonly termsUrl: string
    /** Optional published privacy notice, shown next to the terms when sign-up is offered. */
    readonly privacyUrl?: string
  }
  readonly theme: BrandTheme
  readonly visible?: boolean
  readonly reauthenticationRequested?: boolean
  /** Increment when a financial request reports a revoked or expired session. */
  readonly sessionLostVersion?: number
  readonly onSignedIn: (session: LocalIdentitySession) => Promise<void> | void
  readonly onSignedOut: (reason: LocalIdentityChangeReason) => void
  readonly onReauthenticated: () => void
}
interface Setup {
  readonly totpURI: string
  readonly backupCodes: readonly string[]
}
/** Local browser authentication; native passkeys and biometrics need device validation. */
export function LocalIdentityPanel({
  baseUrl,
  hostedIdentity,
  theme,
  visible = true,
  reauthenticationRequested = false,
  sessionLostVersion = 0,
  onSignedIn,
  onSignedOut,
  onReauthenticated,
}: Props) {
  const i18n = useI18n()
  const language = useRef(i18n)
  language.current = i18n
  const t = i18n.t
  const date = i18n.instant
  const privacyUrl = hostedIdentity?.privacyUrl
  const client = useMemo(
      () =>
        hostedIdentity
          ? createHostedIdentityClient(baseUrl, {
              termsVersion: hostedIdentity.termsVersion,
              termsUrl: hostedIdentity.termsUrl,
              browserOrigin: typeof window === 'undefined' ? baseUrl : window.location.origin,
            })
          : createLocalIdentityClient(baseUrl),
      [baseUrl, hostedIdentity],
    ),
    c = colors[theme],
    s = useMemo(() => styles(c), [c])
  const [incomingRecovery] = useState(() =>
    hostedIdentity && typeof window !== 'undefined'
      ? consumeIdentityRecoveryLocation(window.location.href, (url) =>
          window.history.replaceState(window.history.state, '', url),
        )
      : { token: null, invalid: false },
  )
  const [recoveryToken, setRecoveryToken] = useState(incomingRecovery.token),
    [confirmationPassword, setConfirmationPassword] = useState('')
  const [session, setSession] = useState<LocalIdentitySession | null>(null),
    [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null),
    [mode, setMode] = useState<'signin' | 'signup' | 'recover' | 'reset'>(
      incomingRecovery.token ? 'reset' : incomingRecovery.invalid ? 'recover' : 'signin',
    ),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [adultAttested, setAdultAttested] = useState(false),
    [termsAccepted, setTermsAccepted] = useState(false),
    [secondFactorPending, setSecondFactorPending] = useState(false),
    [code, setCode] = useState(''),
    [backupMode, setBackupMode] = useState(false),
    [showSecurity, setShowSecurity] = useState(false),
    [sessions, setSessions] = useState<readonly LocalSessionRecord[]>([]),
    [passkeys, setPasskeys] = useState<readonly LocalPasskeyRecord[]>([]),
    [setup, setSetup] = useState<Setup | null>(null),
    [backupsSaved, setBackupsSaved] = useState(false),
    [reauthVisible, setReauthVisible] = useState(false),
    [revokeAllConfirmation, setRevokeAllConfirmation] = useState(false)
  const callbacks = useRef({ onSignedIn, onSignedOut, onReauthenticated }),
    sessionRef = useRef<LocalIdentitySession | null>(null),
    identityEpoch = useRef(0),
    sessionRequest = useRef(0),
    secretEpoch = useRef(0),
    forceSignedOut = useRef(false),
    channel = useRef<BroadcastChannel | null>(null),
    lostVersion = useRef(sessionLostVersion)
  callbacks.current = { onSignedIn, onSignedOut, onReauthenticated }
  const renderedIdentityEpoch = identityEpoch.current
  const clearSecrets = useCallback(() => {
    secretEpoch.current += 1
    setPassword('')
    setConfirmationPassword('')
    setCode('')
    setSetup(null)
    setBackupsSaved(false)
  }, [])
  const clearIdentity = useCallback(() => {
    identityEpoch.current += 1
    forceSignedOut.current = true
    sessionRef.current = null
    setSession(null)
    setSessions([])
    setPasskeys([])
    setSecondFactorPending(false)
    setShowSecurity(false)
    setReauthVisible(false)
    setRevokeAllConfirmation(false)
    setMode('signin')
    setRecoveryToken(null)
    setName('')
    setEmail('')
    setAdultAttested(false)
    setTermsAccepted(false)
    setBackupMode(false)
    clearSecrets()
    callbacks.current.onSignedOut('signed-out')
  }, [clearSecrets])
  const refreshSession = useCallback(
    async (explicitSignIn = false, expectedEpoch = identityEpoch.current) => {
      if (forceSignedOut.current && !explicitSignIn) return null
      const requestNumber = ++sessionRequest.current
      const next = await client.session()
      if (requestNumber !== sessionRequest.current) return null
      if (expectedEpoch !== identityEpoch.current) return null
      if (forceSignedOut.current && !explicitSignIn) return null
      if (!next) {
        clearIdentity()
        return null
      }
      const previous = sessionRef.current
      const changed =
        previous?.principal.userId !== next.principal.userId ||
        previous?.principal.sessionId !== next.principal.sessionId ||
        previous?.principal.profileId !== next.principal.profileId ||
        previous?.principal.role !== next.principal.role
      if (previous && changed) {
        const renewed =
          previous.principal.userId === next.principal.userId &&
          previous.principal.profileId === next.principal.profileId &&
          previous.principal.role === next.principal.role
        // A financial epoch in App cannot invalidate this panel's own pending
        // credential/setup reads. Fence them before installing the new session.
        identityEpoch.current += 1
        clearSecrets()
        setSessions([])
        setPasskeys([])
        setSecondFactorPending(false)
        setRevokeAllConfirmation(false)
        setError(null)
        setNotice(null)
        if (!renewed) {
          setShowSecurity(false)
          setReauthVisible(false)
        }
        callbacks.current.onSignedOut(renewed ? 'session-renewed' : 'identity-changed')
      }
      const installedEpoch = identityEpoch.current
      forceSignedOut.current = false
      sessionRef.current = next
      setSession(next)
      if (changed) await callbacks.current.onSignedIn(next)
      if (installedEpoch !== identityEpoch.current) return null
      if (explicitSignIn) channel.current?.postMessage('sessions-changed')
      return next
    },
    [client, clearIdentity, clearSecrets],
  )
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setChecking(false)
      callbacks.current.onSignedOut('signed-out')
      return
    }
    identityEpoch.current += 1
    if (incomingRecovery.token || incomingRecovery.invalid) {
      forceSignedOut.current = true
      callbacks.current.onSignedOut('signed-out')
      if (incomingRecovery.invalid) setError(language.current.t('identityPanel.invalidRecovery'))
      setChecking(false)
      return
    }
    forceSignedOut.current = false
    let cancelled = false
    refreshSession()
      .catch(() => {
        if (!cancelled) setError(language.current.t('identityPanel.checkFailed'))
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshSession, incomingRecovery])
  useEffect(() => {
    if (lostVersion.current !== sessionLostVersion) {
      lostVersion.current = sessionLostVersion
      clearIdentity()
      // Only a locally observed invalidation is broadcast. Receiving this
      // message calls clearIdentity directly and never echoes it to other tabs.
      channel.current?.postMessage('signed-out')
      setError(language.current.t('identityPanel.ended'))
    }
  }, [sessionLostVersion, clearIdentity])
  useEffect(() => {
    if (reauthenticationRequested) {
      clearSecrets()
      setReauthVisible(true)
      setShowSecurity(true)
      setNotice(null)
    }
  }, [reauthenticationRequested, clearSecrets])
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const check = () => {
      refreshSession().catch(() => setError(language.current.t('identityPanel.checkFailed')))
    }
    const visible = () => {
      if (document.visibilityState === 'visible') check()
    }
    const interval = setInterval(check, 30_000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', visible)
    if (typeof BroadcastChannel !== 'undefined') {
      const opened = new BroadcastChannel(`lilleri-local-session:${baseUrl}`)
      channel.current = opened
      opened.onmessage = (event: MessageEvent<unknown>) => {
        if (event.data === 'signed-out') clearIdentity()
        else if (event.data === 'sessions-changed') check()
      }
    }
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', visible)
      channel.current?.close()
      channel.current = null
    }
  }, [refreshSession, clearIdentity, baseUrl])
  useEffect(() => {
    if (!visible) {
      clearSecrets()
      setShowSecurity(false)
    }
  }, [visible, clearSecrets])
  const reloadSecurity = async (expectedEpoch = identityEpoch.current) => {
    const [nextSessions, nextPasskeys] = await Promise.all([client.sessions(), client.passkeys()])
    if (expectedEpoch !== identityEpoch.current) return false
    setSessions(nextSessions)
    setPasskeys(nextPasskeys)
    return true
  }
  const run = async (action: (expectedEpoch: number) => Promise<void>) => {
    if (busy || checking) return
    setBusy(true)
    setError(null)
    setNotice(null)
    const expectedEpoch = identityEpoch.current
    try {
      await action(expectedEpoch)
    } catch (cause) {
      if (expectedEpoch !== identityEpoch.current) return
      setError(
        cause instanceof ApiError
          ? cause.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
            ? t('identityPanel.emailInUse')
            : cause.code === 'INVALID_TOKEN'
              ? t('identityPanel.invalidRecovery')
              : ['PASSWORD_TOO_SHORT', 'PASSWORD_TOO_LONG'].includes(cause.code)
                ? t('identityPanel.invalidPassword')
                : ['INVALID_CODE', 'INVALID_BACKUP_CODE'].includes(cause.code)
                  ? t('identityPanel.invalidCode')
                  : cause.status === 401 && cause.code !== 'reauthentication_required'
                    ? t('identityPanel.invalidCredentials')
                    : i18n.problemMessage(cause)
          : t('identityPanel.operationFailed'),
      )
      if (cause instanceof ApiError && cause.code === 'reauthentication_required') {
        clearSecrets()
        setReauthVisible(true)
        setShowSecurity(true)
      }
      // A wrong password is also a 401: check the actual session before clearing the profile.
      if (cause instanceof ApiError && cause.status === 401) {
        try {
          await refreshSession()
        } catch {
          /* A network failure does not establish that the session has been revoked. */
        }
      }
    } finally {
      if (expectedEpoch === identityEpoch.current) {
        setPassword('')
        setConfirmationPassword('')
        setCode('')
      }
      setBusy(false)
    }
  }
  const button = (
    label: string,
    action: () => void,
    primary = false,
    disabled = false,
    testID?: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      aria-disabled={busy || checking || disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy || checking || disabled }}
      disabled={busy || checking || disabled}
      onPress={action}
      style={[s.button, primary && s.primary, (busy || checking || disabled) && s.disabled]}
    >
      <Text style={[s.buttonText, primary && s.primaryText]}>{label}</Text>
    </Pressable>
  )
  const check = (label: string, selected: boolean, action: () => void) => (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={selected}
      aria-disabled={busy}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled: busy }}
      disabled={busy}
      onPress={action}
      style={s.check}
    >
      <Text style={s.checkbox}>{selected ? '✓' : '○'}</Text>
      <Text style={s.checkLabel}>{label}</Text>
    </Pressable>
  )
  const passwordField = (label = t('identityPanel.password')) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={
          (mode === 'signup' || mode === 'reset') && !session ? 'new-password' : 'current-password'
        }
        textContentType={
          (mode === 'signup' || mode === 'reset') && !session ? 'newPassword' : 'password'
        }
        editable={!busy}
        maxLength={128}
        style={s.input}
      />
    </View>
  )
  const codeField = (
    label = backupMode ? t('identityPanel.recoveryCode') : t('identityPanel.sixDigitCode'),
  ) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        keyboardType={backupMode ? 'default' : 'number-pad'}
        editable={!busy}
        maxLength={backupMode ? 64 : 6}
        style={s.input}
      />
    </View>
  )
  if (!visible) return null
  if (Platform.OS !== 'web')
    return (
      <View style={s.panel}>
        <Text accessibilityRole="header" aria-level={2} style={s.title}>
          {hostedIdentity ? t('identityPanel.hostedAccess') : t('identityPanel.localAccess')}
        </Text>
        <Text style={s.body}>{t('identityPanel.nativeUnavailable')}</Text>
      </View>
    )
  const passkeysSupported = typeof window !== 'undefined' && 'PublicKeyCredential' in window
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.title}>
        {hostedIdentity
          ? t(
              session
                ? 'identityPanel.hostedYourAccess'
                : mode === 'recover' || mode === 'reset'
                  ? 'identityPanel.recoveryHeading'
                  : 'identityPanel.hostedAccess',
            )
          : session
            ? t('identityPanel.yourAccess')
            : t('identityPanel.signIn')}
      </Text>
      <Text style={s.body}>
        {t(hostedIdentity ? 'identityPanel.hostedHelp' : 'identityPanel.localHelp')}
      </Text>
      {checking && (
        <ActivityIndicator accessibilityLabel={t('identityPanel.checking')} color={c.primary} />
      )}
      {error && (
        <AccessibleStatus urgent>
          <Text style={s.error}>{error}</Text>
        </AccessibleStatus>
      )}
      {notice && (
        <AccessibleStatus>
          <Text style={s.success}>{notice}</Text>
        </AccessibleStatus>
      )}
      {busy && <ActivityIndicator accessibilityLabel={t('identityPanel.busy')} color={c.primary} />}
      {!checking &&
        !session &&
        !secondFactorPending &&
        (mode === 'signin' || mode === 'signup') && (
          <View style={s.group}>
            {mode === 'signup' && (
              <View style={s.field}>
                <Text style={s.label}>{t('identityPanel.profileName')}</Text>
                <TextInput
                  accessibilityLabel={t('identityPanel.profileName')}
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                  editable={!busy}
                  maxLength={100}
                  style={s.input}
                />
              </View>
            )}
            <View style={s.field}>
              <Text style={s.label}>{t('identityPanel.email')}</Text>
              <TextInput
                accessibilityLabel={t('identityPanel.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                editable={!busy}
                maxLength={254}
                style={s.input}
              />
            </View>
            {passwordField()}
            {mode === 'signup' && (
              <View style={s.group}>
                <Text style={s.body}>{t('identityPanel.passwordLength')}</Text>
                {check(t('identityPanel.adult'), adultAttested, () =>
                  setAdultAttested(!adultAttested),
                )}
                <View style={s.draft}>
                  {hostedIdentity ? (
                    <>
                      <Text
                        accessibilityRole="link"
                        style={s.buttonText}
                        onPress={() => {
                          void Linking.openURL(hostedIdentity.termsUrl)
                        }}
                      >
                        {t('identityPanel.hostedTerms')}
                      </Text>
                      {privacyUrl && (
                        <Text
                          accessibilityRole="link"
                          style={s.buttonText}
                          onPress={() => {
                            void Linking.openURL(privacyUrl)
                          }}
                        >
                          {t('identityPanel.hostedPrivacy')}
                        </Text>
                      )}
                      <Text style={s.body}>
                        {t('identityPanel.hostedTermsVersion', {
                          version: hostedIdentity.termsVersion,
                        })}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.label}>{t('identityPanel.termsHeading')}</Text>
                      <Text style={s.body}>{t('identityPanel.termsCopy')}</Text>
                    </>
                  )}
                </View>
                {check(
                  t(
                    hostedIdentity
                      ? 'identityPanel.hostedTermsAccept'
                      : 'identityPanel.termsAccept',
                  ),
                  termsAccepted,
                  () => setTermsAccepted(!termsAccepted),
                )}
              </View>
            )}
            {button(
              mode === 'signup'
                ? t(hostedIdentity ? 'identityPanel.hostedCreate' : 'identityPanel.create')
                : t('identityPanel.passwordSignIn'),
              () => {
                run(async (expectedEpoch) => {
                  if (mode === 'signup') {
                    await client.signUp(name.trim(), email.trim(), password)
                    if (hostedIdentity) {
                      if (expectedEpoch !== identityEpoch.current) return
                      setMode('signin')
                      setNotice(t('identityPanel.verifyRequired'))
                      return
                    }
                  } else {
                    const result = await client.signIn(email.trim(), password)
                    if (expectedEpoch !== identityEpoch.current) return
                    if (result.needsSecondFactor) {
                      setSecondFactorPending(true)
                      setBackupMode(false)
                      return
                    }
                  }
                  const next = await refreshSession(true, expectedEpoch)
                  if (!next && mode === 'signup') setNotice(t('identityPanel.created'))
                })
              },
              true,
              !email.trim() ||
                password.length < 12 ||
                (mode === 'signup' && (!name.trim() || !adultAttested || !termsAccepted)),
            )}
            {mode === 'signin' &&
              button(
                t('identityPanel.passkeySignIn'),
                () => {
                  run(async (expectedEpoch) => {
                    await client.signInPasskey()
                    if (!(await refreshSession(true, expectedEpoch)))
                      throw new Error('session unavailable')
                  })
                },
                false,
                !passkeysSupported,
              )}
            {!passkeysSupported && mode === 'signin' && (
              <Text style={s.body}>{t('identityPanel.passkeyUnsupported')}</Text>
            )}
            {hostedIdentity && mode === 'signin' && (
              <>
                {button(t('identityPanel.forgotPassword'), () => {
                  clearSecrets()
                  setError(null)
                  setNotice(null)
                  setMode('recover')
                })}
                {button(
                  t('identityPanel.resendVerification'),
                  () => {
                    run(async (expectedEpoch) => {
                      await client.resendVerification(email.trim())
                      if (expectedEpoch === identityEpoch.current)
                        setNotice(t('identityPanel.verificationRequested'))
                    })
                  },
                  false,
                  !email.trim(),
                )}
              </>
            )}
            {button(
              mode === 'signup'
                ? t('identityPanel.haveProfile')
                : t(hostedIdentity ? 'identityPanel.hostedCreate' : 'identityPanel.createProfile'),
              () => {
                clearSecrets()
                setAdultAttested(false)
                setTermsAccepted(false)
                setError(null)
                setNotice(null)
                setMode(mode === 'signup' ? 'signin' : 'signup')
              },
            )}
          </View>
        )}
      {!checking && !session && hostedIdentity && (mode === 'recover' || mode === 'reset') && (
        <View style={s.group}>
          {mode === 'recover' ? (
            <>
              <Text style={s.body}>{t('identityPanel.emailRecoveryHelp')}</Text>
              <Text style={s.label}>{t('identityPanel.email')}</Text>
              <TextInput
                accessibilityLabel={t('identityPanel.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                editable={!busy}
                maxLength={254}
                style={s.input}
              />
              {button(
                t('identityPanel.sendRecovery'),
                () => {
                  run(async (expectedEpoch) => {
                    await client.requestPasswordReset(email.trim())
                    if (expectedEpoch === identityEpoch.current)
                      setNotice(t('identityPanel.recoveryRequested'))
                  })
                },
                true,
                !email.trim(),
              )}
            </>
          ) : (
            <>
              {passwordField(t('identityPanel.newPassword'))}
              <View style={s.field}>
                <Text style={s.label}>{t('identityPanel.confirmNewPassword')}</Text>
                <TextInput
                  accessibilityLabel={t('identityPanel.confirmNewPassword')}
                  value={confirmationPassword}
                  onChangeText={setConfirmationPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  editable={!busy}
                  maxLength={128}
                  style={s.input}
                />
              </View>
              <Text style={s.body}>{t('identityPanel.passwordLength')}</Text>
              {button(
                t('identityPanel.saveNewPassword'),
                () => {
                  run(async (expectedEpoch) => {
                    if (!recoveryToken) return
                    await client.resetPassword(recoveryToken, password)
                    if (expectedEpoch !== identityEpoch.current) return
                    clearIdentity()
                    channel.current?.postMessage('signed-out')
                    setNotice(t('identityPanel.passwordReset'))
                  })
                },
                true,
                !recoveryToken || password.length < 12 || password !== confirmationPassword,
              )}
            </>
          )}
          {button(t('identityPanel.backSignIn'), () => {
            clearSecrets()
            setRecoveryToken(null)
            setMode('signin')
            setNotice(null)
            setError(null)
          })}
        </View>
      )}
      {secondFactorPending && !session && (
        <View style={s.group}>
          <Text style={s.label}>{t('identityPanel.confirmFactor')}</Text>
          {codeField()}
          {button(
            t('identityPanel.verifySignIn'),
            () => {
              run(async (expectedEpoch) => {
                await client.verifyFactor(code.trim(), backupMode)
                if (!(await refreshSession(true, expectedEpoch)))
                  throw new Error('session unavailable')
                setSecondFactorPending(false)
              })
            },
            true,
            backupMode ? !code.trim() : !/^\d{6}$/.test(code),
          )}
          {button(
            backupMode ? t('identityPanel.authenticatorCode') : t('identityPanel.useRecovery'),
            () => {
              setCode('')
              setBackupMode(!backupMode)
            },
          )}
          {button(t('identityPanel.backSignIn'), () => {
            clearSecrets()
            setSecondFactorPending(false)
          })}
        </View>
      )}
      {session && (
        <View style={s.group}>
          <Text style={s.label}>{session.user.name}</Text>
          <Text style={s.body}>{session.user.email}</Text>
          <Text style={s.body}>
            {t('identityPanel.sessionExpiry', { date: date(session.expiresAt) })}
          </Text>
          <Text style={s.body}>
            {t('identityPanel.factorState', {
              state: session.user.twoFactorEnabled
                ? t('identityPanel.active')
                : t('identityPanel.inactive'),
            })}
          </Text>
          <View style={s.actions}>
            {button(
              showSecurity ? t('identityPanel.closeSecurity') : t('identityPanel.security'),
              () => {
                run(async (expectedEpoch) => {
                  if (!showSecurity && !(await reloadSecurity(expectedEpoch))) return
                  else {
                    clearSecrets()
                    setReauthVisible(false)
                  }
                  setShowSecurity(!showSecurity)
                })
              },
            )}
            {button(t('identityPanel.signOut'), () => {
              run(async () => {
                clearIdentity()
                channel.current?.postMessage('signed-out')
                await client.signOut()
                setNotice(t('identityPanel.signedOut'))
              })
            })}
          </View>
          {showSecurity && (
            <View style={s.group}>
              <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
                {t('identityPanel.identityHeading')}
              </Text>
              <Text style={s.body}>{t('identityPanel.stepUpHelp')}</Text>
              {!reauthVisible &&
                button(t('identityPanel.confirmIdentity'), () => {
                  clearSecrets()
                  setReauthVisible(true)
                })}
              {reauthVisible && (
                <View style={s.group}>
                  {passwordField(t('identityPanel.confirmPassword'))}
                  {session.user.twoFactorEnabled && codeField(t('identityPanel.confirmCode'))}
                  {button(
                    t('identityPanel.verifyIdentity'),
                    () => {
                      run(async (expectedEpoch) => {
                        const result = await client.reauthenticate(
                          password,
                          session.user.twoFactorEnabled ? code : undefined,
                        )
                        if (expectedEpoch !== identityEpoch.current) return
                        setReauthVisible(false)
                        callbacks.current.onReauthenticated()
                        setNotice(
                          t('identityPanel.identityExpiry', { date: date(result.expiresAt) }),
                        )
                      })
                    },
                    true,
                    !password || (session.user.twoFactorEnabled && !/^\d{6}$/.test(code)),
                  )}
                </View>
              )}
              <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
                {t('identityPanel.browserPasskeys')}
              </Text>
              <Text style={s.body}>{t('identityPanel.passkeyHelp')}</Text>
              {passkeys.map((key) => (
                <View key={key.id} style={s.card}>
                  <Text style={s.label}>
                    {key.name || t('identityPanel.passkey')} · {date(key.createdAt)}
                  </Text>
                  {button(
                    t('identityPanel.removePasskey', {
                      name: key.name || t('identityPanel.thisPasskey'),
                    }),
                    () => {
                      run(async (expectedEpoch) => {
                        await client.deletePasskey(key.id)
                        if (expectedEpoch !== identityEpoch.current) return
                        if (!(await reloadSecurity(expectedEpoch))) return
                        setNotice(t('identityPanel.passkeyRemoved'))
                      })
                    },
                  )}
                </View>
              ))}
              {button(
                t('identityPanel.addPasskey'),
                () => {
                  run(async (expectedEpoch) => {
                    await client.addPasskey(t('identityPanel.browserPasskeys'))
                    if (expectedEpoch !== identityEpoch.current) return
                    if (!(await reloadSecurity(expectedEpoch))) return
                    setNotice(t('identityPanel.passkeyAdded'))
                  })
                },
                false,
                !passkeysSupported,
              )}
              <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
                {t('identityPanel.authenticator')}
              </Text>
              {!session.user.twoFactorEnabled && !setup && (
                <View style={s.group}>
                  <Text style={s.body}>{t('identityPanel.totpHelp')}</Text>
                  {passwordField(t('identityPanel.enablePassword'))}
                  {button(
                    t('identityPanel.prepareFactor'),
                    () => {
                      run(async (expectedEpoch) => {
                        const preparedEpoch = secretEpoch.current
                        const prepared = await client.enableTwoFactor(password)
                        if (
                          expectedEpoch !== identityEpoch.current ||
                          preparedEpoch !== secretEpoch.current
                        )
                          return
                        setSetup(prepared)
                        setBackupsSaved(false)
                      })
                    },
                    false,
                    !password,
                  )}
                </View>
              )}
              {setup && (
                <View style={s.draft}>
                  <Text style={s.label}>{t('identityPanel.setupAuthenticator')}</Text>
                  <Text style={s.body}>{t('identityPanel.setupHelp')}</Text>
                  <Text
                    selectable
                    accessibilityLabel={t('identityPanel.totpAddress')}
                    style={s.secret}
                  >
                    {setup.totpURI}
                  </Text>
                  <Text selectable accessibilityLabel={t('identityPanel.totpKey')} style={s.secret}>
                    {new URL(setup.totpURI).searchParams.get('secret')}
                  </Text>
                  <Text style={s.label}>{t('identityPanel.recoveryCodes')}</Text>
                  <Text style={s.body}>{t('identityPanel.recoveryHelp')}</Text>
                  <Text
                    selectable
                    accessibilityLabel={t('identityPanel.recoveryCodes')}
                    style={s.secret}
                  >
                    {setup.backupCodes.join('\n')}
                  </Text>
                  {check(t('identityPanel.codesSaved'), backupsSaved, () =>
                    setBackupsSaved(!backupsSaved),
                  )}
                  {codeField(t('identityPanel.enableCode'))}
                  {button(
                    t('identityPanel.activateFactor'),
                    () => {
                      run(async (expectedEpoch) => {
                        await client.verifyFactor(code, false)
                        if (expectedEpoch !== identityEpoch.current) return
                        clearSecrets()
                        if (!(await refreshSession(true, expectedEpoch))) return
                        setNotice(t('identityPanel.factorEnabled'))
                      })
                    },
                    true,
                    !backupsSaved || !/^\d{6}$/.test(code),
                  )}
                  {button(t('identityPanel.closeSetup'), () => {
                    clearSecrets()
                    setNotice(t('identityPanel.setupClosed'))
                  })}
                </View>
              )}
              {session.user.twoFactorEnabled && (
                <View style={s.group}>
                  {passwordField(t('identityPanel.disablePassword'))}
                  {button(
                    t('identityPanel.disableFactor'),
                    () => {
                      run(async (expectedEpoch) => {
                        await client.disableTwoFactor(password)
                        if (expectedEpoch !== identityEpoch.current) return
                        if (!(await refreshSession(true, expectedEpoch))) return
                        setNotice(t('identityPanel.factorDisabled'))
                      })
                    },
                    false,
                    !password,
                  )}
                </View>
              )}
              <Text accessibilityRole="header" aria-level={3} style={s.subtitle}>
                {t('identityPanel.sessionsHeading')}
              </Text>
              {sessions.map((record) => (
                <View key={record.id} style={s.card}>
                  <Text style={s.label}>
                    {record.current
                      ? t('identityPanel.thisSession')
                      : t('identityPanel.otherSession')}
                  </Text>
                  <Text style={s.body}>
                    {t('identityPanel.sessionDates', {
                      created: date(record.createdAt),
                      expires: date(record.expiresAt),
                    })}
                  </Text>
                  {button(
                    record.current
                      ? t('identityPanel.revokeCurrent')
                      : t('identityPanel.revokeSession', { date: date(record.createdAt) }),
                    () => {
                      run(async (expectedEpoch) => {
                        await client.revokeSession(record.id)
                        if (expectedEpoch !== identityEpoch.current) return
                        channel.current?.postMessage(
                          record.current ? 'signed-out' : 'sessions-changed',
                        )
                        if (record.current) {
                          clearIdentity()
                          setNotice(t('identityPanel.revokedCurrent'))
                        } else {
                          if (!(await reloadSecurity(expectedEpoch))) return
                          setNotice(t('identityPanel.sessionRevoked'))
                        }
                      })
                    },
                  )}
                </View>
              ))}
              {button(t('identityPanel.refreshSessions'), () => {
                run(async (expectedEpoch) => {
                  await reloadSecurity(expectedEpoch)
                })
              })}
              {!revokeAllConfirmation &&
                button(t('identityPanel.revokeAll'), () => setRevokeAllConfirmation(true))}
              {revokeAllConfirmation && (
                <AccessibleDialog
                  style={s.card}
                  title={t('identityPanel.revokeAll')}
                  description={t('identityPanel.revokeConsequences')}
                  resetKey={renderedIdentityEpoch}
                  isCurrent={() => renderedIdentityEpoch === identityEpoch.current}
                  mayRestoreFocus={() => renderedIdentityEpoch === identityEpoch.current}
                  onDismiss={() => setRevokeAllConfirmation(false)}
                  canDismiss={() => !busy}
                  initialFocusSelector='[data-testid="revoke-all-cancel"]'
                  headingStyle={s.subtitle}
                  descriptionStyle={s.body}
                >
                  {button(
                    t('identityPanel.confirmRevoke'),
                    () => {
                      run(async (expectedEpoch) => {
                        await client.revokeAllSessions()
                        if (expectedEpoch !== identityEpoch.current) return
                        clearIdentity()
                        channel.current?.postMessage('signed-out')
                        setNotice(t('identityPanel.allRevoked'))
                      })
                    },
                    true,
                  )}
                  {button(
                    t('identityPanel.keepSessions'),
                    () => setRevokeAllConfirmation(false),
                    false,
                    false,
                    'revoke-all-cancel',
                  )}
                </AccessibleDialog>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  )
}
function styles(c: typeof colors.light | typeof colors.dark) {
  return StyleSheet.create({
    panel: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 20,
      gap: 12,
      width: '100%',
    },
    title: { color: c.textPrimary, fontFamily: 'Newsreader', fontSize: 28, lineHeight: 34 },
    subtitle: {
      color: c.textPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 20,
      lineHeight: 26,
      marginTop: 12,
    },
    body: {
      color: c.textSecondary,
      fontFamily: 'Geist',
      fontSize: 15,
      lineHeight: 23,
      flexShrink: 1,
    },
    label: { color: c.textPrimary, fontFamily: 'GeistMedium', fontSize: 15, lineHeight: 22 },
    group: { gap: 12 },
    field: { gap: 6 },
    input: {
      backgroundColor: c.surfaceElevated,
      color: c.textPrimary,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      minHeight: 48,
      padding: 12,
      fontFamily: 'Geist',
      fontSize: 16,
    },
    button: {
      borderColor: c.borderStrong,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontFamily: 'GeistMedium',
      fontSize: 15,
      lineHeight: 22,
      color: c.primary,
      textAlign: 'center',
    },
    primary: { backgroundColor: c.primary, borderColor: c.primary },
    primaryText: { color: c.onPrimary },
    disabled: { opacity: 0.55 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    check: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      paddingVertical: 8,
    },
    checkbox: { color: c.primary, fontSize: 24, width: 28, textAlign: 'center' },
    checkLabel: {
      fontFamily: 'Geist',
      color: c.textPrimary,
      fontSize: 15,
      lineHeight: 23,
      flex: 1,
    },
    card: { borderColor: c.border, borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
    draft: { backgroundColor: c.background, padding: 14, borderRadius: 10, gap: 12 },
    secret: {
      color: c.textPrimary,
      fontFamily: 'Geist',
      fontSize: 14,
      lineHeight: 22,
      flexShrink: 1,
    },
    error: { color: c.danger, fontFamily: 'Geist', fontSize: 15, lineHeight: 23 },
    success: { color: c.success, fontFamily: 'Geist', fontSize: 15, lineHeight: 23 },
  })
}
