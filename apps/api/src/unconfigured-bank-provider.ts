import type {
  InstitutionPage,
  ProviderAccount,
  ProviderConnectionGrant,
  ProviderDiscoveryMetadata,
  ProviderPage,
  SyntheticSyncMetadata,
  SyntheticSyncPage,
  SyntheticSyncSnapshot,
} from '@lilleri/financial-providers'
import type { LiveBankProvider } from './bank-connections.js'
import { Problem } from './problem.js'

const unavailable = () =>
  new Problem(
    409,
    'bank_provider_unavailable',
    'Il collegamento automatico con le banche non è ancora attivo.',
  )
const evidence = 'https://enablebanking.com/docs/api/reference/'

/** Stand-in until official provider credentials are configured: every bank operation refuses. */
export class UnconfiguredBankProvider implements LiveBankProvider {
  readonly id = 'enable-banking'
  capabilities() {
    return {
      accountInformation: true as const,
      payments: false as const,
      synthetic: false,
      grantSpecificRevocation: true,
    }
  }
  discoveryMetadata(): ProviderDiscoveryMetadata {
    return {
      providerId: this.id,
      environment: 'live',
      coverageVersion: 'unconfigured',
      pagination: { maxPageSize: 1, maxPages: 1, maxCursorBytes: 1 },
      refresh: { userPresent: 'unknown', unattendedBudget: null },
      renewal: 'unknown',
    }
  }
  syncMetadata(): SyntheticSyncMetadata {
    return {
      providerId: this.id,
      environment: 'live',
      evidenceReference: evidence,
      userPresent: 'unknown',
      unattendedBudget: null,
      maxWindowDays: 1,
      maxPageSize: 1,
      maxCursorBytes: 1,
      pendingSet: 'unknown',
      deletionEvidence: 'unknown',
    }
  }
  async listInstitutions(): Promise<InstitutionPage> {
    return { institutions: [], nextCursor: null, coverageVersion: 'unconfigured' }
  }
  async institutions() {
    return []
  }
  async startAuthorization(): Promise<never> {
    throw unavailable()
  }
  async completeAuthorization(): Promise<never> {
    throw unavailable()
  }
  registerPresence() {}
  async createConnection(): Promise<ProviderConnectionGrant> {
    throw unavailable()
  }
  async renewConnection(): Promise<ProviderConnectionGrant> {
    throw unavailable()
  }
  async refreshConnection(): Promise<void> {
    throw unavailable()
  }
  async listAccounts(): Promise<readonly ProviderAccount[]> {
    throw unavailable()
  }
  async getBalances(): Promise<readonly ProviderAccount[]> {
    throw unavailable()
  }
  async getTransactions(): Promise<ProviderPage> {
    throw unavailable()
  }
  /** Without credentials a remote grant cannot be revoked; the outbox keeps retrying. */
  async disconnect(): Promise<void> {
    throw unavailable()
  }
  async openSync(): Promise<SyntheticSyncSnapshot> {
    throw unavailable()
  }
  async getSyncPage(): Promise<SyntheticSyncPage> {
    throw unavailable()
  }
}
