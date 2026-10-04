import { createServer, request as httpRequest } from 'node:http'

const hopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])
const credentials = new Set(['authorization', 'cookie', 'proxy-authorization', 'x-api-key'])
const corsHeaders = new Set([
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-headers',
  'access-control-allow-methods',
  'access-control-expose-headers',
  'set-cookie',
])
function copiedHeaders(headers, excluded = new Set()) {
  const connection = new Set(
    String(headers.connection ?? '')
      .toLowerCase()
      .split(/\s*,\s*/u),
  )
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => !hopHeaders.has(name) && !connection.has(name) && !excluded.has(name),
    ),
  )
}
function requestOrigin(request) {
  const host = request.headers.host
  if (typeof host !== 'string' || /[\s,/@\\]/u.test(host)) return null
  const forwardedProtocol = request.headers['x-forwarded-proto']
  const protocol = forwardedProtocol === 'https' ? 'https' : 'http'
  try {
    const url = new URL(`${protocol}://${host}`)
    return url.origin
  } catch {
    return null
  }
}
function permitted(request, publicOrigin, port) {
  const expected = requestOrigin(request)
  if (!expected || request.headers['sec-fetch-site'] === 'cross-site') return false
  if (publicOrigin) {
    const loopback = new Set([
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
      `http://[::1]:${port}`,
    ])
    if (expected !== publicOrigin && !loopback.has(expected)) return false
  }
  const origin = request.headers.origin
  if (origin !== undefined && origin !== expected) return false
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method ?? '') && origin === undefined)
    return false
  return true
}
function pathnameOf(path) {
  const raw = path.split('?')[0]
  if (!raw.startsWith('/') || raw.startsWith('//') || /%2f|%5c/iu.test(raw))
    throw new Error('Invalid development path')
  const pathname = decodeURIComponent(raw)
  if (
    pathname.includes('%') ||
    pathname.includes('\\') ||
    pathname.split('/').some((part) => part === '.' || part === '..')
  )
    throw new Error('Ambiguous development path')
  return pathname
}
function destination(path, apiPort, expoPort) {
  const decoded = pathnameOf(path)
  if (decoded.startsWith('/api/') || decoded === '/api') {
    if (!path.startsWith('/api/') && path !== '/api') return null
    const apiPath = path.slice(4) || '/'
    const pathname = decoded.slice(4) || '/'
    if (
      pathname !== '/health' &&
      (!pathname.startsWith('/v1/') || /^\/v1\/auth(?:\/|$)/u.test(pathname))
    )
      return null
    return { api: true, port: apiPort, path: apiPath }
  }
  if (
    decoded.startsWith('/internal/') ||
    decoded === '/internal' ||
    decoded.startsWith('/api/auth')
  )
    return null
  return { api: false, port: expoPort, path }
}
function refusal(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(message)
}

/** Development-only, same-origin browser access to a loopback synthetic API and Metro. */
export function createDevelopmentGateway({
  apiPort,
  expoPort,
  expoHost = 'localhost',
  port = 8080,
  publicOrigin = null,
}) {
  const sockets = new Set()
  const upstreamRequests = new Set()
  const server = createServer((request, response) => {
    if (!permitted(request, publicOrigin, port)) {
      refusal(response, 403, 'This browser origin cannot use the development preview.')
      return
    }
    const path = request.url ?? '/'
    if (!path.startsWith('/') || path.startsWith('//')) {
      refusal(response, 400, 'Invalid development request.')
      return
    }
    let target
    try {
      target = destination(path, apiPort, expoPort)
    } catch {
      refusal(response, 400, 'Invalid development request.')
      return
    }
    if (!target) {
      refusal(response, 404, 'This route is unavailable in the synthetic preview.')
      return
    }
    const headers = copiedHeaders(request.headers, credentials)
    if (target.api) {
      headers.host = `127.0.0.1:${apiPort}`
      headers.origin = `http://127.0.0.1:${expoPort}`
      for (const name of Object.keys(headers))
        if (name.startsWith('x-forwarded-') || name === 'forwarded') delete headers[name]
    }
    const upstream = httpRequest(
      {
        hostname: target.api ? '127.0.0.1' : expoHost,
        port: target.port,
        path: target.path,
        method: request.method,
        headers,
      },
      (incoming) => {
        response.writeHead(incoming.statusCode ?? 502, copiedHeaders(incoming.headers, corsHeaders))
        incoming.pipe(response)
        incoming.once('error', () => response.destroy())
      },
    )
    upstreamRequests.add(upstream)
    upstream.once('close', () => upstreamRequests.delete(upstream))
    upstream.setTimeout(120_000, () => upstream.destroy(new Error('Development upstream timeout')))
    upstream.once('error', () => {
      if (!response.headersSent) refusal(response, 502, 'The development service is restarting.')
      else response.destroy()
    })
    request.once('aborted', () => upstream.destroy())
    response.once('close', () => upstream.destroy())
    request.pipe(upstream)
  })
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
  })
  server.on('upgrade', (request, client, head) => {
    let upstream
    // A client can reset while Metro is still preparing the upgrade handshake.
    client.once('error', () => upstream?.destroy())
    const path = request.url ?? '/'
    let allowedPath = false
    try {
      const decoded = pathnameOf(path)
      allowedPath = !decoded.startsWith('/api') && !decoded.startsWith('/internal')
    } catch {
      // Reject ambiguous encoded paths before opening an upstream hot reload connection.
    }
    if (!permitted(request, publicOrigin, port) || !allowedPath) {
      client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
      return
    }
    const headers = copiedHeaders(request.headers, credentials)
    headers.connection = 'Upgrade'
    headers.upgrade = request.headers.upgrade ?? 'websocket'
    upstream = httpRequest({ hostname: expoHost, port: expoPort, path, headers })
    upstreamRequests.add(upstream)
    upstream.once('close', () => upstreamRequests.delete(upstream))
    upstream.once('upgrade', (incoming, remote, remoteHead) => {
      sockets.add(remote)
      remote.once('close', () => sockets.delete(remote))
      const responseHeaders = copiedHeaders(incoming.headers, corsHeaders)
      responseHeaders.connection = 'Upgrade'
      responseHeaders.upgrade = incoming.headers.upgrade ?? 'websocket'
      client.write(`HTTP/1.1 ${incoming.statusCode} ${incoming.statusMessage}\r\n`)
      for (const [name, value] of Object.entries(responseHeaders))
        for (const item of Array.isArray(value) ? value : [value])
          client.write(`${name}: ${item}\r\n`)
      client.write('\r\n')
      if (head.length) remote.write(head)
      if (remoteHead.length) client.write(remoteHead)
      remote.pipe(client)
      client.pipe(remote)
      remote.once('error', () => client.destroy())
      client.once('error', () => remote.destroy())
      client.once('close', () => remote.destroy())
      remote.once('close', () => client.destroy())
    })
    const failed = () => client.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n')
    upstream.once('response', (incoming) => {
      incoming.resume()
      failed()
    })
    upstream.once('error', failed)
    client.once('close', () => upstream.destroy())
    upstream.end()
  })
  return {
    server,
    async close() {
      for (const request of upstreamRequests) request.destroy()
      for (const socket of sockets) socket.destroy()
      await new Promise((resolve) => server.close(resolve))
    },
  }
}
