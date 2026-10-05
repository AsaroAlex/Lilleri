/** Public brand directory. Entry IDs are Lilleri IDs, never provider institution IDs. */
export type ConnectionDirectoryKind = 'bank' | 'card' | 'wallet'
export type ConnectionDirectoryAccountKind = 'current' | 'card' | 'cash' | 'savings'
export interface ConnectionDirectoryEntry {
  readonly id: string
  readonly name: string
  readonly kind: ConnectionDirectoryKind
  readonly aliases: readonly string[]
  readonly officialUrl: string
  readonly automatic: {
    readonly state: 'available' | 'configuration_required' | 'unverified' | 'unsupported'
    readonly providerId: string | null
    readonly institutionId: string | null
    readonly accountKinds: readonly ConnectionDirectoryAccountKind[]
    readonly reason:
      | 'provider_configuration_required'
      | 'private_access_required'
      | 'coverage_not_verified'
      | 'personal_account_unsupported'
      | null
    readonly evidenceUrl: string | null
  }
  readonly statement: {
    /** Available requires institution-specific export evidence, not generic parser support. */
    readonly state: 'available' | 'unverified' | 'unsupported'
    readonly formats: readonly ('csv' | 'xlsx')[]
    readonly guideUrl: string | null
    readonly evidenceUrls: readonly string[]
    readonly reason: 'format_not_verified' | 'pdf_not_supported' | null
  }
}
export interface ConnectionDirectory {
  readonly country: 'IT'
  readonly revision: string
  readonly prerequisites: {
    readonly privateAccess: 'ready' | 'required'
    readonly bankProvider: 'ready' | 'required'
  }
  readonly entries: readonly ConnectionDirectoryEntry[]
}
