/** Local identity surface: explicit paired copy, no secret-bearing error messages. */
export const IDENTITY_PANEL_MESSAGE_PAIRS = {
  'identityPanel.hostedAccess': ['Accedi a Lilleri', 'Sign in to Lilleri'],
  'identityPanel.hostedYourAccess': ['Il tuo accesso', 'Your sign-in'],
  'identityPanel.hostedHelp': [
    'Verifica la tua email per iniziare. Puoi proteggere l’accesso con una passkey e un secondo fattore.',
    'Verify your email to get started. You can protect sign-in with a passkey and a second factor.',
  ],
  'identityPanel.hostedCreate': ['Crea il tuo profilo', 'Create your profile'],
  'identityPanel.hostedTerms': ['Leggi le condizioni di utilizzo', 'Read the terms of use'],
  'identityPanel.hostedPrivacy': ['Informativa privacy', 'Privacy notice'],
  'identityPanel.hostedTermsVersion': [
    'Versione delle condizioni: {version}',
    'Terms version: {version}',
  ],
  'identityPanel.hostedTermsAccept': [
    'Accetto le condizioni di utilizzo.',
    'I accept the terms of use.',
  ],
  'identityPanel.verifyRequired': [
    'Profilo creato. Apri il collegamento nella tua email, poi accedi.',
    'Profile created. Open the link in your email, then sign in.',
  ],
  'identityPanel.forgotPassword': ['Hai dimenticato la password?', 'Forgot your password?'],
  'identityPanel.recoveryHeading': ['Recupera l’accesso', 'Recover your sign-in'],
  'identityPanel.emailRecoveryHelp': [
    'Ti invieremo un collegamento per scegliere una nuova password. Il secondo fattore rimane attivo.',
    'We will send you a link to choose a new password. Your second factor stays enabled.',
  ],
  'identityPanel.sendRecovery': ['Invia il collegamento di recupero', 'Send a recovery link'],
  'identityPanel.recoveryRequested': [
    'Se l’indirizzo è registrato, riceverai un’email con un collegamento valido per 15 minuti.',
    'If the address is registered, you will receive an email with a link valid for 15 minutes.',
  ],
  'identityPanel.newPassword': ['Nuova password', 'New password'],
  'identityPanel.confirmNewPassword': ['Ripeti la nuova password', 'Repeat the new password'],
  'identityPanel.saveNewPassword': ['Salva la nuova password', 'Save the new password'],
  'identityPanel.passwordReset': [
    'Password aggiornata. Tutte le sessioni sono terminate. Accedi con la nuova password.',
    'Password updated. All sessions have ended. Sign in with your new password.',
  ],
  'identityPanel.invalidRecovery': [
    'Il collegamento non è valido o è scaduto. Richiedine uno nuovo.',
    'The link is invalid or has expired. Request a new one.',
  ],
  'identityPanel.resendVerification': [
    'Invia di nuovo l’email di verifica',
    'Resend the verification email',
  ],
  'identityPanel.verificationRequested': [
    'Se l’indirizzo richiede verifica, riceverai un’email con il collegamento.',
    'If the address needs verification, you will receive an email with the link.',
  ],
  'identityPanel.checkFailed': [
    'Non riesco a verificare la sessione. Riprova.',
    'I could not verify the session. Try again.',
  ],
  'identityPanel.ended': [
    'La sessione è terminata. Accedi di nuovo per continuare.',
    'The session ended. Sign in again to continue.',
  ],
  'identityPanel.operationFailed': [
    'Non riesco a completare questa operazione. Riprova.',
    'I could not complete this operation. Try again.',
  ],
  'identityPanel.password': ['Password', 'Password'],
  'identityPanel.recoveryCode': ['Codice di recupero', 'Recovery code'],
  'identityPanel.sixDigitCode': ['Codice a 6 cifre', 'Six-digit code'],
  'identityPanel.localAccess': ['Accesso locale', 'Local sign-in'],
  'identityPanel.nativeUnavailable': [
    'Questa modalità è disponibile nel browser. Passkey e biometria sui dispositivi iOS e Android richiedono una verifica dedicata.',
    'This mode is available in the browser. Passkeys and biometrics on iOS and Android require a dedicated review.',
  ],
  'identityPanel.yourAccess': ['Il tuo accesso locale', 'Your local sign-in'],
  'identityPanel.signIn': ['Accedi al profilo locale', 'Sign in to the local profile'],
  'identityPanel.localHelp': [
    'Ambiente locale: usa soltanto dati di esempio. Non inserire credenziali bancarie o dati finanziari reali. La verifica email richiede un servizio di invio configurato.',
    'Local environment: use example data only. Do not enter banking credentials or real financial data. Email verification requires a configured delivery service.',
  ],
  'identityPanel.checking': ['Verifica della sessione', 'Verifying the session'],
  'identityPanel.busy': ['Operazione in corso', 'Operation in progress'],
  'identityPanel.profileName': ['Nome del profilo', 'Profile name'],
  'identityPanel.email': ['Email', 'Email'],
  'identityPanel.passwordLength': [
    'Usa una password da 12 a 128 caratteri.',
    'Use a password between 12 and 128 characters.',
  ],
  'identityPanel.adult': [
    'Dichiaro di avere almeno 18 anni.',
    'I confirm that I am at least 18 years old.',
  ],
  'identityPanel.termsHeading': ['Condizioni dell’ambiente locale', 'Local environment terms'],
  'identityPanel.termsCopy': [
    'Questo profilo è riservato all’ambiente locale e ai dati di esempio. Non collega banche reali e non consente dati finanziari personali. L’email non è verificata se non è configurato un servizio di invio. Puoi esportare i dati, revocare le sessioni ed eliminare il profilo. Queste condizioni valgono soltanto per l’ambiente locale e non autorizzano l’uso come servizio pubblico.',
    'This profile is restricted to the local environment and example data. It does not connect real banks or allow personal financial data. Email is not verified unless a delivery service is configured. You can export data, revoke sessions and delete the profile. These terms apply only to the local environment and do not authorise use as a public service.',
  ],
  'identityPanel.termsAccept': [
    'Accetto le condizioni dell’ambiente locale.',
    'I accept the local environment terms.',
  ],
  'identityPanel.create': ['Crea il profilo locale', 'Create the local profile'],
  'identityPanel.passwordSignIn': ['Accedi con password', 'Sign in with a password'],
  'identityPanel.created': [
    'Profilo creato. Verifica l’email, se richiesto, poi accedi.',
    'Profile created. Verify your email if required, then sign in.',
  ],
  'identityPanel.passkeySignIn': ['Accedi con una passkey', 'Sign in with a passkey'],
  'identityPanel.passkeyUnsupported': [
    'Il browser non supporta le passkey. Puoi usare la password.',
    'The browser does not support passkeys. You can use a password.',
  ],
  'identityPanel.haveProfile': ['Ho già un profilo', 'I already have a profile'],
  'identityPanel.createProfile': ['Crea un profilo locale', 'Create a local profile'],
  'identityPanel.confirmFactor': ['Conferma il secondo fattore', 'Confirm the second factor'],
  'identityPanel.verifySignIn': ['Conferma il codice e accedi', 'Confirm the code and sign in'],
  'identityPanel.authenticatorCode': [
    'Usa il codice dell’app autenticatrice',
    'Use the authenticator app code',
  ],
  'identityPanel.useRecovery': ['Usa un codice di recupero', 'Use a recovery code'],
  'identityPanel.backSignIn': ['Torna all’accesso', 'Back to sign-in'],
  'identityPanel.active': ['attivo', 'active'],
  'identityPanel.inactive': ['non attivo', 'inactive'],
  'identityPanel.closeSecurity': ['Chiudi le impostazioni di accesso', 'Close sign-in settings'],
  'identityPanel.security': [
    'Passkey, secondo fattore e sessioni',
    'Passkeys, second factor and sessions',
  ],
  'identityPanel.signOut': ['Esci dal profilo', 'Sign out of the profile'],
  'identityPanel.signedOut': ['Hai terminato la sessione.', 'You have ended the session.'],
  'identityPanel.identityHeading': ['Conferma dell’identità', 'Identity confirmation'],
  'identityPanel.stepUpHelp': [
    'Per esportare, scollegare un conto o eliminare il profilo, conferma la tua identità. Dopo la conferma, scegli di nuovo l’operazione: non verrà eseguita automaticamente.',
    'To export, disconnect an account or delete the profile, confirm your identity. After confirmation, choose the action again: it will not run automatically.',
  ],
  'identityPanel.confirmIdentity': ['Conferma la mia identità', 'Confirm my identity'],
  'identityPanel.confirmPassword': [
    'Password per confermare l’identità',
    'Password to confirm identity',
  ],
  'identityPanel.confirmCode': [
    'Codice a 6 cifre per confermare l’identità',
    'Six-digit code to confirm identity',
  ],
  'identityPanel.verifyIdentity': ['Verifica la mia identità', 'Verify my identity'],
  'identityPanel.browserPasskeys': ['Passkey del browser', 'Browser passkeys'],
  'identityPanel.passkeyHelp': [
    'Usa il dispositivo o il gestore di credenziali del browser. La password resta disponibile come alternativa.',
    'Use your device or browser credential manager. The password remains available as an alternative.',
  ],
  'identityPanel.passkey': ['Passkey', 'Passkey'],
  'identityPanel.thisPasskey': ['questa passkey', 'this passkey'],
  'identityPanel.passkeyRemoved': [
    'Passkey rimossa. Puoi continuare a usare la password.',
    'Passkey removed. You can continue using a password.',
  ],
  'identityPanel.addPasskey': ['Aggiungi una passkey', 'Add a passkey'],
  'identityPanel.passkeyAdded': ['Passkey aggiunta.', 'Passkey added.'],
  'identityPanel.authenticator': ['App autenticatrice', 'Authenticator app'],
  'identityPanel.totpHelp': [
    'Aggiungi un codice temporaneo a 6 cifre per gli accessi con password.',
    'Add a temporary six-digit code for password sign-in.',
  ],
  'identityPanel.enablePassword': [
    'Password per attivare il secondo fattore',
    'Password to enable the second factor',
  ],
  'identityPanel.prepareFactor': ['Prepara il secondo fattore', 'Prepare the second factor'],
  'identityPanel.setupAuthenticator': [
    'Configura la tua app autenticatrice',
    'Set up your authenticator app',
  ],
  'identityPanel.setupHelp': [
    'Importa questo indirizzo nell’app oppure inserisci la chiave manualmente. Questi segreti sono mostrati soltanto durante questa configurazione.',
    'Import this address into the app or enter the key manually. These secrets are shown only during this setup.',
  ],
  'identityPanel.totpAddress': [
    'Indirizzo di configurazione dell’app autenticatrice',
    'Authenticator app setup address',
  ],
  'identityPanel.totpKey': ['Chiave dell’app autenticatrice', 'Authenticator app key'],
  'identityPanel.recoveryCodes': ['Codici di recupero', 'Recovery codes'],
  'identityPanel.recoveryHelp': [
    'Conservali in un luogo sicuro. Ogni codice può essere usato una sola volta.',
    'Keep them in a safe place. Each code can be used only once.',
  ],
  'identityPanel.codesSaved': [
    'Ho conservato i codici di recupero.',
    'I have saved the recovery codes.',
  ],
  'identityPanel.enableCode': [
    'Codice a 6 cifre per attivare il secondo fattore',
    'Six-digit code to enable the second factor',
  ],
  'identityPanel.activateFactor': [
    'Conferma e attiva il secondo fattore',
    'Confirm and enable the second factor',
  ],
  'identityPanel.factorEnabled': [
    'Secondo fattore attivato. I codici di recupero non sono più mostrati.',
    'Second factor enabled. Recovery codes are no longer shown.',
  ],
  'identityPanel.closeSetup': ['Chiudi questa configurazione', 'Close this setup'],
  'identityPanel.setupClosed': [
    'Configurazione chiusa. Prepara una nuova configurazione per continuare.',
    'Setup closed. Prepare a new setup to continue.',
  ],
  'identityPanel.disablePassword': [
    'Password per disattivare il secondo fattore',
    'Password to disable the second factor',
  ],
  'identityPanel.disableFactor': ['Disattiva il secondo fattore', 'Disable the second factor'],
  'identityPanel.factorDisabled': ['Secondo fattore disattivato.', 'Second factor disabled.'],
  'identityPanel.sessionsHeading': ['Sessioni attive', 'Active sessions'],
  'identityPanel.thisSession': ['Questa sessione', 'This session'],
  'identityPanel.otherSession': ['Altra sessione', 'Other session'],
  'identityPanel.revokeCurrent': ['Revoca questa sessione', 'Revoke this session'],
  'identityPanel.revokedCurrent': [
    'Sessione revocata. Accedi di nuovo per continuare.',
    'Session revoked. Sign in again to continue.',
  ],
  'identityPanel.sessionRevoked': ['Sessione revocata.', 'Session revoked.'],
  'identityPanel.refreshSessions': ['Aggiorna le sessioni', 'Refresh sessions'],
  'identityPanel.revokeAll': ['Revoca tutte le sessioni', 'Revoke all sessions'],
  'identityPanel.revokeConsequences': [
    'Terminerai anche questa sessione e dovrai accedere di nuovo.',
    'This session will also end and you will need to sign in again.',
  ],
  'identityPanel.confirmRevoke': [
    'Conferma la revoca di tutte le sessioni',
    'Confirm revocation of all sessions',
  ],
  'identityPanel.allRevoked': [
    'Tutte le sessioni sono state revocate.',
    'All sessions have been revoked.',
  ],
  'identityPanel.keepSessions': ['Mantieni le sessioni', 'Keep sessions'],
  'identityPanel.sessionExpiry': [
    'Sessione valida fino al {date}. Il servizio applica un limite di 90 giorni.',
    'Session valid until {date}. The service applies a 90-day limit.',
  ],
  'identityPanel.factorState': ['Secondo fattore: {state}.', 'Second factor: {state}.'],
  'identityPanel.identityExpiry': [
    'Identità confermata fino alle {date}. Scegli di nuovo l’operazione.',
    'Identity confirmed until {date}. Choose the action again.',
  ],
  'identityPanel.removePasskey': ['Rimuovi {name}', 'Remove {name}'],
  'identityPanel.sessionDates': [
    'Creata il {created} · scade il {expires}',
    'Created {created} · expires {expires}',
  ],
  'identityPanel.revokeSession': [
    'Revoca la sessione del {date}',
    'Revoke the session from {date}',
  ],
  'identityPanel.invalidCredentials': [
    'Controlla le credenziali e riprova.',
    'Check your credentials and try again.',
  ],
  'identityPanel.emailInUse': [
    'Questo indirizzo non può creare un nuovo profilo. Prova ad accedere.',
    'This address cannot create a new profile. Try signing in.',
  ],
  'identityPanel.invalidPassword': [
    'Usa una password da 12 a 128 caratteri.',
    'Use a password between 12 and 128 characters.',
  ],
  'identityPanel.invalidCode': [
    'Il codice non è valido. Controllalo e riprova.',
    'The code is invalid. Check it and try again.',
  ],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
