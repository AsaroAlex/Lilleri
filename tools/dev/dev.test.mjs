import assert from 'node:assert/strict'
import { createServer, request as httpRequest } from 'node:http'
import { createConnection } from 'node:net'
import { homedir } from 'node:os'
import { isAbsolute, relative } from 'node:path'
import test from 'node:test'
import { developmentConfiguration } from './environment.mjs'
import { createDevelopmentGateway } from './gateway.mjs'
import { startManagedProcess } from './processes.mjs'
import { createRebuildQueue } from './watch.mjs'

function listen(server, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, host, () => resolve(server.address().port))
  })
}
function exchange(port, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest(
      { hostname: '127.0.0.1', port, path, method, headers },
      (incoming) => {
        const chunks = []
        incoming.on('data', (chunk) => chunks.push(chunk))
        incoming.on('end', () =>
          resolve({
            status: incoming.statusCode,
            headers: incoming.headers,
            body: Buffer.concat(chunks),
          }),
        )
        incoming.on('error', reject)
      },
    )
    outgoing.on('error', reject)
    outgoing.end(body)
  })
}
async function fixture(
  publicOrigin = null,
  { upgradeDelayMs = 0, expoHost = '127.0.0.1', gatewayExpoHost = 'localhost' } = {},
) {
  const records = []
  const zip = Buffer.from([0x50, 0x4b, 0, 0xff, 0x80, 0x12, 0x01, 0x0a, 0x0d])
  const api = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    records.push({
      path: request.url,
      method: request.method,
      headers: request.headers,
      body: Buffer.concat(chunks).toString(),
    })
    if (request.url === '/v1/export/archive') {
      response.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="synthetic.zip"',
        'Content-Length': zip.length,
        'Access-Control-Allow-Origin': 'http://127.0.0.1:8181',
        'Set-Cookie': 'auth=should-never-reach-browser',
      })
      response.end(zip)
    } else {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ path: request.url }))
    }
  })
  const expo = createServer((request, response) => {
    records.push({ path: request.url, headers: request.headers, frontend: true })
    response.writeHead(200, { 'Content-Type': 'text/plain' })
    response.end('metro')
  })
  const upgraded = new Set()
  let notifyUpgrade
  const upgradeReceived = new Promise((resolve) => {
    notifyUpgrade = resolve
  })
  expo.on('upgrade', (request, socket, head) => {
    records.push({ path: request.url, headers: request.headers, websocket: true })
    upgraded.add(socket)
    socket.on('error', () => {})
    socket.on('close', () => upgraded.delete(socket))
    notifyUpgrade()
    const handshake = () => {
      if (socket.destroyed) return
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
      )
      if (head.length) socket.write(head)
      socket.on('data', (chunk) => socket.write(chunk))
    }
    if (upgradeDelayMs) setTimeout(handshake, upgradeDelayMs).unref()
    else handshake()
  })
  const apiPort = await listen(api)
  const expoPort = await listen(expo, expoHost)
  const gateway = createDevelopmentGateway({
    apiPort,
    expoPort,
    expoHost: gatewayExpoHost,
    publicOrigin,
  })
  const port = await listen(gateway.server)
  return {
    port,
    apiPort,
    expoPort,
    records,
    zip,
    upgradeReceived,
    async close() {
      await gateway.close()
      for (const socket of upgraded) socket.destroy()
      await Promise.all(
        [api, expo].map((server) => new Promise((resolve) => server.close(resolve))),
      )
    },
  }
}

test('interactive configuration isolates archives and does not inherit service credentials', () => {
  const parent = {
    PATH: '/toolchain',
    DEV_DATA_PATH: '/tmp/lilleri-disposable/data',
    AWS_SECRET_ACCESS_KEY: 'synthetic-secret',
    STRIPE_SECRET_KEY: 'synthetic-secret',
    LOCAL_AUTH_SECRET: 'synthetic-secret',
    NODE_OPTIONS: '--require=/unsafe-hook',
    PGLITE_PATH: '/unrelated-archive',
    SOURCE_ERASURE_JOURNAL_PATH: '/unrelated-journal',
  }
  const config = developmentConfiguration(parent, '/tmp/lilleri-workspace')
  assert.equal(config.env.PGLITE_PATH, parent.DEV_DATA_PATH)
  assert.equal(config.env.API_HOST, '127.0.0.1')
  assert.equal(config.env.EXPO_PUBLIC_API_URL, '/api')
  assert.equal(config.env.CI, undefined, 'Metro must keep its watcher active')
  for (const key of [
    'AWS_SECRET_ACCESS_KEY',
    'STRIPE_SECRET_KEY',
    'LOCAL_AUTH_SECRET',
    'NODE_OPTIONS',
  ])
    assert.equal(config.env[key], undefined)
  assert.ok(isAbsolute(config.env.LOCAL_KEY_VAULT_PATH))
  assert.ok(config.env.LOCAL_KEY_VAULT_PATH.startsWith(homedir()))
  assert.ok(relative(config.env.PGLITE_PATH, config.env.LOCAL_KEY_VAULT_PATH).startsWith('..'))
  assert.notEqual(config.env.LOCAL_KEY_VAULT_PATH, config.env.SOURCE_ERASURE_JOURNAL_PATH)
  assert.equal(
    developmentConfiguration(parent, '/tmp/lilleri-workspace').env.LOCAL_KEY_VAULT_PATH,
    config.env.LOCAL_KEY_VAULT_PATH,
  )
  assert.notEqual(
    developmentConfiguration({ DEV_DATA_PATH: '/tmp/another-store' }, '/tmp/lilleri-workspace').env
      .LOCAL_KEY_VAULT_PATH,
    config.env.LOCAL_KEY_VAULT_PATH,
  )
})

test('interactive configuration refuses production, external databases, authentication and malformed origins', () => {
  for (const overrides of [
    { NODE_ENV: 'production' },
    { LOCAL_AUTH_MODE: '1' },
    { EXPO_PUBLIC_LOCAL_AUTH_MODE: '1' },
    { DEMO_MODE: '0' },
    { DATABASE_URL: 'postgres://synthetic.example/dev' },
    { DATABASE_RUNTIME_URL: 'postgres://synthetic.example/dev' },
    { PG_TEST_DATABASE_URL: 'postgres://synthetic.example/dev' },
    { DEV_HOST: '10.0.0.1' },
    { DEV_PORT: '3191' },
    { DEV_PUBLIC_ORIGIN: 'https://preview.example/path' },
    { DEV_PUBLIC_ORIGIN: 'https://user:password@preview.example' },
  ])
    assert.throws(() => developmentConfiguration(overrides, '/tmp/lilleri-workspace'))
})

test('hosting uses its assigned port and persists independent recovery state outside the database', () => {
  const parent = {
    PORT: '8090',
    DEV_DATA_PATH: '/data/database',
    DEV_RECOVERY_PATH: '/data/recovery',
  }
  const config = developmentConfiguration(parent, '/app')
  assert.equal(config.port, 8090)
  assert.equal(developmentConfiguration({ ...parent, DEV_PORT: '8091' }, '/app').port, 8091)
  assert.equal(config.env.PGLITE_PATH, '/data/database')
  assert.ok(config.env.LOCAL_KEY_VAULT_PATH.startsWith('/data/recovery/'))
  assert.ok(config.env.SOURCE_ERASURE_JOURNAL_PATH.startsWith('/data/recovery/'))
  assert.equal(
    developmentConfiguration(parent, '/app').env.LOCAL_KEY_VAULT_PATH,
    config.env.LOCAL_KEY_VAULT_PATH,
    'a new container using the same paths must reopen the same key vault',
  )
  assert.notEqual(
    developmentConfiguration({ ...parent, DEV_DATA_PATH: '/data/other-database' }, '/app').env
      .LOCAL_KEY_VAULT_PATH,
    config.env.LOCAL_KEY_VAULT_PATH,
  )
  for (const DEV_RECOVERY_PATH of ['/data/database', '/data/database/keys'])
    assert.throws(() => developmentConfiguration({ ...parent, DEV_RECOVERY_PATH }, '/app'))
  assert.throws(() => developmentConfiguration({ ...parent, PORT: '3191' }, '/app'))
})

test('gateway preserves bodies, JSON queries, ZIP bytes and safe response headers while stripping credentials', async () => {
  const f = await fixture()
  try {
    const origin = `http://127.0.0.1:${f.port}`
    const response = await exchange(f.port, '/api/v1/demo?scope=all', {
      method: 'POST',
      headers: {
        origin,
        cookie: 'session=synthetic',
        authorization: 'Bearer synthetic',
        'x-api-key': 'synthetic',
        'x-forwarded-host': 'bad.example',
        'Content-Type': 'application/json',
        Connection: 'keep-alive, x-forbidden',
        'x-forbidden': 'remove-this',
      },
      body: '{"synthetic":"€"}',
    })
    assert.equal(response.status, 200)
    const record = f.records[0]
    assert.equal(record.path, '/v1/demo?scope=all')
    assert.equal(record.body, '{"synthetic":"€"}')
    assert.equal(record.headers.host, `127.0.0.1:${f.apiPort}`)
    assert.equal(record.headers.origin, `http://127.0.0.1:${f.expoPort}`)
    for (const name of ['cookie', 'authorization', 'x-api-key', 'x-forwarded-host', 'x-forbidden'])
      assert.equal(record.headers[name], undefined)
    const archive = await exchange(f.port, '/api/v1/export/archive')
    assert.deepEqual(archive.body, f.zip)
    assert.equal(archive.headers['content-type'], 'application/zip')
    assert.equal(archive.headers['content-disposition'], 'attachment; filename="synthetic.zip"')
    assert.equal(archive.headers['access-control-allow-origin'], undefined)
    assert.equal(archive.headers['set-cookie'], undefined)
  } finally {
    await f.close()
  }
})

test('gateway denies foreign and missing mutation origins, cross-site fetches and non-demo routes', async () => {
  const f = await fixture()
  try {
    for (const headers of [
      { origin: 'https://bad.example' },
      {},
      { origin: `http://127.0.0.1:${f.port}`, 'sec-fetch-site': 'cross-site' },
    ]) {
      const response = await exchange(f.port, '/api/v1/demo', { method: 'POST', headers })
      assert.equal(response.status, 403)
    }
    for (const path of [
      '/api/internal/metrics',
      '/api/api/auth/session',
      '/api/v1/auth/principal',
      '/api/v1/%61uth/principal',
      '/internal/metrics',
      '/%69nternal/metrics',
    ])
      assert.equal((await exchange(f.port, path)).status, 404)
    for (const path of [
      '/api/v1/auth%2fprincipal',
      '/api/v1/../internal/metrics',
      '/api/v1/%2e%2e/internal/metrics',
      '/api/v1/%2561uth/principal',
    ])
      assert.equal((await exchange(f.port, path)).status, 400)
    for (const path of ['/hot', '/api/v1/demo', '/%61pi/v1/demo', '/%69nternal/metrics']) {
      assert.equal(
        (
          await exchange(f.port, path, {
            headers: {
              origin: path === '/hot' ? 'https://bad.example' : `http://127.0.0.1:${f.port}`,
              connection: 'Upgrade',
              upgrade: 'websocket',
            },
          })
        ).status,
        403,
      )
    }
    assert.equal(f.records.length, 0)
    assert.equal((await exchange(f.port, '/api/health')).status, 200)
  } finally {
    await f.close()
  }
})

test('configured public origin accepts a TLS forward only for its exact browser authority', async () => {
  const f = await fixture('https://preview.example')
  try {
    assert.equal(
      (
        await exchange(f.port, '/api/v1/demo', {
          method: 'POST',
          headers: {
            host: 'preview.example',
            origin: 'https://preview.example',
            'x-forwarded-proto': 'https',
          },
        })
      ).status,
      200,
    )
    assert.equal(
      (
        await exchange(f.port, '/api/v1/demo', {
          method: 'POST',
          headers: {
            host: 'elsewhere.example',
            origin: 'https://elsewhere.example',
            'x-forwarded-proto': 'https',
          },
        })
      ).status,
      403,
    )
    assert.equal(f.records.length, 1)
  } finally {
    await f.close()
  }
})

test('Metro assets keep browser Host and hot reload upgrades carry data in both directions', async () => {
  const f = await fixture()
  let socket
  try {
    const origin = `http://127.0.0.1:${f.port}`
    assert.equal(
      (
        await exchange(f.port, '/index.bundle?platform=web', { headers: { origin } })
      ).body.toString(),
      'metro',
    )
    assert.equal(f.records[0].headers.host, `127.0.0.1:${f.port}`)
    socket = await new Promise((resolve, reject) => {
      const request = httpRequest({
        hostname: '127.0.0.1',
        port: f.port,
        path: '/hot',
        headers: { origin, connection: 'Upgrade', upgrade: 'websocket' },
      })
      request.once('upgrade', (_response, connection) => resolve(connection))
      request.once('response', () => reject(new Error('Expected a hot reload upgrade')))
      request.once('error', reject)
      request.end()
    })
    const echoed = new Promise((resolve, reject) => {
      socket.once('data', (chunk) => resolve(chunk.toString()))
      socket.once('error', reject)
    })
    socket.write('synthetic-hmr-message')
    assert.equal(await echoed, 'synthetic-hmr-message')
    assert.equal(f.records[1].websocket, true)
    assert.equal(f.records[1].headers.origin, origin)
  } finally {
    socket?.destroy()
    await f.close()
  }
})

test('resetting a browser during the pending Metro upgrade does not crash the gateway', async () => {
  const f = await fixture(null, { upgradeDelayMs: 150 })
  let socket
  try {
    socket = createConnection({ host: '127.0.0.1', port: f.port })
    socket.on('error', () => {})
    await new Promise((resolve) => socket.once('connect', resolve))
    socket.write(
      `GET /hot HTTP/1.1\r\nHost: 127.0.0.1:${f.port}\r\nOrigin: http://127.0.0.1:${f.port}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`,
    )
    await f.upgradeReceived
    socket.resetAndDestroy()
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.equal((await exchange(f.port, '/api/health')).status, 200)
  } finally {
    socket?.destroy()
    await f.close()
  }
})

test('gateway can reach an Expo server listening only on IPv6 localhost', async (context) => {
  const probe = createServer()
  try {
    await listen(probe, '::1')
  } catch (error) {
    if (['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) {
      context.skip('IPv6 loopback is unavailable in this executor')
      return
    }
    throw error
  } finally {
    await new Promise((resolve) => probe.close(resolve))
  }
  const f = await fixture(null, { expoHost: '::1', gatewayExpoHost: '::1' })
  try {
    const response = await exchange(f.port, '/index.bundle?platform=web')
    assert.equal(response.status, 200)
    assert.equal(response.body.toString(), 'metro')
    assert.equal((await exchange(f.port, '/api/health')).status, 200)
  } finally {
    await f.close()
  }
})

test('rebuilds are serialized and a change during compilation restarts only the newest complete build', async () => {
  let unblock
  let builds = 0
  let restarts = 0
  const queue = createRebuildQueue({
    build: async () => {
      builds += 1
      if (builds === 1)
        await new Promise((resolve) => {
          unblock = resolve
        })
    },
    restart: async () => {
      restarts += 1
    },
    debounceMs: 10_000,
  })
  queue.invalidate()
  const completed = queue.flush()
  queue.invalidate()
  queue.invalidate()
  assert.equal(builds, 1)
  unblock()
  await completed
  assert.equal(builds, 2)
  assert.equal(restarts, 1)
  await queue.close()
})

test('failed builds retain the API; a corrected save rebuilds and closing cancels a pending restart', async () => {
  let failing = true
  let restarts = 0
  const outcomes = []
  const queue = createRebuildQueue({
    build: async () => {
      if (failing) throw new Error('Synthetic compiler failure')
    },
    restart: async () => {
      restarts += 1
    },
    report: (state) => outcomes.push(state),
    debounceMs: 10_000,
  })
  queue.invalidate()
  await queue.flush()
  assert.equal(restarts, 0)
  assert.ok(outcomes.includes('failed'))
  failing = false
  queue.invalidate()
  await queue.flush()
  assert.equal(restarts, 1)
  queue.invalidate()
  await queue.close()
  await queue.flush()
  assert.equal(restarts, 1)
})

test('managed process shutdown waits for graceful SIGTERM completion before returning', async () => {
  const managed = startManagedProcess(
    process.execPath,
    [
      '-e',
      "process.on('SIGTERM', () => setTimeout(() => process.exit(0), 30)); process.stdout.write('ready'); setInterval(() => {}, 1000)",
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  await new Promise((resolve, reject) => {
    managed.child.stdout.once('data', resolve)
    managed.child.once('error', reject)
  })
  const result = managed.finished
  await managed.stop()
  assert.equal((await result).code, 0)
  assert.equal(managed.intentional, true)
  await managed.stop()
})

test('managed cleanup terminates bundler workers after their command wrapper has already exited', async (context) => {
  if (process.platform === 'win32') {
    context.skip('POSIX process-group cleanup')
    return
  }
  const worker =
    "const server = require('node:http').createServer((req,res) => res.end('worker')); server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})))"
  const wrapper = `const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(worker)}], {stdio:['ignore','pipe','ignore']}); child.stdout.once('data', chunk => process.stdout.write(chunk, () => { child.unref(); child.stdout.destroy(); process.exit(0) }))`
  const managed = startManagedProcess(process.execPath, ['-e', wrapper], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    const output = await new Promise((resolve, reject) => {
      managed.child.stdout.once('data', (chunk) => resolve(chunk.toString()))
      managed.child.once('error', reject)
    })
    const { port } = JSON.parse(output)
    assert.equal((await managed.finished).code, 0)
    assert.equal((await exchange(port, '/')).status, 200)
    await managed.stop()
    await new Promise((resolve) => setTimeout(resolve, 20))
    await assert.rejects(exchange(port, '/'))
  } finally {
    await managed.stop()
  }
})
