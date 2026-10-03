/** Real Chromium WebCrypto + IndexedDB. Independent fixture; never contacts the financial API. */
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises')
const { createServer } = require('node:http')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { chromium } = require('playwright')
const root = path.resolve(__dirname, '..')
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual smoke artifact path is not a cached Turbo input.
  process.env.LILLERI_OFFLINE_SMOKE_REPORT || '/tmp/lilleri-offline-cache-browser.json'
const report = { status: 'running', checks: [], pageErrors: [] }
async function main() {
  const output = await mkdtemp(path.join(tmpdir(), 'lilleri-offline-fixture-'))
  let browser
  let server
  try {
    // Production files are typechecked by the mobile target. This emits a fresh independent fixture.
    execFileSync(
      path.join(root, 'node_modules/.bin/tsc'),
      [
        '--ignoreConfig',
        '--noCheck',
        '--noEmit',
        'false',
        '--declaration',
        'false',
        '--target',
        'ES2023',
        '--module',
        'ESNext',
        '--moduleResolution',
        'Bundler',
        '--outDir',
        output,
        '--rootDir',
        'apps/mobile/src',
        'apps/mobile/src/offline/cache.ts',
        'apps/mobile/src/offline/indexeddb.ts',
        'apps/mobile/src/offline/types.ts',
      ],
      { cwd: root, stdio: 'pipe' },
    )
    server = createServer(async (request, response) => {
      const pathname = new URL(request.url || '/', 'http://localhost').pathname
      if (pathname === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' })
        response.end(
          '<!doctype html><title>Synthetic encrypted cache fixture</title><script type="module">window.offline = await import("/offline/cache.js");window.types = await import("/offline/types.js");window.storage = await import("/offline/indexeddb.js");window.ready = true</script>',
        )
      } else if (/^\/offline\/(cache|types|indexeddb)(\.js)?$/u.test(pathname)) {
        const filename = pathname.endsWith('.js') ? pathname : `${pathname}.js`
        response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' })
        response.end(await readFile(path.join(output, filename)))
      } else {
        response.writeHead(404)
        response.end()
      }
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    browser = await chromium.launch({
      executablePath: '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox'],
    })
    const page = await browser.newPage()
    page.on('pageerror', (error) => report.pageErrors.push(error.name))
    await page.goto(`http://127.0.0.1:${address.port}`)
    await page.waitForFunction(() => window.ready)
    report.checks = await page.evaluate(async () => {
      const { createWebOfflineCache, createUnavailableOfflineCache } = window.offline
      const { OFFLINE_CACHE_LIMITS } = window.types
      const { OFFLINE_DATABASE_NAME, createIndexedDbCacheStore } = window.storage
      const checks = []
      const assert = (condition, name) => {
        if (!condition) throw new Error(`Fixture assertion: ${name}`)
      }
      const equal = (actual, expected, name) =>
        assert(JSON.stringify(actual) === JSON.stringify(expected), name)
      const check = (name) => checks.push(name)
      const snapshot = {
        profile: { id: 'synthetic-cache-profile' },
        accounts: [{ balance: { amountMinor: '900719925474099301', currency: 'EUR' } }],
        transactions: [{ bookedOn: '2026-10-03', description: 'SYNTHETIC_PRIVATE_MARKER' }],
        analysis: { originalServerSummary: 'Complete original server summary' },
      }
      const validateSnapshot = (value) => value?.accounts && value?.transactions && value?.analysis
      const deferred = () => {
        let resolve
        const promise = new Promise((done) => {
          resolve = done
        })
        return { resolve, promise }
      }
      let generated = 0
      const cryptoPort = {
        subtle: {
          async generateKey(...args) {
            const key = await crypto.subtle.generateKey(...args)
            assert(
              key.extractable === false &&
                key.algorithm.name === 'AES-GCM' &&
                key.algorithm.length === 256,
              'volatile AES-256 non-extractable key',
            )
            let denied = false
            try {
              await crypto.subtle.exportKey('raw', key)
            } catch {
              denied = true
            }
            assert(denied, 'key export must be denied')
            generated++
            return key
          },
          digest: crypto.subtle.digest.bind(crypto.subtle),
          encrypt: crypto.subtle.encrypt.bind(crypto.subtle),
          decrypt: crypto.subtle.decrypt.bind(crypto.subtle),
        },
        getRandomValues: crypto.getRandomValues.bind(crypto),
      }
      function fixture(override = {}) {
        let wall = Date.now(),
          monotonic = 100
        const discarded = []
        const cache = createWebOfflineCache({
          validateSnapshot,
          crypto: cryptoPort,
          now: () => wall,
          monotonicNow: () => monotonic,
          scheduleExpiry: () => () => {},
          onDiscard: (reason) => discarded.push(reason),
          ...override,
        })
        return {
          cache,
          discarded,
          demo: (epoch = 1, profileId = snapshot.profile.id) => ({
            mode: 'demo',
            profileId,
            sessionId: 'synthetic-session',
            identityEpoch: epoch,
            ttlMs: OFFLINE_CACHE_LIMITS.maxDemoTtlMs,
          }),
          advance(ms) {
            wall += ms
            monotonic += ms
          },
          rollbackWall() {
            wall--
          },
          rollbackMonotonic() {
            monotonic--
          },
          get wall() {
            return wall
          },
        }
      }
      async function stored(change) {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(OFFLINE_DATABASE_NAME, 1)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(new Error('fixture storage unavailable'))
        })
        return new Promise((resolve, reject) => {
          const transaction = db.transaction('ciphertext', change ? 'readwrite' : 'readonly')
          const store = transaction.objectStore('ciphertext')
          const request = store.get('current')
          let row
          request.onsuccess = () => {
            row = request.result ?? null
            if (change && row) {
              change(row)
              store.put(row, 'current')
            }
          }
          transaction.oncomplete = () => {
            db.close()
            resolve(row)
          }
          transaction.onabort = () => {
            db.close()
            reject(new Error('fixture transaction failed'))
          }
        })
      }
      let f = fixture()
      assert(await f.cache.authorize(f.demo()), 'demo authorization')
      assert(await f.cache.writeVerified(snapshot), 'write original overview')
      const result = await f.cache.read()
      equal(result.snapshot, snapshot, 'exact original server view')
      assert(result.status === 'ready' && result.readOnly === true, 'read-only provenance')
      const encrypted = await stored()
      equal(
        Object.keys(encrypted).sort(),
        [
          'authorizationId',
          'ciphertext',
          'contextHash',
          'expiresAt',
          'iv',
          'plaintextBytes',
          'savedAt',
          'sequence',
          'version',
        ],
        'ciphertext-only fields',
      )
      assert(
        encrypted.ciphertext instanceof ArrayBuffer &&
          encrypted.iv.byteLength === 12 &&
          encrypted.ciphertext.byteLength === encrypted.plaintextBytes + 16,
        'real IndexedDB encrypted binary',
      )
      assert(
        !new TextDecoder().decode(encrypted.ciphertext).includes('SYNTHETIC_PRIVATE_MARKER'),
        'no plaintext ciphertext bytes',
      )
      assert(!JSON.stringify(encrypted).includes(snapshot.profile.id), 'opaque identity metadata')
      assert(generated > 0, 'official browser non-extractable crypto invoked')
      check(
        'real IndexedDB ciphertext only and non-extractable AES-256-GCM preserve exact money/server summary',
      )

      const reload = fixture()
      equal(await reload.cache.read(), { status: 'empty' }, 'no reload recovery')
      await reload.cache.authorize(reload.demo(2))
      equal(
        await reload.cache.read(),
        { status: 'empty' },
        'new online identity cannot decrypt previous instance',
      )
      await reload.cache.discard('logout')
      check('new page instance cannot recover old data without new verified snapshot')

      for (const reason of [
        'logout',
        'unauthorized',
        'revocation',
        'profile_changed',
        'deletion',
      ]) {
        f = fixture()
        await f.cache.authorize(f.demo())
        await f.cache.writeVerified(snapshot)
        const clearing = f.cache.discard(reason)
        equal(await f.cache.read(), { status: 'empty' }, `${reason} synchronous key fence`)
        await clearing
        equal(await stored(), null, `${reason} storage removed`)
        assert(f.discarded.includes(reason), `${reason} displayed-view invalidation callback`)
      }
      check(
        'logout,401,revocation,profile switch and deletion synchronously fence keys and clear ciphertext',
      )

      f = fixture()
      await f.cache.authorize({
        mode: 'authenticated',
        identityEpoch: 1,
        session: {
          user: {
            id: 'user',
            name: 'Synthetic',
            email: 'synthetic@example.test',
            twoFactorEnabled: false,
          },
          principal: {
            userId: 'user',
            profileId: snapshot.profile.id,
            sessionId: 'session',
            role: 'owner',
          },
          expiresAt: new Date(f.wall + 1000).toISOString(),
        },
      })
      await f.cache.writeVerified(snapshot)
      assert((await stored()).expiresAt === f.wall + 1000, 'actual auth session expiry')
      f.advance(1000)
      equal(await f.cache.read(), { status: 'expired' }, 'auth exact expiry')
      f = fixture()
      await f.cache.authorize(f.demo())
      await f.cache.writeVerified(snapshot)
      f.advance(OFFLINE_CACHE_LIMITS.defaultMaxAgeMs)
      equal(await f.cache.read(), { status: 'expired' }, 'stale cache deadline')
      check('real auth expiry and bounded cache staleness expire without read renewal')

      for (const clock of ['wall', 'monotonic']) {
        f = fixture()
        await f.cache.authorize(f.demo())
        await f.cache.writeVerified(snapshot)
        if (clock === 'wall') f.rollbackWall()
        else f.rollbackMonotonic()
        equal(await f.cache.read(), { status: 'invalid' }, `${clock} rollback`)
        await f.cache.discard('logout')
      }
      check('wall and monotonic clock rollback fail closed')

      for (const field of ['ciphertext', 'savedAt', 'contextHash']) {
        f = fixture()
        await f.cache.authorize(f.demo())
        await f.cache.writeVerified(snapshot)
        f.advance(10)
        await stored((row) => {
          if (field === 'ciphertext') new Uint8Array(row.ciphertext)[0] ^= 1
          else if (field === 'savedAt') row.savedAt++
          else row.contextHash = '0'.repeat(64)
        })
        equal(
          await f.cache.read(),
          { status: 'invalid' },
          `${field} authenticated corruption rejection`,
        )
        equal(await stored(), null, `${field} corruption removed`)
      }
      check(
        'ciphertext corruption,metadata AAD tampering and foreign identity context reject plaintext',
      )

      let barrier = deferred(),
        entered = deferred(),
        pause = true
      const delayedEncryption = {
        ...cryptoPort,
        subtle: {
          ...cryptoPort.subtle,
          async encrypt(...args) {
            const ciphertext = await crypto.subtle.encrypt(...args)
            if (pause) {
              entered.resolve()
              await barrier.promise
            }
            return ciphertext
          },
        },
      }
      f = fixture({ crypto: delayedEncryption })
      await f.cache.authorize(f.demo())
      const writing = f.cache.writeVerified(snapshot)
      await entered.promise
      await f.cache.authorize(f.demo(2, 'other-profile'))
      pause = false
      const other = { ...snapshot, profile: { id: 'other-profile' } }
      assert(await f.cache.writeVerified(other), 'new identity ciphertext')
      barrier.resolve()
      assert((await writing) === false, 'old delayed write denied')
      equal((await f.cache.read()).snapshot, other, 'new identity preserved after old write')
      await f.cache.discard('logout')
      check('delayed old encryption cannot recreate cache or overwrite new profile ciphertext')

      barrier = deferred()
      entered = deferred()
      pause = true
      const delayedDecryption = {
        ...cryptoPort,
        subtle: {
          ...cryptoPort.subtle,
          async decrypt(...args) {
            const plaintext = await crypto.subtle.decrypt(...args)
            if (pause) {
              entered.resolve()
              await barrier.promise
            }
            return plaintext
          },
        },
      }
      f = fixture({ crypto: delayedDecryption })
      await f.cache.authorize(f.demo())
      await f.cache.writeVerified(snapshot)
      const reading = f.cache.read()
      await entered.promise
      await f.cache.discard('logout')
      barrier.resolve()
      equal(await reading, { status: 'empty' }, 'delayed decrypted plaintext fenced')
      check('delayed decrypted read cannot expose financial data after logout')

      f = fixture()
      await f.cache.authorize(f.demo())
      await f.cache.writeVerified(snapshot)
      const previous = await stored()
      f.advance(10)
      await f.cache.writeVerified({
        ...snapshot,
        analysis: { originalServerSummary: 'New original server view' },
      })
      await stored((row) => {
        Object.assign(row, previous)
      })
      equal(
        await f.cache.read(),
        { status: 'invalid' },
        'replayed earlier authentic ciphertext denied',
      )
      check('same-page rollback of an earlier valid encrypted snapshot fails closed')

      f = fixture()
      assert(
        !(await f.cache.authorize({ ...f.demo(), ttlMs: OFFLINE_CACHE_LIMITS.maxDemoTtlMs + 1 })),
        'demo TTL bound',
      )
      await f.cache.authorize(f.demo())
      assert(
        !(await f.cache.writeVerified({
          ...snapshot,
          analysis: { originalServerSummary: 'x'.repeat(OFFLINE_CACHE_LIMITS.maxPlaintextBytes) },
        })),
        'payload bytes bound',
      )
      equal(await stored(), null, 'oversized data not stored')
      const native = createUnavailableOfflineCache()
      assert(native.support === 'unavailable', 'native unavailable')
      equal(await native.read(), { status: 'unsupported' }, 'no native plaintext fallback')
      check('explicit demo TTL,payload bounds and unavailable native port are enforced')

      const expiration = deferred()
      const timer = createWebOfflineCache({
        validateSnapshot,
        maxAgeMs: 75,
        onDiscard: (reason) => {
          if (reason === 'expired') expiration.resolve()
        },
      })
      await timer.authorize({
        mode: 'demo',
        profileId: snapshot.profile.id,
        sessionId: 'timer-session',
        identityEpoch: 3,
        ttlMs: 1000,
      })
      assert(await timer.writeVerified(snapshot), 'timer fixture write')
      await expiration.promise
      equal(await timer.read(), { status: 'expired' }, 'automatic expiry without a read')
      equal(await stored(), null, 'expired ciphertext removed')
      check('real browser expiry timer drops memory authorization and signals UI invalidation')

      // Exercise the production adapter directly to confirm canceled transaction leases never persist.
      const listeners = new Set()
      const transactionOpened = deferred()
      let active = true
      const lease = {
        isCurrent: () => active,
        onCancel: (listener) => {
          listeners.add(listener)
          transactionOpened.resolve()
          return () => listeners.delete(listener)
        },
      }
      const store = createIndexedDbCacheStore()
      const pending = store.write(encrypted, lease)
      await transactionOpened.promise
      active = false
      for (const listener of listeners) listener()
      assert((await pending) === false, 'canceled storage write')
      equal(await stored(), null, 'canceled storage record absent')
      check('production IndexedDB adapter rejects canceled identity lease before persistence')
      return checks
    })
    assert.equal(report.checks.length, 12)
    assert.deepEqual(report.pageErrors, [])
    report.status = 'passed'
    for (const name of report.checks) console.log(`PASS ${name}`)
  } catch (error) {
    report.status = 'failed'
    report.failure = error.message
    throw error
  } finally {
    await browser?.close()
    if (server) await new Promise((resolve) => server.close(resolve))
    await rm(output, { recursive: true, force: true })
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Report ${reportPath}`)
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
