import { randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import {
  isProfileTimezone,
  PROFILE_LOCALE,
  type ProfileSettings,
  type ProfileSettingsEvent,
  type ProfileSettingsValues,
  resolveEntitlements,
} from '@lilleri/domain'
import { asc, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { notFound, Problem } from './problem.js'
import { profileSettings, profileSettingsEvents } from './settings-schema.js'

const revision = z.number().int().positive().max(2_147_483_646)
export const settingsValuesSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value)),
    locale: z.literal(PROFILE_LOCALE),
    timezone: z.string().max(100).refine(isProfileTimezone),
  })
  .strict()
export const settingsDtoSchema = settingsValuesSchema.extend({
  profileId: z.string(),
  revision: z.number().int().positive(),
  updatedAt: z.string(),
})
export const settingsEventDtoSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  revision: z.number().int().min(2),
  before: settingsValuesSchema,
  after: settingsValuesSchema,
  createdAt: z.string(),
})
const entitlementsDto = z.object({
  policyVersion: z.literal('capabilities-v1'),
  plan: z.enum(['gratis', 'plus', 'closed_beta']),
  capabilities: z.record(z.string(), z.boolean()),
  purchaseAvailable: z.literal(false),
  automaticCharge: z.literal(false),
})
const responseDto = z.object({ settings: settingsDtoSchema, entitlements: entitlementsDto })
const problemDto = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
})
const errors = {
  400: problemDto,
  401: problemDto,
  403: problemDto,
  404: problemDto,
  409: problemDto,
  500: problemDto,
}
const changed = () =>
  new Problem(
    409,
    'settings_changed',
    'Le impostazioni sono cambiate. Aggiorna i dati prima di salvare di nuovo.',
  )
const valuesOf = (settings: ProfileSettings): ProfileSettingsValues => ({
  displayName: settings.displayName,
  locale: settings.locale,
  timezone: settings.timezone,
})

/** Profile-bound preferences. The caller must derive the profile from trusted configuration/session. */
export class SettingsService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly now: () => string = () => new Date().toISOString(),
  ) {}
  async read(db: Database = this.db): Promise<ProfileSettings> {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, this.profileId))
    if (!profile) throw notFound()
    const [stored] = await db
      .select()
      .from(profileSettings)
      .where(eq(profileSettings.profileId, this.profileId))
    return {
      profileId: profile.id,
      displayName: profile.name,
      locale: stored?.locale ?? PROFILE_LOCALE,
      timezone: profile.timezone,
      revision: stored?.revision ?? 1,
      updatedAt: stored?.updatedAt ?? profile.createdAt,
    }
  }
  async get() {
    return this.db.transaction(
      async (db) => ({
        settings: await this.read(db),
        entitlements: resolveEntitlements({ mode: 'closed_beta', now: this.now() }),
      }),
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    )
  }
  async update(expectedRevision: number, input: ProfileSettingsValues) {
    const parsed = settingsValuesSchema.safeParse(input)
    if (!parsed.success || !revision.safeParse(expectedRevision).success)
      throw new Problem(
        400,
        'invalid_settings',
        'Controlla il nome del profilo, la lingua e il fuso orario.',
      )
    const after = parsed.data
    return this.db.transaction(async (db) => {
      const [profile] = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.profileId))
        .for('update')
      if (!profile) throw notFound()
      const before = await this.read(db)
      if (before.revision !== expectedRevision) throw changed()
      const now = this.now(),
        nextRevision = before.revision + 1
      if (JSON.stringify(valuesOf(before)) === JSON.stringify(after))
        return {
          settings: before,
          entitlements: resolveEntitlements({ mode: 'closed_beta', now }),
        }
      await db
        .update(schema.profiles)
        .set({ name: after.displayName, timezone: after.timezone })
        .where(eq(schema.profiles.id, this.profileId))
      await db
        .insert(profileSettings)
        .values({
          profileId: this.profileId,
          locale: after.locale,
          revision: nextRevision,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: profileSettings.profileId,
          set: { locale: after.locale, revision: nextRevision, updatedAt: now },
        })
      await db.insert(profileSettingsEvents).values({
        id: `settings_event_${randomUUID()}`,
        profileId: this.profileId,
        revision: nextRevision,
        before: valuesOf(before),
        after,
        createdAt: now,
      })
      return {
        settings: await this.read(db),
        entitlements: resolveEntitlements({ mode: 'closed_beta', now }),
      }
    })
  }
  async exportAudit(db: Database = this.db): Promise<{
    settings: ProfileSettings
    events: readonly ProfileSettingsEvent[]
  }> {
    return {
      settings: await this.read(db),
      events: await db
        .select()
        .from(profileSettingsEvents)
        .where(eq(profileSettingsEvents.profileId, this.profileId))
        .orderBy(asc(profileSettingsEvents.revision)),
    }
  }
}

export function registerSettingsRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<SettingsService>,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  api.get(
    '/v1/settings',
    { schema: { response: { 200: responseDto, ...errors } } },
    async (request) => (await resolve(request)).get(),
  )
  api.patch(
    '/v1/settings',
    {
      schema: {
        body: settingsValuesSchema.extend({ revision }),
        response: { 200: responseDto, ...errors },
      },
    },
    async (request) => {
      const { revision, ...values } = request.body
      return (await resolve(request)).update(revision, values)
    },
  )
}
