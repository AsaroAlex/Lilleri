import type { FinancialDataProvider } from '@lilleri/financial-providers'

const admitted = new WeakSet<FinancialDataProvider>()

/** Only the hosted entry point calls this, for the configured official provider instance.
 * Every other construction path keeps failing closed for non-synthetic providers.
 */
export function admitLiveProvider(provider: FinancialDataProvider): void {
  const capabilities = provider.capabilities()
  if (capabilities.synthetic || !capabilities.grantSpecificRevocation)
    throw new Error('Only grant-specific live providers can be admitted')
  admitted.add(provider)
}
export function isAdmittedLiveProvider(provider: FinancialDataProvider): boolean {
  return admitted.has(provider)
}
/** Synthetic providers or an explicitly admitted live provider, always with per-grant revocation. */
export function providerAdmitted(provider: FinancialDataProvider): boolean {
  const capabilities = provider.capabilities()
  return capabilities.grantSpecificRevocation && (capabilities.synthetic || admitted.has(provider))
}
