import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createStaticPreviewServer } from './static.mjs'

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'lilleri-static-'))
  const directory = join(root, 'web')
  await mkdir(directory)
  await writeFile(join(directory, 'index.html'), '<!doctype html><title>Lilleri</title>')
  await writeFile(
    join(directory, 'index-0123456789abcdef0123456789abcdef.js'),
    'globalThis.app = true',
  )
  await writeFile(join(directory, 'font.ttf'), Buffer.from([0, 1, 255, 13]))
  await writeFile(join(root, 'private.json'), '{"private":true}')
  await writeFile(join(directory, '.env'), 'PRIVATE=hidden')
  await writeFile(join(directory, 'source.js.map'), '{"sources":[]}')
  await symlink(join(root, 'private.json'), join(directory, 'escape.json'))
  const server = await createStaticPreviewServer({ directory })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  })
  function get(path, options = {}) {
    return new Promise((resolve, reject) => {
      const call = request(
        { hostname: '127.0.0.1', port: server.address().port, path, ...options },
        (response) => {
          const chunks = []
          response.on('data', (chunk) => chunks.push(chunk))
          response.on('end', () =>
            resolve({
              status: response.statusCode,
              headers: response.headers,
              body: Buffer.concat(chunks),
            }),
          )
        },
      )
      call.on('error', reject)
      call.end()
    })
  }
  return { get }
}

test('compiled frontend navigation, binary fonts and hashed assets retain correct bytes and caching', async (t) => {
  const { get } = await fixture(t)
  const index = await get('/')
  assert.equal(index.status, 200)
  assert.equal(index.headers['cache-control'], 'no-cache')
  assert.equal(index.headers['x-content-type-options'], 'nosniff')
  assert.match(index.body.toString(), /Lilleri/u)
  const navigation = await get('/transactions/123?view=detail', {
    headers: { accept: 'text/html' },
  })
  assert.deepEqual(navigation.body, index.body)
  const font = await get('/font.ttf')
  assert.deepEqual(font.body, Buffer.from([0, 1, 255, 13]))
  assert.equal(font.headers['content-type'], 'font/ttf')
  const asset = await get('/index-0123456789abcdef0123456789abcdef.js')
  assert.equal(asset.headers['cache-control'], 'public, max-age=31536000, immutable')
  assert.match(asset.headers['content-type'], /javascript/u)
  const head = await get('/', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(Number(head.headers['content-length']), index.body.length)
  assert.equal(head.body.length, 0)
})

test('static fallback cannot expose private files, encoded traversal, symlinks, API or missing assets', async (t) => {
  const { get } = await fixture(t)
  for (const path of [
    '/api/health',
    '/internal/metrics',
    '/escape.json',
    '/source.js.map',
    '/missing.js',
    '/missing',
    '/font.ttf/other',
  ]) {
    assert.equal((await get(path)).status, 404, path)
  }
  for (const path of [
    '/.env',
    '/..%2fprivate.json',
    '/%2e%2e/private.json',
    '/%252e%252e/private.json',
    '/a\\b',
    '/%00',
    '//private.json',
  ]) {
    assert.equal((await get(path)).status, 400, path)
  }
  assert.equal((await get('/api/auth/login', { headers: { accept: 'text/html' } })).status, 404)
  assert.equal((await get('/', { method: 'POST' })).status, 405)
})

test('startup refuses an absent compiled export and an entrypoint outside its directory', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'lilleri-no-export-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await assert.rejects(createStaticPreviewServer({ directory: root }))
  const directory = join(root, 'web')
  await mkdir(directory)
  await writeFile(join(root, 'private.html'), '<title>Private</title>')
  await symlink(join(root, 'private.html'), join(directory, 'index.html'))
  await assert.rejects(createStaticPreviewServer({ directory }))
})
