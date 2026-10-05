interface SearchableService {
  readonly name: string
  readonly aliases: readonly string[]
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
  const fields = [entry.name, ...entry.aliases].map(normalise)
  // "Uni Credit", "B.P.M." and "Crédit Agricole" work without changing brand names.
  const compactQuery = search.replace(/\s/g, '')
  if (fields.some((value) => value.replace(/\s/g, '').includes(compactQuery))) return true
  const searchable = fields.join(' ')
  return search.split(/\s+/).every((token) => searchable.includes(token))
}
