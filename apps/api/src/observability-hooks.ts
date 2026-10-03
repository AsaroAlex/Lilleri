import type { FastifyInstance, FastifyRequest } from 'fastify'
import { type Observability, operationForRoute } from './observability.js'

/** Invoke before routes/hooks. Never accesses headers, bodies, URL, query, params, user or error. */
export function registerObservabilityHooks(app: FastifyInstance, observability: Observability) {
  const requests = new WeakMap<FastifyRequest, (statusCode: number) => void>()
  app.addHook('onRequest', async (request) => {
    requests.set(
      request,
      observability.startRequest(operationForRoute(request.method, request.routeOptions.url)),
    )
  })
  app.addHook('onResponse', async (request, reply) => {
    requests.get(request)?.(reply.statusCode)
    requests.delete(request)
  })
}
