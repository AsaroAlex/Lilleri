import type { Database } from '@lilleri/database'
import type {
  InstitutionPage,
  ProviderAccount,
  ProviderConnectionGrant,
  ProviderContext,
  ProviderDiscoveryMetadata,
  ProviderPage,
  SyntheticSyncMetadata,
  SyntheticSyncPage,
  SyntheticSyncPageRequest,
  SyntheticSyncSnapshot,
} from '@lilleri/financial-providers'
import type { LiveBankProvider } from './bank-connections.js'
import { recordConsentProviderSignal } from './consent-lifecycle.js'
import { Problem } from './problem.js'
import type { FinancialScope } from './request-scope.js'

export interface LiveProviderGuardOptions {
  readonly scope: FinancialScope
  /** Automatic bank access is a Plus benefit; every provider read checks it first (cost guard). */
  readonly plan: (db: Database, profileId: string) => Promise<'gratis' | 'plus'>
  readonly now?: () => string
  readonly onFailure?: () => void
}
const reconsentRequired = (error: unknown) =>
  error !== null &&
  typeof error === 'object' &&
  'code' in error &&
  (error as { code: unknown }).code === 'reconsent_required'

/**
 * Wraps the official provider for the hosted service: blocks provider reads for profiles
 * without Plus and turns a bank-side consent loss into the lifecycle's "action required"
 * state, so the user sees "Ricollega" instead of silent retries.
 */
export class GuardedLiveProvider implements LiveBankProvider {
  readonly id: string
  constructor(
    readonly inner: LiveBankProvider,
    readonly options: LiveProviderGuardOptions,
  ) {
    this.id = inner.id
  }
  private now() {
    return new Date(this.options.now?.() ?? new Date().toISOString()).toISOString()
  }
  private async assertPlus(context: ProviderContext) {
    const plan = await this.options.scope(context.profileId, (db) =>
      this.options.plan(db, context.profileId),
    )
    if (plan !== 'plus')
      throw new Problem(
        409,
        'plus_required',
        'Il collegamento automatico delle banche è incluso in Lilleri Plus.',
      )
  }
  private async read<T>(context: ProviderContext, work: () => Promise<T>): Promise<T> {
    await this.assertPlus(context)
    try {
      return await work()
    } catch (error) {
      if (!reconsentRequired(error)) throw error
      try {
        await this.options.scope(context.profileId, (db) =>
          recordConsentProviderSignal(
            db,
            context.profileId,
            context.connectionId,
            'requires_action',
            this.now(),
          ),
        )
      } catch {
        this.options.onFailure?.()
      }
      throw new Problem(
        409,
        'consent_inactive',
        'L’accesso alla banca deve essere rinnovato. Usa «Ricollega» per continuare.',
      )
    }
  }
  capabilities() {
    return this.inner.capabilities()
  }
  discoveryMetadata(): ProviderDiscoveryMetadata {
    return this.inner.discoveryMetadata()
  }
  listInstitutions(cursor?: string | null): Promise<InstitutionPage> {
    return this.inner.listInstitutions(cursor)
  }
  institutions(country: string) {
    return this.inner.institutions(country)
  }
  startAuthorization(input: Parameters<LiveBankProvider['startAuthorization']>[0]) {
    return this.inner.startAuthorization(input)
  }
  completeAuthorization(code: string) {
    return this.inner.completeAuthorization(code)
  }
  registerPresence(
    sessionId: string,
    psu: { readonly ipAddress: string; readonly userAgent: string },
    ttlMs?: number,
  ) {
    this.inner.registerPresence(sessionId, psu, ttlMs)
  }
  createConnection(context: ProviderContext): Promise<ProviderConnectionGrant> {
    return this.inner.createConnection(context)
  }
  renewConnection(context: ProviderContext): Promise<ProviderConnectionGrant> {
    return this.inner.renewConnection(context)
  }
  refreshConnection(context: ProviderContext): Promise<void> {
    return this.read(context, () => this.inner.refreshConnection(context))
  }
  listAccounts(context: ProviderContext): Promise<readonly ProviderAccount[]> {
    return this.read(context, () => this.inner.listAccounts(context))
  }
  getBalances(context: ProviderContext): Promise<readonly ProviderAccount[]> {
    return this.read(context, () => this.inner.getBalances(context))
  }
  getTransactions(
    context: ProviderContext,
    accountId: string,
    cursor?: string | null,
  ): Promise<ProviderPage> {
    return this.read(context, () => this.inner.getTransactions(context, accountId, cursor))
  }
  /** Revocation must work for every profile, including deleted or downgraded ones. */
  disconnect(context: ProviderContext): Promise<void> {
    return this.inner.disconnect(context)
  }
  syncMetadata(): SyntheticSyncMetadata {
    return this.inner.syncMetadata()
  }
  openSync(
    context: ProviderContext,
    mode: 'user_present' | 'unattended',
    requestedAt?: string,
  ): Promise<SyntheticSyncSnapshot> {
    return this.read(context, () => this.inner.openSync(context, mode, requestedAt))
  }
  /** Pages are served from the snapshot opened above; no further bank access happens here. */
  getSyncPage(
    context: ProviderContext,
    request: SyntheticSyncPageRequest,
  ): Promise<SyntheticSyncPage> {
    return this.inner.getSyncPage(context, request)
  }
}
