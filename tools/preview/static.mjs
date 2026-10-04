import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function inside(directory, path) {
  const remainder = relative(directory, path)
  return remainder === '' || (!isAbsolute(remainder) && remainder.split(sep)[0] !== '..')
}

function requestPath(raw) {
  const path = raw.split('?')[0]
  if (!path.startsWith('/') || path.startsWith('//') || /%2f|%5c/iu.test(path))
    throw new Error('Invalid path')
  const decoded = decodeURIComponent(path)
  if (
    /[\\%]/u.test(decoded) ||
    [...decoded].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new Error('Invalid path')
  if (decoded.split('/').some((part) => part.startsWith('.'))) throw new Error('Invalid path')
  return decoded
}

function refuse(response, status) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(status === 404 ? 'Not found' : 'Invalid request')
}

/** Serve only the compiled Expo web export; API requests remain on the reviewed gateway. */
export async function createStaticPreviewServer({ directory }) {
  const root = await realpath(directory)
  const index = await realpath(resolve(root, 'index.html'))
  if (!inside(root, index) || !(await stat(index)).isFile())
    throw new Error('A compiled web export with index.html is required')
  return createServer((request, response) => {
    void (async () => {
      if (!['GET', 'HEAD'].includes(request.method ?? '')) {
        refuse(response, 405)
        return
      }
      let pathname
      try {
        pathname = requestPath(request.url ?? '/')
      } catch {
        refuse(response, 400)
        return
      }
      if (/^\/(?:api|internal)(?:\/|$)/u.test(pathname) || pathname.endsWith('.map')) {
        refuse(response, 404)
        return
      }
      let file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
      if (!inside(root, file)) {
        refuse(response, 400)
        return
      }
      let details
      try {
        file = await realpath(file)
        if (!inside(root, file)) {
          refuse(response, 404)
          return
        }
        details = await stat(file)
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error
        // Only extensionless application navigation falls back to the exported entrypoint.
        if (extname(pathname) || !String(request.headers.accept ?? '').includes('text/html')) {
          refuse(response, 404)
          return
        }
        file = index
        details = await stat(index)
      }
      if (!details.isFile()) {
        refuse(response, 404)
        return
      }
      const extension = extname(file).toLowerCase()
      if (!contentTypes[extension]) {
        refuse(response, 404)
        return
      }
      const immutable = /[a-f0-9]{32,}/u.test(pathname) && extension !== '.html'
      response.writeHead(200, {
        'Content-Type': contentTypes[extension],
        'Content-Length': details.size,
        'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
      })
      if (request.method === 'HEAD') response.end()
      else await pipeline(createReadStream(file), response)
    })().catch(() => {
      if (!response.headersSent) refuse(response, 500)
      else response.destroy()
    })
  })
}
