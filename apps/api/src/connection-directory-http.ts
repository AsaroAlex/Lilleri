import { CONNECTION_DIRECTORY_COUNTRY_CODES } from '@lilleri/domain'
import { buildEuropeanConnectionDirectory } from '@lilleri/financial-providers'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

const directorySchema = z.object({
  country: z.literal('IT'),
  countries: z.array(z.enum(CONNECTION_DIRECTORY_COUNTRY_CODES)),
  revision: z.string(),
  prerequisites: z.object({
    privateAccess: z.enum(['ready', 'required']),
    bankProvider: z.enum(['ready', 'required']),
  }),
  entries: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      countryCode: z.enum(CONNECTION_DIRECTORY_COUNTRY_CODES),
      kind: z.enum(['bank', 'card', 'wallet']),
      aliases: z.array(z.string()),
      officialUrl: z.url(),
      automatic: z.object({
        state: z.enum(['available', 'configuration_required', 'unverified', 'unsupported']),
        providerId: z.string().nullable(),
        institutionId: z.string().nullable(),
        accountKinds: z.array(z.enum(['current', 'card', 'cash', 'savings'])),
        reason: z
          .enum([
            'provider_configuration_required',
            'private_access_required',
            'coverage_not_verified',
            'personal_account_unsupported',
          ])
          .nullable(),
        evidenceUrl: z.url().nullable(),
      }),
      statement: z.object({
        state: z.enum(['available', 'unverified', 'unsupported']),
        formats: z.array(z.enum(['csv', 'xlsx'])),
        guideUrl: z.url().nullable(),
        evidenceUrls: z.array(z.url()),
        reason: z.enum(['format_not_verified', 'pdf_not_supported']).nullable(),
      }),
    }),
  ),
})

/** Public metadata only. The current synthetic runtime has no admitted live authorization route. */
export function registerConnectionDirectoryRoutes(
  app: FastifyInstance,
  personalAccessReady: boolean,
) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/connection-directory',
    {
      schema: { response: { 200: directorySchema } },
    },
    async () => directorySchema.parse(buildEuropeanConnectionDirectory({ personalAccessReady })),
  )
}
