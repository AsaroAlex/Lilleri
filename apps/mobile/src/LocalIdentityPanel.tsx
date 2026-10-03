import { ApiError } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  createLocalIdentityClient,
  type LocalIdentitySession,
  type LocalPasskeyRecord,
  type LocalSessionRecord,
} from './identity-client'

export type LocalIdentityChangeReason = 'signed-out' | 'session-renewed' | 'identity-changed'

interface Props {
  readonly baseUrl: string
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
const date = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

/** Local browser authentication; native passkeys and biometrics need device validation. */
export function LocalIdentityPanel({
  baseUrl,
  theme,
  visible = true,
  reauthenticationRequested = false,
  sessionLostVersion = 0,
  onSignedIn,
  onSignedOut,
  onReauthenticated,
}: Props) {
  const client = useMemo(() => createLocalIdentityClient(baseUrl), [baseUrl]),
    c = colors[theme],
    s = useMemo(() => styles(c), [c])
  const [session, setSession] = useState<LocalIdentitySession | null>(null),
    [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null),
    [mode, setMode] = useState<'signin' | 'signup'>('signin'),
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
  const clearSecrets = useCallback(() => {
    secretEpoch.current += 1
    setPassword('')
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
    forceSignedOut.current = false
    let cancelled = false
    refreshSession()
      .catch(() => {
        if (!cancelled) setError('Non riesco a verificare la sessione. Riprova.')
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshSession])
  useEffect(() => {
    if (lostVersion.current !== sessionLostVersion) {
      lostVersion.current = sessionLostVersion
      clearIdentity()
      // Only a locally observed invalidation is broadcast. Receiving this
      // message calls clearIdentity directly and never echoes it to other tabs.
      channel.current?.postMessage('signed-out')
      setError('La sessione è terminata. Accedi di nuovo per continuare.')
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
      refreshSession().catch(() => setError('Non riesco a verificare la sessione. Riprova.'))
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
          ? cause.message
          : 'Non riesco a completare questa operazione. Riprova.',
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
        setCode('')
      }
      setBusy(false)
    }
  }
  const button = (label: string, action: () => void, primary = false, disabled = false) => (
    <Pressable
      accessibilityRole="button"
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
  const passwordField = (label = 'Password') => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={mode === 'signup' && !session ? 'new-password' : 'current-password'}
        textContentType={mode === 'signup' && !session ? 'newPassword' : 'password'}
        editable={!busy}
        maxLength={128}
        style={s.input}
      />
    </View>
  )
  const codeField = (label = backupMode ? 'Codice di recupero' : 'Codice a 6 cifre') => (
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
        <Text accessibilityRole="header" style={s.title}>
          Accesso locale
        </Text>
        <Text style={s.body}>
          Questa modalità è disponibile nel browser. Passkey e biometria sui dispositivi iOS e
          Android richiedono una verifica dedicata.
        </Text>
      </View>
    )
  const passkeysSupported = typeof window !== 'undefined' && 'PublicKeyCredential' in window
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" style={s.title}>
        {session ? 'Il tuo accesso locale' : 'Accedi al profilo locale'}
      </Text>
      <Text style={s.body}>
        Ambiente locale con soli dati sintetici. Non usare credenziali bancarie o dati finanziari
        reali. La verifica email dipende da un servizio di invio configurato.
      </Text>
      {checking && (
        <ActivityIndicator accessibilityLabel="Verifica della sessione" color={c.primary} />
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={s.success}>
          {notice}
        </Text>
      )}
      {busy && <ActivityIndicator accessibilityLabel="Operazione in corso" color={c.primary} />}
      {!checking && !session && !secondFactorPending && (
        <View style={s.group}>
          {mode === 'signup' && (
            <View style={s.field}>
              <Text style={s.label}>Nome del profilo</Text>
              <TextInput
                accessibilityLabel="Nome del profilo"
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
            <Text style={s.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email"
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
              <Text style={s.body}>Usa una password da 12 a 128 caratteri.</Text>
              {check('Dichiaro di avere almeno 18 anni.', adultAttested, () =>
                setAdultAttested(!adultAttested),
              )}
              <View style={s.draft}>
                <Text style={s.label}>Condizioni locali — bozza v1</Text>
                <Text style={s.body}>
                  Questo profilo serve a provare le funzioni con dati sintetici sul tuo ambiente
                  locale. Non collega banche reali. L’email non è verificata se non è configurato un
                  servizio di invio. Puoi esportare i dati, revocare le sessioni ed eliminare il
                  profilo. Questa bozza non è stata approvata per un servizio pubblico.
                </Text>
              </View>
              {check('Accetto le condizioni locali di prova, bozza v1.', termsAccepted, () =>
                setTermsAccepted(!termsAccepted),
              )}
            </View>
          )}
          {button(
            mode === 'signup' ? 'Crea il profilo locale' : 'Accedi con password',
            () => {
              run(async (expectedEpoch) => {
                if (mode === 'signup') {
                  await client.signUp(name.trim(), email.trim(), password)
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
                if (!next && mode === 'signup')
                  setNotice('Profilo creato. Verifica l’email, se richiesto, poi accedi.')
              })
            },
            true,
            !email.trim() ||
              password.length < 12 ||
              (mode === 'signup' && (!name.trim() || !adultAttested || !termsAccepted)),
          )}
          {mode === 'signin' &&
            button(
              'Accedi con una passkey',
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
            <Text style={s.body}>Il browser non supporta le passkey. Puoi usare la password.</Text>
          )}
          {button(mode === 'signup' ? 'Ho già un profilo' : 'Crea un profilo locale', () => {
            clearSecrets()
            setAdultAttested(false)
            setTermsAccepted(false)
            setError(null)
            setNotice(null)
            setMode(mode === 'signup' ? 'signin' : 'signup')
          })}
        </View>
      )}
      {secondFactorPending && !session && (
        <View style={s.group}>
          <Text style={s.label}>Conferma il secondo fattore</Text>
          {codeField()}
          {button(
            'Conferma il codice e accedi',
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
            backupMode ? 'Usa il codice dell’app autenticatrice' : 'Usa un codice di recupero',
            () => {
              setCode('')
              setBackupMode(!backupMode)
            },
          )}
          {button('Torna all’accesso', () => {
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
            Sessione valida fino al {date(session.expiresAt)}. Il servizio applica un limite di 90
            giorni.
          </Text>
          <Text style={s.body}>
            Secondo fattore: {session.user.twoFactorEnabled ? 'attivo' : 'non attivo'}.
          </Text>
          <View style={s.actions}>
            {button(
              showSecurity
                ? 'Chiudi le impostazioni di accesso'
                : 'Passkey, secondo fattore e sessioni',
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
            {button('Esci dal profilo', () => {
              run(async () => {
                clearIdentity()
                channel.current?.postMessage('signed-out')
                await client.signOut()
                setNotice('Hai terminato la sessione.')
              })
            })}
          </View>
          {showSecurity && (
            <View style={s.group}>
              <Text accessibilityRole="header" style={s.subtitle}>
                Conferma dell’identità
              </Text>
              <Text style={s.body}>
                Per esportare, scollegare un conto o eliminare il profilo, conferma la tua identità.
                Dopo la conferma, scegli di nuovo l’operazione: non verrà eseguita automaticamente.
              </Text>
              {!reauthVisible &&
                button('Conferma la mia identità', () => {
                  clearSecrets()
                  setReauthVisible(true)
                })}
              {reauthVisible && (
                <View style={s.group}>
                  {passwordField('Password per confermare l’identità')}
                  {session.user.twoFactorEnabled &&
                    codeField('Codice a 6 cifre per confermare l’identità')}
                  {button(
                    'Verifica la mia identità',
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
                          `Identità confermata fino alle ${date(result.expiresAt)}. Scegli di nuovo l’operazione.`,
                        )
                      })
                    },
                    true,
                    !password || (session.user.twoFactorEnabled && !/^\d{6}$/.test(code)),
                  )}
                </View>
              )}
              <Text accessibilityRole="header" style={s.subtitle}>
                Passkey del browser
              </Text>
              <Text style={s.body}>
                Usa il dispositivo o il gestore di credenziali del browser. La password resta
                disponibile come alternativa.
              </Text>
              {passkeys.map((key) => (
                <View key={key.id} style={s.card}>
                  <Text style={s.label}>
                    {key.name || 'Passkey'} · {date(key.createdAt)}
                  </Text>
                  {button(`Rimuovi ${key.name || 'questa passkey'}`, () => {
                    run(async (expectedEpoch) => {
                      await client.deletePasskey(key.id)
                      if (expectedEpoch !== identityEpoch.current) return
                      if (!(await reloadSecurity(expectedEpoch))) return
                      setNotice('Passkey rimossa. Puoi continuare a usare la password.')
                    })
                  })}
                </View>
              ))}
              {button(
                'Aggiungi una passkey',
                () => {
                  run(async (expectedEpoch) => {
                    await client.addPasskey('Passkey del browser')
                    if (expectedEpoch !== identityEpoch.current) return
                    if (!(await reloadSecurity(expectedEpoch))) return
                    setNotice('Passkey aggiunta.')
                  })
                },
                false,
                !passkeysSupported,
              )}
              <Text accessibilityRole="header" style={s.subtitle}>
                App autenticatrice
              </Text>
              {!session.user.twoFactorEnabled && !setup && (
                <View style={s.group}>
                  <Text style={s.body}>
                    Aggiungi un codice temporaneo a 6 cifre per gli accessi con password.
                  </Text>
                  {passwordField('Password per attivare il secondo fattore')}
                  {button(
                    'Prepara il secondo fattore',
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
                  <Text style={s.label}>Configura la tua app autenticatrice</Text>
                  <Text style={s.body}>
                    Importa questo indirizzo nell’app oppure inserisci la chiave manualmente. Questi
                    segreti sono mostrati soltanto durante questa configurazione.
                  </Text>
                  <Text
                    selectable
                    accessibilityLabel="Indirizzo di configurazione dell’app autenticatrice"
                    style={s.secret}
                  >
                    {setup.totpURI}
                  </Text>
                  <Text
                    selectable
                    accessibilityLabel="Chiave dell’app autenticatrice"
                    style={s.secret}
                  >
                    {new URL(setup.totpURI).searchParams.get('secret')}
                  </Text>
                  <Text style={s.label}>Codici di recupero</Text>
                  <Text style={s.body}>
                    Conservali in un luogo sicuro. Ogni codice può essere usato una sola volta.
                  </Text>
                  <Text selectable accessibilityLabel="Codici di recupero" style={s.secret}>
                    {setup.backupCodes.join('\n')}
                  </Text>
                  {check('Ho conservato i codici di recupero.', backupsSaved, () =>
                    setBackupsSaved(!backupsSaved),
                  )}
                  {codeField('Codice a 6 cifre per attivare il secondo fattore')}
                  {button(
                    'Conferma e attiva il secondo fattore',
                    () => {
                      run(async (expectedEpoch) => {
                        await client.verifyFactor(code, false)
                        if (expectedEpoch !== identityEpoch.current) return
                        clearSecrets()
                        if (!(await refreshSession(true, expectedEpoch))) return
                        setNotice(
                          'Secondo fattore attivato. I codici di recupero non sono più mostrati.',
                        )
                      })
                    },
                    true,
                    !backupsSaved || !/^\d{6}$/.test(code),
                  )}
                  {button('Chiudi questa configurazione', () => {
                    clearSecrets()
                    setNotice(
                      'Configurazione chiusa. Prepara una nuova configurazione per continuare.',
                    )
                  })}
                </View>
              )}
              {session.user.twoFactorEnabled && (
                <View style={s.group}>
                  {passwordField('Password per disattivare il secondo fattore')}
                  {button(
                    'Disattiva il secondo fattore',
                    () => {
                      run(async (expectedEpoch) => {
                        await client.disableTwoFactor(password)
                        if (expectedEpoch !== identityEpoch.current) return
                        if (!(await refreshSession(true, expectedEpoch))) return
                        setNotice('Secondo fattore disattivato.')
                      })
                    },
                    false,
                    !password,
                  )}
                </View>
              )}
              <Text accessibilityRole="header" style={s.subtitle}>
                Sessioni attive
              </Text>
              {sessions.map((record) => (
                <View key={record.id} style={s.card}>
                  <Text style={s.label}>
                    {record.current ? 'Questa sessione' : 'Altra sessione'}
                  </Text>
                  <Text style={s.body}>
                    Creata il {date(record.createdAt)} · scade il {date(record.expiresAt)}
                  </Text>
                  {button(
                    record.current
                      ? 'Revoca questa sessione'
                      : `Revoca la sessione del ${date(record.createdAt)}`,
                    () => {
                      run(async (expectedEpoch) => {
                        await client.revokeSession(record.id)
                        if (expectedEpoch !== identityEpoch.current) return
                        channel.current?.postMessage(
                          record.current ? 'signed-out' : 'sessions-changed',
                        )
                        if (record.current) {
                          clearIdentity()
                          setNotice('Sessione revocata. Accedi di nuovo per continuare.')
                        } else {
                          if (!(await reloadSecurity(expectedEpoch))) return
                          setNotice('Sessione revocata.')
                        }
                      })
                    },
                  )}
                </View>
              ))}
              {button('Aggiorna le sessioni', () => {
                run(async (expectedEpoch) => {
                  await reloadSecurity(expectedEpoch)
                })
              })}
              {!revokeAllConfirmation &&
                button('Revoca tutte le sessioni', () => setRevokeAllConfirmation(true))}
              {revokeAllConfirmation && (
                <View style={s.card}>
                  <Text style={s.body}>
                    Terminerai anche questa sessione e dovrai accedere di nuovo.
                  </Text>
                  {button(
                    'Conferma la revoca di tutte le sessioni',
                    () => {
                      run(async (expectedEpoch) => {
                        await client.revokeAllSessions()
                        if (expectedEpoch !== identityEpoch.current) return
                        clearIdentity()
                        channel.current?.postMessage('signed-out')
                        setNotice('Tutte le sessioni sono state revocate.')
                      })
                    },
                    true,
                  )}
                  {button('Mantieni le sessioni', () => setRevokeAllConfirmation(false))}
                </View>
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
