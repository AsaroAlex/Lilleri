/** Capability IDs are independent of plan labels, store products and provider identifiers. */
export const NEVER_GATED_CAPABILITIES = [
  'ledger.read',
  'ledger.correct',
  'categorisation.automatic',
  'categorisation.learn',
  'categorisation.rules',
  'categorisation.custom_categories',
  'reconciliation.decide',
  'reconciliation.evidence',
  'reconciliation.undo',
  'privacy.controls',
  'consent.disconnect',
  'data.export',
  'data.delete',
  'security.controls',
  'source.manual',
  'source.csv',
] as const
export const LATER_CAPABILITIES = [
  'household.share',
  'financial.chat',
  'receipt.ocr',
  'offers.account_data',
] as const
export type CapabilityId =
  | (typeof NEVER_GATED_CAPABILITIES)[number]
  | (typeof LATER_CAPABILITIES)[number]
  | 'source.bank.multiple_institutions'
export type EntitlementPlan = 'gratis' | 'plus' | 'closed_beta'

/** Input belongs to a trusted server adapter. No client flag or receipt grants paid access. */
export interface VerifiedPlusState {
  readonly status: 'active' | 'grace' | 'cancelled' | 'pending' | 'expired' | 'refunded'
  readonly validUntil: string
}
export interface EntitlementContext {
  readonly mode: 'closed_beta' | 'commercial'
  readonly now: string
  readonly verifiedPlus?: VerifiedPlusState
}
export interface CapabilityEntitlements {
  readonly policyVersion: 'capabilities-v1'
  readonly plan: EntitlementPlan
  readonly capabilities: Readonly<Record<CapabilityId, boolean>>
  /** Billing is absent from this implementation, including in the synthetic closed beta. */
  readonly purchaseAvailable: false
  readonly automaticCharge: false
}

function instant(value: string): number {
  const milliseconds = Date.parse(value)
  if (!Number.isFinite(milliseconds)) throw new Error('Invalid entitlement instant')
  return milliseconds
}
export function resolveEntitlements(context: EntitlementContext): CapabilityEntitlements {
  const now = instant(context.now),
    grant = context.verifiedPlus,
    hasPlus =
      grant !== undefined &&
      ['active', 'grace', 'cancelled'].includes(grant.status) &&
      instant(grant.validUntil) > now,
    plan = context.mode === 'closed_beta' ? 'closed_beta' : hasPlus ? 'plus' : 'gratis'
  const capabilities = Object.fromEntries([
    ...NEVER_GATED_CAPABILITIES.map((id) => [id, true]),
    ...LATER_CAPABILITIES.map((id) => [id, false]),
    ['source.bank.multiple_institutions', plan !== 'gratis'],
  ]) as Record<CapabilityId, boolean>
  return {
    policyVersion: 'capabilities-v1',
    plan,
    capabilities,
    purchaseAvailable: false,
    automaticCharge: false,
  }
}

export interface ConnectedSource {
  readonly institutionId: string
  readonly accountId: string
}
export interface ConnectedSourceEnvelope {
  readonly maxInstitutions: number
  readonly maxAccounts: number
}
export interface SourceAdmissionPolicy {
  readonly version: string
  /** Must be explicitly approved/configured before any production connected-source caller. */
  readonly liveConnectionsEnabled: boolean
  readonly gratis: ConnectedSourceEnvelope
  /** Unknown contracted/tested limits are represented as absent, never as unlimited. */
  readonly plus?: ConnectedSourceEnvelope
}
export const LOCAL_SOURCE_POLICY: SourceAdmissionPolicy = {
  version: 'source-envelope-local-v1',
  liveConnectionsEnabled: false,
  gratis: { maxInstitutions: 1, maxAccounts: 2 },
}
export type SourceAdmission =
  | { readonly allowed: true }
  | {
      readonly allowed: false
      readonly code:
        | 'live_connections_unavailable'
        | 'connected_source_policy_unconfigured'
        | 'connected_source_limit'
    }

/**
 * Capacity applies to future live connections only. Imports/manual accounts and all retained
 * ledger rows are outside this admission check. Synthetic fixtures are never discarded.
 */
export function admitSource(input: {
  readonly source: 'manual' | 'csv' | 'synthetic' | 'live_bank'
  readonly entitlements: CapabilityEntitlements
  readonly policy: SourceAdmissionPolicy
  readonly active: readonly ConnectedSource[]
  readonly requested: readonly ConnectedSource[]
}): SourceAdmission {
  if (input.source !== 'live_bank') return { allowed: true }
  if (!input.policy.liveConnectionsEnabled)
    return { allowed: false, code: 'live_connections_unavailable' }
  const envelope = input.entitlements.plan === 'gratis' ? input.policy.gratis : input.policy.plus
  if (!envelope) return { allowed: false, code: 'connected_source_policy_unconfigured' }
  if (
    !Number.isSafeInteger(envelope.maxInstitutions) ||
    !Number.isSafeInteger(envelope.maxAccounts) ||
    envelope.maxInstitutions < 1 ||
    envelope.maxAccounts < 1
  )
    throw new Error('Invalid connected-source envelope')
  const accounts = new Map<string, string>()
  for (const item of [...input.active, ...input.requested]) {
    if (!item.accountId || !item.institutionId) throw new Error('Invalid connected source')
    const previousInstitution = accounts.get(item.accountId)
    if (previousInstitution && previousInstitution !== item.institutionId)
      throw new Error('An account cannot belong to two institutions')
    accounts.set(item.accountId, item.institutionId)
  }
  return accounts.size <= envelope.maxAccounts &&
    new Set(accounts.values()).size <= envelope.maxInstitutions
    ? { allowed: true }
    : { allowed: false, code: 'connected_source_limit' }
}
