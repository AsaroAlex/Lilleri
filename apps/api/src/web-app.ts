import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AppExtension } from './app.js'

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
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
  '.txt': 'text/plain; charset=utf-8',
}
/** Paths owned by the API or third-party callbacks never fall back to the web application. */
const RESERVED = /^\/(?:v1|api|internal|webhooks|connect|legal|health|openapi\.json)(?:\/|$)/u
/** react-native-web injects style elements at runtime; scripts come only from this origin. */
export const WEB_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

function inside(directory: string, path: string) {
  const remainder = relative(directory, path)
  return remainder === '' || (!isAbsolute(remainder) && remainder.split(sep)[0] !== '..')
}
function requestPath(raw: string): string | null {
  const path = raw.split('?')[0] ?? ''
  if (!path.startsWith('/') || path.startsWith('//') || /%2f|%5c/iu.test(path)) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(path)
  } catch {
    return null
  }
  if (
    /[\\%]/u.test(decoded) ||
    [...decoded].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return null
  // Hidden files and traversal segments are never served.
  if (decoded.split('/').some((part) => part.startsWith('.'))) return null
  return decoded
}
export function securityHeaders(reply: FastifyReply) {
  return reply
    .header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
    .header('X-Content-Type-Options', 'nosniff')
    .header('X-Frame-Options', 'DENY')
    .header('Referrer-Policy', 'no-referrer')
    .header('Cross-Origin-Opener-Policy', 'same-origin')
    .header('Cross-Origin-Resource-Policy', 'same-origin')
    .header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    )
}

const NOT_FOUND_PAGE = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Pagina non trovata · Lilleri</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#F5F5F7;color:#1D1D1F;padding:16px}main{max-width:28rem;text-align:center}a{color:#005AC1}@media (prefers-color-scheme:dark){body{background:#0B0C0F;color:#F5F5F7}a{color:#79ACFF}}</style></head>
<body><main><h1>Pagina non trovata</h1><p>L’indirizzo che hai aperto non esiste. <a href="/">Torna alla pagina iniziale</a> oppure <a href="/app">apri Lilleri</a>.</p></main></body></html>
`

export interface WebAppOptions {
  readonly directory: string
  /**
   * Path the application is served under. With `/app`, only `/app` and `/app/...` fall back to the
   * exported entry point, and `/` is left to a public page (it redirects to the app when none is
   * registered). Defaults to `/`, where every extensionless navigation opens the application.
   */
  readonly appPath?: '/' | `/${string}`
}

/** Serves the compiled Expo web export from the same HTTPS origin as the API. */
export async function createWebAppExtension(options: WebAppOptions): Promise<AppExtension> {
  const appPath = options.appPath ?? '/'
  if (appPath !== '/' && !/^\/[a-z][a-z0-9-]{0,30}$/u.test(appPath))
    throw new Error('The web app path must be a single lowercase segment')
  const root = await realpath(options.directory)
  const index = await realpath(resolve(root, 'index.html'))
  if (!inside(root, index) || !(await stat(index)).isFile())
    throw new Error('A compiled web export with index.html is required')
  const refuse = (reply: FastifyReply, status: 400 | 404) =>
    securityHeaders(reply)
      .code(status)
      .header('Cache-Control', 'no-store')
      .type('text/plain; charset=utf-8')
      .send(status === 404 ? 'Not found' : 'Invalid request')
  const serve = async (request: FastifyRequest, reply: FastifyReply) => {
    const pathname = requestPath(request.url)
    if (pathname === null) return refuse(reply, 400)
    if (RESERVED.test(pathname) || pathname.endsWith('.map')) return refuse(reply, 404)
    const appRoute = appPath !== '/' && (pathname === appPath || pathname.startsWith(`${appPath}/`))
    if (appPath !== '/' && pathname === '/')
      return securityHeaders(reply).header('Cache-Control', 'no-store').redirect(appPath, 302)
    let file = appRoute ? index : resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!inside(root, file)) return refuse(reply, 400)
    let details: Awaited<ReturnType<typeof stat>>
    try {
      file = await realpath(file)
      if (!inside(root, file)) return refuse(reply, 404)
      details = await stat(file)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw error
      // Only extensionless application navigation falls back to the exported entry point.
      if (extname(pathname) || !String(request.headers.accept ?? '').includes('text/html'))
        return refuse(reply, 404)
      if (appPath !== '/')
        return securityHeaders(reply)
          .code(404)
          .header('Cache-Control', 'no-store')
          .header('Content-Security-Policy', WEB_CONTENT_SECURITY_POLICY)
          .type('text/html; charset=utf-8')
          .send(NOT_FOUND_PAGE)
      file = index
      details = await stat(index)
    }
    if (!details.isFile()) return refuse(reply, 404)
    const extension = extname(file).toLowerCase()
    const type = CONTENT_TYPES[extension]
    if (!type) return refuse(reply, 404)
    const immutable = /[a-f0-9]{32,}/u.test(pathname) && extension !== '.html'
    securityHeaders(reply)
      .code(200)
      .type(type)
      .header('Content-Length', details.size)
      .header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache')
    if (extension === '.html') reply.header('Content-Security-Policy', WEB_CONTENT_SECURITY_POLICY)
    if (request.method === 'HEAD') return reply.send()
    return reply.send(createReadStream(file))
  }
  return (app) => {
    if (appPath === '/') app.route({ method: ['GET', 'HEAD'], url: '/', handler: serve })
    else app.route({ method: ['GET', 'HEAD'], url: appPath, handler: serve })
    app.route({ method: ['GET', 'HEAD'], url: '/*', handler: serve })
  }
}
