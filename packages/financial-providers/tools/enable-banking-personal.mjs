import { randomBytes, timingSafeEqual } from 'node:crypto'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertPrivatePath,
  createPrivateSessionStore,
  readPrivateCapture,
  readPrivateFile,
} from './enable-banking-personal-store.mjs'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const uuid = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/iu
const requiredNames = [
  'ENABLE_BANKING_APPLICATION_ID',
  'ENABLE_BANKING_PRIVATE_KEY_PATH',
  'ENABLE_BANKING_REDIRECT_URL',
  'ENABLE_BANKING_COUNTRY',
  'ENABLE_BANKING_ASPSP_NAME',
  'ENABLE_BANKING_PERSONAL_USE',
  'ENABLE_BANKING_DATA_PATH',
  'ENABLE_BANKING_STORE_KEY_PATH',
]
const basicNames = [
  'ENABLE_BANKING_APPLICATION_ID',
  'ENABLE_BANKING_PRIVATE_KEY_PATH',
  'ENABLE_BANKING_PERSONAL_USE',
]
const failure = (code) =>
  Object.assign(new Error('Personal banking operation was not completed'), { code })
const text = (value, maximum = 256) =>
  typeof value === 'string' &&
  value.trim() &&
  value.length <= maximum &&
  ![...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const matching = (left, right) => left?.name === right?.name && left?.country === right?.country
const outputReport = (write, value) =>
  write(
    `${JSON.stringify({ provider: 'enable-banking', purpose: 'own_accounts_only', ...value })}\n`,
  )

export function configuredRedirect(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw failure('configuration')
  }
  if (
    url.protocol !== 'https:' ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw failure('configuration')
  return url.href
}

export function parsePersonalArguments(args) {
  const actions = [
    '--check',
    '--banks',
    '--connect',
    '--refresh',
    '--disconnect',
    '--read-export',
    '--help',
  ]
  const action = args.length ? args[0] : '--check'
  if (!actions.includes(action)) throw failure('invalid_arguments')
  if (action === '--read-export') {
    if (args.length !== 2 || !isAbsolute(args[1])) throw failure('invalid_arguments')
    return { action, exportPath: null, inputPath: args[1] }
  }
  let exportPath = null
  if (args.length > 1) {
    if (
      !['--connect', '--refresh'].includes(action) ||
      args.length !== 3 ||
      args[1] !== '--export' ||
      !isAbsolute(args[2])
    )
      throw failure('invalid_arguments')
    exportPath = args[2]
  }
  return { action, exportPath }
}

export function inspectPersonalConfiguration(environment, action = '--check') {
  const names = action === '--banks' ? [...basicNames, 'ENABLE_BANKING_COUNTRY'] : requiredNames
  const missing = names.filter(
    (name) =>
      !environment[name]?.trim() ||
      (name === 'ENABLE_BANKING_PERSONAL_USE' && environment[name] !== '1'),
  )
  if (missing.length) return { status: 'blocked', missing }
  try {
    if (!uuid.test(environment.ENABLE_BANKING_APPLICATION_ID)) throw failure('configuration')
    assertPrivatePath(environment.ENABLE_BANKING_PRIVATE_KEY_PATH, repositoryRoot)
    if (!/^[A-Z]{2}$/u.test(environment.ENABLE_BANKING_COUNTRY)) throw failure('configuration')
    if (action !== '--banks') {
      configuredRedirect(environment.ENABLE_BANKING_REDIRECT_URL)
      if (!text(environment.ENABLE_BANKING_ASPSP_NAME)) throw failure('configuration')
      assertPrivatePath(environment.ENABLE_BANKING_DATA_PATH, repositoryRoot)
      assertPrivatePath(environment.ENABLE_BANKING_STORE_KEY_PATH, repositoryRoot)
    }
    return { status: 'configured', missing: [] }
  } catch {
    return { status: 'invalid_configuration', missing: [] }
  }
}

/** Strict one-attempt callback mapping; neither raw address nor provider errors are logged. */
export function parsePersonalCallback(address, redirectUrl, expectedState) {
  let callback
  try {
    callback = new URL(address)
  } catch {
    throw failure('callback_invalid')
  }
  const expected = new URL(configuredRedirect(redirectUrl))
  if (
    callback.origin !== expected.origin ||
    callback.pathname !== expected.pathname ||
    callback.username ||
    callback.password ||
    callback.hash
  )
    throw failure('callback_invalid')
  const allowed = new Set(['code', 'state', 'error', 'error_description'])
  for (const name of callback.searchParams.keys()) {
    if (!allowed.has(name) || callback.searchParams.getAll(name).length !== 1)
      throw failure('callback_invalid')
  }
  const state = callback.searchParams.get('state') ?? ''
  const actual = Buffer.from(state),
    required = Buffer.from(expectedState)
  if (actual.length !== required.length || !timingSafeEqual(actual, required))
    throw failure('callback_invalid')
  if (callback.searchParams.has('error')) {
    if (callback.searchParams.has('code')) throw failure('callback_invalid')
    throw failure('authorization_cancelled')
  }
  if (callback.searchParams.has('error_description')) throw failure('callback_invalid')
  const code = callback.searchParams.get('code')
  if (!text(code, 16000)) throw failure('callback_invalid')
  return code
}

/** Input never echoes: authorization codes must not enter shell history or redirected transcripts. */
export function readHiddenCallback(prompt, input = process.stdin, output = process.stdout) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function')
    throw failure('interactive_terminal_required')
  output.write(prompt)
  return new Promise((resolveLine, reject) => {
    const previousRaw = input.isRaw
    let value = ''
    let finished = false
    const finish = (error) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      input.removeListener('data', onData)
      input.removeListener('error', onError)
      input.setRawMode(previousRaw)
      input.pause()
      output.write('\n')
      if (error) reject(error)
      else resolveLine(value)
    }
    const onError = () => finish(failure('authorization_cancelled'))
    const onData = (chunk) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\r' || character === '\n') {
          finish()
          return
        }
        if (character === '\u0003' || character === '\u0004') {
          finish(failure('authorization_cancelled'))
          return
        }
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1)
        else if (character.charCodeAt(0) < 32 || value.length >= 20000) {
          finish(failure('callback_invalid'))
          return
        } else value += character
      }
    }
    const timer = setTimeout(() => finish(failure('authorization_timeout')), 600_000)
    input.setRawMode(true)
    input.on('data', onData)
    input.once('error', onError)
    input.resume()
  })
}

async function defaultClient(environment) {
  const key = await readPrivateFile(
    environment.ENABLE_BANKING_PRIVATE_KEY_PATH,
    20000,
    repositoryRoot,
  )
  try {
    const { EnableBankingPersonalClient } = await import('../dist/index.js')
    return new EnableBankingPersonalClient({
      applicationId: environment.ENABLE_BANKING_APPLICATION_ID,
      privateKeyPem: key.toString('utf8'),
    })
  } finally {
    key.fill(0)
  }
}

function assertApplication(application, environment) {
  if (application.environment !== 'PRODUCTION') throw failure('production_required')
  if (!application.active) throw failure('application_inactive')
  if (
    application.kid !== environment.ENABLE_BANKING_APPLICATION_ID ||
    !application.services.includes('AIS') ||
    !application.countries.includes(environment.ENABLE_BANKING_COUNTRY)
  )
    throw failure('application_scope')
  if (
    environment.ENABLE_BANKING_REDIRECT_URL &&
    !application.redirectUrls.includes(configuredRedirect(environment.ENABLE_BANKING_REDIRECT_URL))
  )
    throw failure('redirect_not_registered')
}

function sessionRecord(value, applicationId, expectedASPSP) {
  if (
    value?.format !== 'lilleri.enable-banking.personal-record.v1' ||
    value.applicationId !== applicationId ||
    value.ownerDeclaration !== 'own_accounts_only' ||
    value.psuType !== 'personal' ||
    !uuid.test(value.sessionId) ||
    !matching(value.aspsp, expectedASPSP) ||
    !Array.isArray(value.accounts) ||
    !value.accounts.length ||
    value.accounts.length > 50
  )
    throw failure('session_scope')
  if (value.accounts.some((account) => account?.usage === 'ORGA'))
    throw failure('personal_account_required')
  const accessible = value.accounts.filter(
    (account) => account?.uid !== undefined && account.uid !== null,
  )
  const identifiers = accessible.map((account) => account.uid)
  if (
    identifiers.some((id) => typeof id !== 'string' || !uuid.test(id)) ||
    new Set(identifiers).size !== identifiers.length
  )
    throw failure('account_identity_unavailable')
  return {
    identifiers,
    accessible,
    unsupportedAccountCount: value.accounts.length - accessible.length,
  }
}

/** Counts are observations in a bounded requested window, never a complete-history claim. */
export async function capturePersonalAccounts(
  client,
  record,
  { applicationId, aspsp, clock = Date.now },
) {
  const {
    identifiers: accountIds,
    accessible,
    unsupportedAccountCount,
  } = sessionRecord(record, applicationId, aspsp)
  const current = await client.getSession(record.sessionId)
  if (
    current.sessionId !== record.sessionId ||
    current.status !== 'AUTHORIZED' ||
    current.psuType !== 'personal' ||
    !matching(current.aspsp, aspsp) ||
    !Array.isArray(current.accounts) ||
    current.accounts.length !== accountIds.length ||
    current.accounts.some((id) => !accountIds.includes(id)) ||
    new Set(current.accounts).size !== current.accounts.length ||
    !Number.isFinite(Date.parse(current.validUntil)) ||
    Date.parse(current.validUntil) <= clock()
  )
    throw failure('session_scope')
  const capturedAt = clock()
  const dateTo = new Date(capturedAt).toISOString().slice(0, 10)
  const dateFrom = new Date(capturedAt - 29 * 86_400_000).toISOString().slice(0, 10)
  const accounts = []
  for (const account of accessible) {
    const balances = await client.getBalances(account.uid)
    const transactions = []
    const cursors = new Set()
    let continuationKey
    let complete = false
    for (let page = 0; page < 20; page++) {
      const result = await client.getTransactions(account.uid, {
        dateFrom,
        dateTo,
        ...(continuationKey ? { continuationKey } : {}),
      })
      if (
        !Array.isArray(result.transactions) ||
        result.transactions.length + transactions.length > 20000
      )
        throw failure('bound_reached')
      transactions.push(...result.transactions)
      if (result.continuationKey === null) {
        complete = true
        break
      }
      if (!text(result.continuationKey, 10000) || cursors.has(result.continuationKey))
        throw failure('bound_reached')
      cursors.add(result.continuationKey)
      continuationKey = result.continuationKey
    }
    if (!complete) throw failure('bound_reached')
    accounts.push({ metadata: account, balances, transactions })
  }
  return {
    format: 'lilleri.enable-banking.personal-capture.v1',
    observedAt: new Date(capturedAt).toISOString(),
    aspsp,
    dateFrom,
    dateTo,
    historyCompleteness: 'not_claimed',
    unsupportedAccountCount,
    accounts,
  }
}

const knownCodes = new Set([
  'invalid_arguments',
  'configuration',
  'private_storage',
  'interactive_terminal_required',
  'production_required',
  'application_inactive',
  'application_scope',
  'redirect_not_registered',
  'existing_session',
  'session_missing',
  'session_scope',
  'account_identity_unavailable',
  'institution_unavailable',
  'callback_invalid',
  'authorization_cancelled',
  'authorization_timeout',
  'unauthorized',
  'forbidden',
  'not_found',
  'rate_limited',
  'unavailable',
  'timeout',
  'cancelled',
  'bound_reached',
  'invalid_contract',
  'ais_unavailable',
  'personal_account_required',
  'cleanup_unverified',
  'exchange_outcome_unknown',
  'provider_unavailable',
  'transport',
  'response_too_large',
  'unsupported_bank',
  'invalid_request',
])

async function deletePersonalSession(client, sessionId) {
  try {
    await client.deleteSession(sessionId)
    return 'session_deleted'
  } catch (error) {
    if (error?.code === 'not_found') return 'session_already_absent'
    throw error
  }
}

export async function main(
  args = process.argv.slice(2),
  environment = process.env,
  dependencies = {},
) {
  const write = dependencies.write ?? ((value) => process.stdout.write(value))
  let client, store, createdSessionId
  try {
    const { action, exportPath, inputPath } = parsePersonalArguments(args)
    if (action === '--help') {
      write(
        'Enable Banking, uso personale locale.\n--check (predefinito): verifica la configurazione senza I/O\n--banks: elenco delle banche personali nel Paese configurato\n--connect: autorizza il proprio conto in una sessione di terminale privata\n--refresh: legge la sessione personale salvata\n--disconnect: elimina la sessione presso il provider\n--export /percorso/assoluto.enc: facoltativo con connect/refresh, salva dati finanziari in un nuovo file cifrato privato\n--read-export /percorso/assoluto.enc: mostra i dati finanziari decifrati soltanto nel terminale interattivo privato\n',
      )
      return 0
    }
    if (action === '--read-export') {
      if (!(dependencies.interactive ?? (process.stdin.isTTY && process.stdout.isTTY)))
        throw failure('interactive_terminal_required')
      if (
        environment.ENABLE_BANKING_PERSONAL_USE !== '1' ||
        !environment.ENABLE_BANKING_STORE_KEY_PATH
      )
        throw failure('configuration')
      const value = await readPrivateCapture(
        inputPath,
        environment.ENABLE_BANKING_STORE_KEY_PATH,
        repositoryRoot,
      )
      write('Dati finanziari personali decifrati per lettura esplicita nel terminale privato.\n')
      write(`${JSON.stringify(value, null, 2)}\n`)
      return 0
    }
    const inspection = inspectPersonalConfiguration(environment, action)
    if (inspection.status !== 'configured' || action === '--check') {
      outputReport(write, {
        ...inspection,
        execution: 'not_started',
        productionAccess: 'unverified',
        hostedApplication: 'not_enabled',
      })
      return inspection.status === 'configured' ? 0 : 2
    }
    if (
      action === '--connect' &&
      !(dependencies.interactive ?? (process.stdin.isTTY && process.stdout.isTTY))
    )
      throw failure('interactive_terminal_required')
    if (exportPath) assertPrivatePath(exportPath, repositoryRoot)
    client = await (dependencies.clientFactory ?? defaultClient)(environment)
    const application = await client.getApplication()
    assertApplication(application, environment)
    if (action === '--banks') {
      const banks = await client.listASPSPs(environment.ENABLE_BANKING_COUNTRY)
      outputReport(write, {
        status: 'passed',
        execution: 'discovery',
        environment: 'PRODUCTION',
        banks: banks.map(({ name, country, beta }) => ({ name, country, beta })),
        productionAccess: 'own_account_entitlement_not_inferred',
        hostedApplication: 'not_enabled',
      })
      return 0
    }
    store = await (dependencies.storeFactory ?? createPrivateSessionStore)({
      directory: environment.ENABLE_BANKING_DATA_PATH,
      keyPath: environment.ENABLE_BANKING_STORE_KEY_PATH,
      repositoryRoot,
    })
    let record = await store.read()
    const aspsp = {
      name: environment.ENABLE_BANKING_ASPSP_NAME,
      country: environment.ENABLE_BANKING_COUNTRY,
    }
    if (action === '--disconnect') {
      if (
        !record ||
        record.applicationId !== environment.ENABLE_BANKING_APPLICATION_ID ||
        !uuid.test(record.sessionId)
      )
        throw failure('session_missing')
      const execution = await deletePersonalSession(client, record.sessionId)
      await store.clear()
      outputReport(write, {
        status: 'passed',
        execution,
        bankConsentClosure: 'provider_attempts_if_possible',
        hostedApplication: 'not_enabled',
      })
      return 0
    }
    if (action === '--connect') {
      if (record) throw failure('existing_session')
      await store.checkWritable()
      const banks = await client.listASPSPs(aspsp.country)
      const matchingBanks = banks.filter((entry) => matching(entry, aspsp))
      const bank = matchingBanks.length === 1 ? matchingBanks[0] : null
      if (
        !bank ||
        !Number.isSafeInteger(bank.maximumConsentValidity) ||
        bank.maximumConsentValidity < 60
      )
        throw failure('institution_unavailable')
      const state = randomBytes(32).toString('base64url')
      const validUntil = new Date(
        Date.now() + Math.min(bank.maximumConsentValidity, 86400) * 1000 - 2000,
      ).toISOString()
      const authorization = await client.startAuthorization({
        aspsp,
        state,
        redirectUrl: configuredRedirect(environment.ENABLE_BANKING_REDIRECT_URL),
        validUntil,
      })
      // Interactive operator only; this URL is never written by the noninteractive check.
      write(
        `Apri questo indirizzo nel browser privato e autorizza il tuo conto:\n${authorization.url}\n`,
      )
      const address = await (dependencies.readCallback ?? readHiddenCallback)(
        'Incolla l’indirizzo completo dopo il ritorno dalla banca (input nascosto): ',
      )
      const code = parsePersonalCallback(address, environment.ENABLE_BANKING_REDIRECT_URL, state)
      // Single attempt: an ambiguous exchange is never automatically retried.
      const session = await client.exchangeCode(code)
      createdSessionId = session.sessionId
      record = {
        format: 'lilleri.enable-banking.personal-record.v1',
        applicationId: application.kid,
        ownerDeclaration: 'own_accounts_only',
        psuType: session.psuType,
        sessionId: session.sessionId,
        aspsp: session.aspsp,
        accounts: session.accounts,
        validUntil: session.validUntil,
        createdAt: new Date().toISOString(),
      }
      // Preserve one-time account metadata and the session before further provider I/O.
      await store.write(record)
      sessionRecord(record, application.kid, aspsp)
      // The valid durable binding is retained when a later read or export fails; refresh can retry.
      createdSessionId = undefined
    } else if (!record) throw failure('session_missing')
    const capture = await capturePersonalAccounts(client, record, {
      applicationId: application.kid,
      aspsp,
    })
    if (exportPath) await store.exportCapture(exportPath, capture)
    createdSessionId = undefined
    outputReport(write, {
      status: capture.accounts.length ? 'passed' : 'no_readable_accounts',
      execution: capture.accounts.length
        ? action === '--connect'
          ? 'own_account_authorized_and_read'
          : 'own_account_read'
        : 'own_account_metadata_received',
      accountCount: capture.accounts.length,
      unsupportedAccountCount: capture.unsupportedAccountCount,
      transactionCount: capture.accounts.reduce(
        (sum, account) => sum + account.transactions.length,
        0,
      ),
      requestedHistoryDays: 30,
      financialExportSaved: Boolean(exportPath),
      financialCapturePersistedByDefault: false,
      hostedApplication: 'not_enabled',
    })
    return 0
  } catch (error) {
    let cleanupFailed = false
    if (createdSessionId) {
      try {
        await deletePersonalSession(client, createdSessionId)
        await store?.clear()
      } catch {
        cleanupFailed = true
      }
    }
    outputReport(write, {
      status: 'failed',
      code: cleanupFailed
        ? 'cleanup_unverified'
        : knownCodes.has(error?.code)
          ? error.code
          : 'unavailable',
      ...(['exchange_outcome_unknown', 'cleanup_unverified'].includes(error?.code) || cleanupFailed
        ? { automaticRetry: false, sessionOutcome: 'requires_provider_review' }
        : {}),
      hostedApplication: 'not_enabled',
    })
    return 1
  } finally {
    client?.close()
    await store?.close().catch(() => {})
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = await main()
