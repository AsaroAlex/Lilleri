import { leaveForSecureUrl } from './secure-redirect'

/** Web: the bank returns to the web application. */
export const BANK_RETURN_TARGET: 'web' | 'app' = 'web'
/** Web: the whole page leaves for the bank and comes back through `/app?bank=…`. */
export async function openBankAuthorization(
  value: unknown,
): Promise<'left' | 'opened' | 'blocked'> {
  return leaveForSecureUrl(value)
}
