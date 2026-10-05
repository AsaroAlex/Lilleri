import { BANK_DIRECTORY_COUNTRY_NAMES } from './i18n/bank-picker-messages'

interface SearchableService {
  readonly name: string
  readonly aliases: readonly string[]
  readonly countryCode?: string
}

/** Older Italian directory responses do not include a per-entry market. */
export function bankServiceCountry(entry: SearchableService): string {
  return entry.countryCode ?? 'IT'
}

/** Issuer names remain unchanged; only the searchable index is normalised. */
function normalise(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-GB')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function matchesBankService(entry: SearchableService, query: string): boolean {
  const search = normalise(query)
  if (!search) return true
  const countryCode = bankServiceCountry(entry)
  const countryNames =
    BANK_DIRECTORY_COUNTRY_NAMES[countryCode as keyof typeof BANK_DIRECTORY_COUNTRY_NAMES] ?? []
  const fields = [entry.name, ...entry.aliases].map(normalise)
  const countryFields = [countryCode, ...countryNames].map(normalise)
  // "Uni Credit", "B.P.M." and "Crédit Agricole" work without changing brand names.
  const compactQuery = search.replace(/\s/g, '')
  if (fields.some((value) => value.replace(/\s/g, '').includes(compactQuery))) return true
  if (countryFields.some((value) => value.replace(/\s/g, '').startsWith(compactQuery))) return true
  const searchable = fields.join(' ')
  const countryWords = countryFields.flatMap((value) => value.split(/\s+/))
  // Country words use prefixes: searching ING must not match every bank in United Kingdom.
  return search
    .split(/\s+/)
    .every(
      (token) => searchable.includes(token) || countryWords.some((word) => word.startsWith(token)),
    )
}

/** A chosen market and service type continue to apply while the user searches. */
export function filterBankServices<T extends SearchableService & { readonly kind: string }>(
  entries: readonly T[],
  query: string,
  kind: string,
  countryCode: string,
): readonly T[] {
  return entries.filter(
    (entry) =>
      (countryCode === 'all' || bankServiceCountry(entry) === countryCode) &&
      (kind === 'all' || entry.kind === kind) &&
      matchesBankService(entry, query),
  )
}
