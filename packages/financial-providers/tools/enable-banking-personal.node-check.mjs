import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  capturePersonalAccounts,
  inspectPersonalConfiguration,
  main,
  parsePersonalArguments,
  parsePersonalCallback,
  readHiddenCallback,
} from './enable-banking-personal.mjs'
import {
  createPrivateSessionStore,
  exportPrivateCapture,
  readPrivateCapture,
  readPrivateFile,
} from './enable-banking-personal-store.mjs'

const applicationId = 'cf589be3-3755-465b-a8df-a90a16a31403'
const sessionId = '497f6eca-6276-4993-bfeb-53cbbbba6f08'
const accountId = '07cc67f4-45d6-494b-adac-09b5cbc7e2b5'
const aspsp = { name: 'Synthetic Bank', country: 'IT' }
const state = 'a'.repeat(43)
const redirect = 'https://private.example.org/bank/callback'
const environment = {
  ENABLE_BANKING_APPLICATION_ID: applicationId,
  ENABLE_BANKING_PRIVATE_KEY_PATH: '/private/key/private.pem',
  ENABLE_BANKING_REDIRECT_URL: redirect,
  ENABLE_BANKING_COUNTRY: 'IT',
  ENABLE_BANKING_ASPSP_NAME: aspsp.name,
  ENABLE_BANKING_PERSONAL_USE: '1',
  ENABLE_BANKING_DATA_PATH: '/private/data',
  ENABLE_BANKING_STORE_KEY_PATH: '/private/keys/store.key',
}
const record = () => ({
  format: 'lilleri.enable-banking.personal-record.v1',
  ownerDeclaration: 'own_accounts_only',
  psuType: 'personal',
  applicationId,
  sessionId,
  aspsp,
  accounts: [{ uid: accountId, usage: 'PRIV', account_id: { iban: 'PRIVATE-IBAN' } }],
})
function fixture() {
  const calls = []
  const client = {
    getApplication: async () => ({
      kid: applicationId,
      environment: 'PRODUCTION',
      active: true,
      services: ['AIS'],
      countries: ['IT'],
      redirectUrls: [redirect],
    }),
    listASPSPs: async () => [{ ...aspsp, maximumConsentValidity: 86400, beta: false }],
    startAuthorization: async (input) => {
      calls.push(['auth', input])
      return {
        url: 'https://auth.enablebanking.com/ais/start?sessionid=private',
        authorizationId: sessionId,
      }
    },
    exchangeCode: async (code) => {
      calls.push(['exchange', code])
      return {
        sessionId,
        aspsp,
        psuType: 'personal',
        accounts: record().accounts,
        validUntil: '2099-01-01T00:00:00Z',
      }
    },
    getSession: async (id) => {
      calls.push(['session', id])
      return {
        sessionId: id,
        status: 'AUTHORIZED',
        psuType: 'personal',
        aspsp,
        accounts: [accountId],
        validUntil: '2099-01-01T00:00:00Z',
      }
    },
    getBalances: async (id) => {
      calls.push(['balances', id])
      return [{ balance_amount: { amount: '123.45', currency: 'EUR' } }]
    },
    getTransactions: async (id) => {
      calls.push(['transactions', id])
      return {
        transactions: [
          {
            transaction_amount: { amount: '1.20', currency: 'EUR' },
            remittance_information: ['PRIVATE-MERCHANT'],
          },
        ],
        continuationKey: null,
      }
    },
    deleteSession: async (id) => {
      calls.push(['delete', id])
    },
    close: () => {
      calls.push(['close'])
    },
  }
  let stored = null
  const store = {
    read: async () => stored,
    write: async (value) => {
      calls.push(['write'])
      stored = value
    },
    clear: async () => {
      calls.push(['clear'])
      stored = null
    },
    checkWritable: async () => {
      calls.push(['probe'])
    },
    close: async () => {},
  }
  let printed = ''
  const dependencies = {
    clientFactory: async () => client,
    storeFactory: async () => store,
    write: (value) => {
      printed += value
    },
    interactive: true,
    readCallback: async () => {
      const authorization = calls.find(([name]) => name === 'auth')[1]
      return `${redirect}?state=${authorization.state}&code=PRIVATE-CODE`
    },
  }
  return { client, calls, store, dependencies, printed: () => printed, stored: () => stored }
}

test('default check performs zero filesystem/network/client work and never echoes input', async () => {
  let printed = ''
  const exit = await main(
    [],
    { ENABLE_BANKING_PRIVATE_KEY_PATH: 'PRIVATE-SECRET' },
    {
      clientFactory: () => {
        throw new Error('must not execute')
      },
      storeFactory: () => {
        throw new Error('must not execute')
      },
      write: (value) => {
        printed += value
      },
    },
  )
  assert.equal(exit, 2)
  assert.equal(JSON.parse(printed).execution, 'not_started')
  assert.equal(printed.includes('PRIVATE-SECRET'), false)
  assert.equal(inspectPersonalConfiguration(environment).status, 'configured')
  assert.equal(
    inspectPersonalConfiguration({ ...environment, ENABLE_BANKING_PERSONAL_USE: '0' }).status,
    'blocked',
  )
  assert.equal(
    inspectPersonalConfiguration({
      ...environment,
      ENABLE_BANKING_DATA_PATH: '/workspace/Lilleri/private',
    }).status,
    'invalid_configuration',
  )
})

test('arguments require an explicit known action and separate absolute export', () => {
  assert.deepEqual(parsePersonalArguments([]), { action: '--check', exportPath: null })
  assert.deepEqual(parsePersonalArguments(['--refresh', '--export', '/private/export.json']), {
    action: '--refresh',
    exportPath: '/private/export.json',
  })
  for (const args of [
    ['--force'],
    ['--check', '--export', '/private/export.json'],
    ['--connect', '--export', 'relative.json'],
    ['--connect', '--refresh'],
  ])
    assert.throws(() => parsePersonalArguments(args))
})

test('callback requires exact destination, one state, one code and rejects unsolicited errors', () => {
  assert.equal(
    parsePersonalCallback(`${redirect}?state=${state}&code=secret`, redirect, state),
    'secret',
  )
  for (const address of [
    `https://other.example.org/bank/callback?state=${state}&code=secret`,
    `https://private.example.org/other?state=${state}&code=secret`,
    `${redirect}?state=wrong&code=secret`,
    `${redirect}?state=${state}&state=${state}&code=secret`,
    `${redirect}?state=${state}&code=secret&code=secret`,
    `${redirect}?state=${state}&code=secret#fragment`,
    `${redirect}?state=${state}&code=secret&unknown=true`,
    `${redirect}?state=${state}&error=access_denied&code=secret`,
    `${redirect}?state=${state}&code=secret&error_description=PRIVATE-ERROR`,
  ])
    assert.throws(() => parsePersonalCallback(address, redirect, state), {
      code: 'callback_invalid',
    })
  assert.throws(
    () =>
      parsePersonalCallback(
        `${redirect}?state=${state}&error=access_denied&error_description=PRIVATE-ERROR`,
        redirect,
        state,
      ),
    { code: 'authorization_cancelled' },
  )
})

test('callback secret input requires a TTY and never echoes characters', async () => {
  const input = new EventEmitter()
  input.isTTY = true
  input.isRaw = false
  input.setRawMode = (value) => {
    input.isRaw = value
  }
  input.resume = () => {}
  input.pause = () => {}
  let printed = ''
  const output = {
    isTTY: true,
    write: (value) => {
      printed += value
    },
  }
  const pending = readHiddenCallback('Paste: ', input, output)
  input.emit('data', Buffer.from('PRIVATE-CODE\r'))
  assert.equal(await pending, 'PRIVATE-CODE')
  assert.equal(printed, 'Paste: \n')
  assert.equal(input.isRaw, false)
  assert.throws(() => readHiddenCallback('Paste: ', { isTTY: false }, output), {
    code: 'interactive_terminal_required',
  })
})

test('connect persists metadata before scoped reads and stdout contains only interactive link plus counts', async () => {
  const f = fixture()
  assert.equal(await main(['--connect'], environment, f.dependencies), 0)
  assert.equal(f.calls.filter(([name]) => name === 'exchange').length, 1)
  assert.ok(
    f.calls.findIndex(([name]) => name === 'probe') <
      f.calls.findIndex(([name]) => name === 'auth'),
  )
  assert.ok(
    f.calls.findIndex(([name]) => name === 'write') <
      f.calls.findIndex(([name]) => name === 'session'),
  )
  assert.equal(f.stored().ownerDeclaration, 'own_accounts_only')
  for (const privateValue of [
    'PRIVATE-CODE',
    'PRIVATE-IBAN',
    'PRIVATE-MERCHANT',
    accountId,
    applicationId,
  ])
    assert.equal(f.printed().includes(privateValue), false)
  assert.equal(
    f.calls.some(([name]) => name === 'delete'),
    false,
  )
})

test('noninteractive connect and inactive/sandbox apps never start bank authorization', async () => {
  const f = fixture()
  assert.equal(await main(['--connect'], environment, { ...f.dependencies, interactive: false }), 1)
  assert.deepEqual(f.calls, [])
  for (const override of [
    { environment: 'SANDBOX' },
    { active: false },
    { redirectUrls: ['https://elsewhere.example.org/'] },
  ]) {
    const g = fixture(),
      original = g.client.getApplication
    g.client.getApplication = async () => ({ ...(await original()), ...override })
    assert.equal(await main(['--connect'], environment, g.dependencies), 1)
    assert.equal(
      g.calls.some(([name]) => name === 'auth'),
      false,
    )
  }
})

test('failed post-exchange persistence compensates once, reports uncertain cleanup safely', async () => {
  const f = fixture()
  f.store.write = async () => {
    throw new Error('PRIVATE-FAILURE')
  }
  assert.equal(await main(['--connect'], environment, f.dependencies), 1)
  assert.equal(f.calls.filter(([name]) => name === 'delete').length, 1)
  assert.equal(
    f.calls.some(([name]) => name === 'balances'),
    false,
  )
  const g = fixture()
  g.store.write = f.store.write
  g.client.deleteSession = async () => {
    throw new Error('PRIVATE-REMOTE-FAILURE')
  }
  assert.equal(await main(['--connect'], environment, g.dependencies), 1)
  assert.equal(g.printed().includes('cleanup_unverified'), true)
  assert.equal(g.printed().includes('PRIVATE-REMOTE-FAILURE'), false)
})

test('a valid persisted session survives transient capture failure for a later refresh', async () => {
  const f = fixture()
  const balanceReader = f.client.getBalances
  f.client.getBalances = async () => {
    throw new Error('PRIVATE-PROVIDER-ERROR')
  }
  assert.equal(await main(['--connect'], environment, f.dependencies), 1)
  assert.ok(f.stored())
  assert.equal(
    f.calls.some(([name]) => name === 'delete'),
    false,
  )
  f.client.getBalances = balanceReader
  assert.equal(await main(['--refresh'], environment, f.dependencies), 0)
  assert.equal(f.calls.filter(([name]) => name === 'exchange').length, 1)
  assert.equal(f.printed().includes('PRIVATE-PROVIDER-ERROR'), false)
})

test('an explicitly business returned account is compensated before any financial read', async () => {
  const f = fixture()
  const exchange = f.client.exchangeCode
  f.client.exchangeCode = async (code) => {
    const result = await exchange(code)
    result.accounts[0].usage = 'ORGA'
    return result
  }
  assert.equal(await main(['--connect'], environment, f.dependencies), 1)
  assert.equal(f.calls.filter(([name]) => name === 'delete').length, 1)
  assert.equal(
    f.calls.some(([name]) => name === 'session' || name === 'balances'),
    false,
  )
  assert.equal(f.stored(), null)
  assert.equal(f.printed().includes('personal_account_required'), true)
})

test('an unknown code exchange outcome is never automatically retried and is reported safely', async () => {
  const f = fixture()
  let exchanges = 0
  f.client.exchangeCode = async () => {
    exchanges++
    throw Object.assign(new Error('private'), { code: 'exchange_outcome_unknown' })
  }
  assert.equal(await main(['--connect'], environment, f.dependencies), 1)
  assert.equal(exchanges, 1)
  assert.equal(f.printed().includes('requires_provider_review'), true)
  assert.equal(f.printed().includes('"automaticRetry":false'), true)
  assert.equal(f.stored(), null)
})

test('persisted owner, application, bank, session, account and expiry fences reject before financial reads', async () => {
  for (const mutate of [
    (value) => {
      value.ownerDeclaration = 'other'
    },
    (value) => {
      value.applicationId = sessionId
    },
    (value) => {
      value.aspsp = { name: 'Other', country: 'IT' }
    },
    (value) => {
      value.accounts[0].usage = 'ORGA'
    },
  ]) {
    const f = fixture(),
      value = record()
    mutate(value)
    await assert.rejects(capturePersonalAccounts(f.client, value, { applicationId, aspsp }))
    assert.equal(
      f.calls.some(([name]) => name === 'balances'),
      false,
    )
  }
  for (const override of [
    { accounts: [sessionId] },
    { status: 'EXPIRED' },
    { validUntil: 'invalid' },
    { sessionId: accountId },
  ]) {
    const f = fixture(),
      original = f.client.getSession
    f.client.getSession = async (id) => ({ ...(await original(id)), ...override })
    await assert.rejects(capturePersonalAccounts(f.client, record(), { applicationId, aspsp }), {
      code: 'session_scope',
    })
    assert.equal(
      f.calls.some(([name]) => name === 'balances'),
      false,
    )
  }
})

test('missing closed-account UID is preserved and reported without undefined financial request', async () => {
  const f = fixture(),
    value = record()
  value.accounts.push({ uid: null, name: 'Closed account', usage: 'PRIV' })
  const result = await capturePersonalAccounts(f.client, value, { applicationId, aspsp })
  assert.equal(result.unsupportedAccountCount, 1)
  assert.equal(result.accounts.length, 1)
  assert.equal(value.accounts.length, 2)
  assert.equal(f.calls.filter(([name]) => name === 'balances').length, 1)
  assert.equal(
    result.dateFrom,
    new Date(Date.parse(result.dateTo) - 29 * 86400000).toISOString().slice(0, 10),
  )
})

test('repeated pagination cursors fail atomically, no partial-count success', async () => {
  const f = fixture()
  let calls = 0
  f.client.getTransactions = async () => {
    calls++
    return { transactions: [], continuationKey: 'same' }
  }
  await assert.rejects(capturePersonalAccounts(f.client, record(), { applicationId, aspsp }), {
    code: 'bound_reached',
  })
  assert.equal(calls, 2)
})

test('refresh uses the saved session, disconnect clears only after provider acceptance', async () => {
  const f = fixture()
  await f.store.write(record())
  assert.equal(await main(['--refresh'], environment, f.dependencies), 0)
  assert.equal(
    f.calls.some(([name]) => name === 'auth' || name === 'exchange'),
    false,
  )
  f.client.deleteSession = async () => {
    throw new Error('private')
  }
  assert.equal(await main(['--disconnect'], environment, f.dependencies), 1)
  assert.ok(f.stored())
  f.client.deleteSession = async () => {}
  assert.equal(await main(['--disconnect'], environment, f.dependencies), 0)
  assert.equal(f.stored(), null)
  assert.equal(f.printed().includes('provider_attempts_if_possible'), true)
  await f.store.write(record())
  f.client.deleteSession = async () => {
    throw Object.assign(new Error('private'), { code: 'not_found' })
  }
  assert.equal(await main(['--disconnect'], environment, f.dependencies), 0)
  assert.equal(f.stored(), null)
  assert.equal(f.printed().includes('session_already_absent'), true)
})

test('private store encrypts metadata, locks concurrent commands, restores and rejects corruption', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lilleri-personal-store-'))
  try {
    const options = {
      directory: join(directory, 'data'),
      keyPath: join(directory, 'keys', 'store.key'),
      repositoryRoot: '/unrelated/repository',
    }
    const store = await createPrivateSessionStore(options)
    await store.checkWritable()
    await store.write(record())
    const ciphertext = await readFile(join(options.directory, 'session.enc'), 'utf8')
    assert.equal(ciphertext.includes('PRIVATE-IBAN'), false)
    assert.equal(ciphertext.includes(sessionId), false)
    assert.equal((await lstat(options.directory)).mode & 0o777, 0o700)
    assert.equal((await lstat(options.keyPath)).mode & 0o777, 0o600)
    assert.equal((await lstat(join(options.directory, 'session.enc'))).mode & 0o777, 0o600)
    await assert.rejects(createPrivateSessionStore(options))
    await store.close()
    const reopened = await createPrivateSessionStore(options)
    assert.deepEqual(await reopened.read(), record())
    const envelope = JSON.parse(ciphertext)
    envelope.tag = Buffer.alloc(16).toString('base64url')
    await writeFile(join(options.directory, 'session.enc'), JSON.stringify(envelope))
    await assert.rejects(reopened.read(), { code: 'private_storage' })
    await reopened.close()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('the session reader accepts base64 overhead for its own bounded plaintext writer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lilleri-personal-bounds-'))
  let store
  try {
    store = await createPrivateSessionStore({
      directory: join(directory, 'data'),
      keyPath: join(directory, 'keys', 'store.key'),
      repositoryRoot: '/unrelated/repository',
    })
    const value = { syntheticPayload: 'x'.repeat(12_100_000) }
    await store.write(value)
    assert.ok((await lstat(join(directory, 'data', 'session.enc'))).size > 16_000_000)
    assert.equal((await store.read()).syntheticPayload.length, value.syntheticPayload.length)
  } finally {
    await store?.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('store rejects shared permissions, symlinks, co-located keys and repository paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lilleri-personal-permissions-'))
  try {
    const options = {
      directory: join(directory, 'data'),
      keyPath: join(directory, 'keys', 'store.key'),
      repositoryRoot: '/unrelated/repository',
    }
    await mkdir(options.directory, { mode: 0o755 })
    await chmod(options.directory, 0o755)
    await assert.rejects(createPrivateSessionStore(options), { code: 'private_storage' })
    await chmod(options.directory, 0o700)
    await assert.rejects(
      createPrivateSessionStore({ ...options, keyPath: join(options.directory, 'key') }),
      { code: 'private_storage' },
    )
    const target = join(directory, 'target')
    await writeFile(target, Buffer.alloc(32), { mode: 0o600 })
    await mkdir(join(directory, 'keys'), { mode: 0o700 })
    await symlink(target, options.keyPath)
    await assert.rejects(createPrivateSessionStore(options), { code: 'private_storage' })
    await assert.rejects(createPrivateSessionStore({ ...options, repositoryRoot: directory }), {
      code: 'private_storage',
    })
    const repository = join(directory, 'repository')
    await mkdir(repository, { mode: 0o700 })
    await writeFile(join(repository, 'key'), Buffer.alloc(32), { mode: 0o600 })
    const alias = join(directory, 'outside-alias')
    await symlink(repository, alias)
    await assert.rejects(readPrivateFile(join(alias, 'key'), 32, repository), {
      code: 'private_storage',
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('export writes a new 0600 explicit file and refuses overwrite or repository destination', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lilleri-personal-export-'))
  try {
    const destination = join(directory, 'capture.json')
    const key = Buffer.alloc(32, 7)
    const keyDirectory = join(directory, 'keys')
    await mkdir(keyDirectory, { mode: 0o700 })
    const keyPath = join(keyDirectory, 'store.key')
    await writeFile(keyPath, key, { mode: 0o600 })
    await exportPrivateCapture(
      destination,
      { accounts: ['PRIVATE-DATA'] },
      '/unrelated/repository',
      key,
    )
    assert.equal((await lstat(destination)).mode & 0o777, 0o600)
    await assert.rejects(exportPrivateCapture(destination, {}, '/unrelated/repository', key), {
      code: 'private_storage',
    })
    assert.equal((await readFile(destination, 'utf8')).includes('PRIVATE-DATA'), false)
    assert.equal(
      JSON.parse(await readFile(destination, 'utf8')).format,
      'lilleri.enable-banking.personal-capture.v1',
    )
    assert.deepEqual(await readPrivateCapture(destination, keyPath, '/unrelated/repository'), {
      accounts: ['PRIVATE-DATA'],
    })
    let printed = ''
    const readEnvironment = {
      ENABLE_BANKING_PERSONAL_USE: '1',
      ENABLE_BANKING_STORE_KEY_PATH: keyPath,
    }
    assert.equal(
      await main(['--read-export', destination], readEnvironment, {
        interactive: false,
        write: (value) => {
          printed += value
        },
      }),
      1,
    )
    assert.equal(printed.includes('PRIVATE-DATA'), false)
    assert.equal(
      await main(['--read-export', destination], readEnvironment, {
        interactive: true,
        write: (value) => {
          printed += value
        },
      }),
      0,
    )
    assert.equal(printed.includes('PRIVATE-DATA'), true)
    await assert.rejects(exportPrivateCapture(join(directory, 'other.json'), {}, directory, key), {
      code: 'private_storage',
    })
    await chmod(directory, 0o755)
    await assert.rejects(
      exportPrivateCapture(join(directory, 'public.enc'), {}, '/unrelated/repository', key),
      { code: 'private_storage' },
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
