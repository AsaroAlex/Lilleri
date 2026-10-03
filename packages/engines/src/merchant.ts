import {
  MERCHANT_DICTIONARY_VERSION,
  MERCHANT_NORMALIZER_VERSION,
  type MerchantAlias,
  type MerchantInput,
  type MerchantNormalization,
  type MerchantResolution,
  type PaymentSemanticHint,
  type TransactionKind,
} from '@lilleri/domain'

const INTERMEDIARIES = new Set(['paypal', 'sumup', 'nexi', 'stripe'])
const CONTROL = /\p{Cf}/u
function supportedText(value: string, maximum: number): boolean {
  return !(
    typeof value !== 'string' ||
    value.length > maximum ||
    CONTROL.test(value) ||
    [...value].some((character) => {
      const code = character.codePointAt(0) ?? 0
      return (code < 32 && ![9, 10, 13].includes(code)) || code === 127
    })
  )
}
function bounded(value: string, maximum: number): string {
  if (!supportedText(value, maximum)) throw new Error('Invalid merchant evidence')
  return value
}

/** Comparison only: original source text is returned unchanged in normalization. */
export function normalizedMerchantKey(value: string): string {
  return bounded(value, 500)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ')
}

function extract(value: string) {
  const intermediary = /^\s*(PAYPAL|SUMUP|NEXI|STRIPE)\s*[*|]\s*(.{1,200}?)\s*$/iu.exec(value)
  if (intermediary?.[1] && intermediary[2])
    return {
      name: intermediary[2],
      intermediary: intermediary[1].toLowerCase(),
      pattern: 'generic-it-v1:intermediary-delimiter',
    }
  const card =
    /^\s*PAGAMENTO\s+(?:POS|CARTA)\s*[|:]\s*(.{1,200}?)\s*(?:\|\s*\d{2}\/\d{2}\/\d{4})?\s*$/iu.exec(
      value,
    )
  return card?.[1]
    ? { name: card[1], intermediary: null, pattern: 'generic-it-v1:card-delimiter' }
    : null
}

export function normalizeMerchant(input: MerchantInput): MerchantNormalization {
  bounded(input.transactionId, 200)
  bounded(input.profileId, 200)
  if (!input.transactionId || !input.profileId) throw new Error('Missing merchant ownership')
  if (input.bankPatternId !== undefined && input.bankPatternId !== 'generic-it-v1')
    throw new Error('Unknown merchant pattern version')
  // A valid ledger row may contain source text outside this recognizer's supported alphabet.
  // Reading and exporting that row must retain the original text and abstain locally.
  if (
    !supportedText(input.description, 500) ||
    (input.merchantName !== null && !supportedText(input.merchantName, 256))
  )
    return {
      transactionId: input.transactionId,
      profileId: input.profileId,
      originalDescription: input.description,
      originalMerchantName: input.merchantName,
      normalizedKey: null,
      candidateKeys: [],
      extractedName: null,
      status: 'unknown',
      source: 'none',
      intermediary: null,
      normalizerVersion: MERCHANT_NORMALIZER_VERSION,
      evidence: ['unsupported_source_text'],
    }
  const fromName = input.merchantName ? extract(input.merchantName) : null
  const fromDescription = extract(input.description)
  const suppliedName = fromName?.name ?? input.merchantName
  const suppliedKey = suppliedName ? normalizedMerchantKey(suppliedName) : ''
  const descriptorKey = fromDescription ? normalizedMerchantKey(fromDescription.name) : ''
  const keys = [...new Set([suppliedKey, descriptorKey].filter(Boolean))]
  const ambiguous = keys.length > 1
  const candidate = keys[0] ?? null
  const bareIntermediary = candidate !== null && INTERMEDIARIES.has(candidate)
  const known = !ambiguous && candidate !== null && !bareIntermediary
  return {
    transactionId: input.transactionId,
    profileId: input.profileId,
    originalDescription: input.description,
    originalMerchantName: input.merchantName,
    normalizedKey: known ? candidate : null,
    candidateKeys: keys,
    extractedName: known ? (suppliedName ?? fromDescription?.name ?? null) : null,
    status: ambiguous ? 'ambiguous' : known ? 'candidate' : 'unknown',
    source: suppliedKey ? 'provider_merchant' : descriptorKey ? 'descriptor_pattern' : 'none',
    intermediary:
      fromName?.intermediary ??
      fromDescription?.intermediary ??
      (bareIntermediary ? candidate : null),
    normalizerVersion: MERCHANT_NORMALIZER_VERSION,
    evidence: [
      ...(suppliedKey ? ['source:provider-merchant-name'] : []),
      ...[fromName, fromDescription].flatMap((pattern) =>
        pattern ? [`pattern:${pattern.pattern}`] : [],
      ),
      ...(ambiguous ? ['conflicting-source-merchant-hints'] : []),
      ...(bareIntermediary ? ['payment-intermediary-is-not-a-merchant'] : []),
    ],
  }
}

/** Original local seed, no measured bank/vendor coverage or category-confidence assertion. */
const DICTIONARY: Readonly<Record<string, { readonly id: string; readonly name: string }>> =
  Object.freeze({
    coop: { id: 'merchant:coop', name: 'Coop' },
    esselunga: { id: 'merchant:esselunga', name: 'Esselunga' },
    amazon: { id: 'merchant:amazon', name: 'Amazon' },
    ikea: { id: 'merchant:ikea', name: 'IKEA' },
    netflix: { id: 'merchant:netflix', name: 'Netflix' },
    spotify: { id: 'merchant:spotify', name: 'Spotify' },
    trenitalia: { id: 'merchant:trenitalia', name: 'Trenitalia' },
    enel: { id: 'merchant:enel', name: 'Enel' },
    tim: { id: 'merchant:tim', name: 'TIM' },
    booking: { id: 'merchant:booking', name: 'Booking' },
    mcdonalds: { id: 'merchant:mcdonalds', name: 'McDonald’s' },
    'mc donald s': { id: 'merchant:mcdonalds', name: 'McDonald’s' },
    'mcdonald s': { id: 'merchant:mcdonalds', name: 'McDonald’s' },
  })

export interface MerchantResolutionOptions {
  readonly aliases?: readonly MerchantAlias[]
  readonly globalDictionaryEnabled?: boolean
  readonly excludedTransactionIds?: readonly string[]
}

export function resolveMerchant(
  input: MerchantInput,
  options: MerchantResolutionOptions = {},
): MerchantResolution {
  const base: Omit<MerchantResolution, 'status'> = {
    transactionId: input.transactionId,
    merchantId: null,
    displayName: null,
    normalizedKey: null,
    source: 'none' as const,
    normalizerVersion: MERCHANT_NORMALIZER_VERSION,
    dictionaryVersion: null,
    aliasId: null,
    aliasRevision: null,
    evidence: [] as readonly string[],
  }
  // Suppression precedes parsing and returns no hidden merchant evidence, identity or label.
  if (options.excludedTransactionIds?.includes(input.transactionId))
    return { ...base, status: 'suppressed' }
  const normalized = normalizeMerchant(input)
  if (normalized.status !== 'candidate' || normalized.normalizedKey === null)
    return {
      ...base,
      status: normalized.status === 'ambiguous' ? 'ambiguous' : 'unknown',
      evidence: normalized.evidence,
    }
  const aliases = (options.aliases ?? []).filter(
    (alias) =>
      alias.profileId === input.profileId &&
      !alias.archived &&
      alias.normalizedKey === normalized.normalizedKey,
  )
  if (
    aliases.some(
      (alias) =>
        !alias.id ||
        !alias.merchantId ||
        !alias.displayName ||
        !Number.isInteger(alias.revision) ||
        alias.revision < 1,
    )
  )
    throw new Error('Invalid merchant alias')
  const identities = new Set(
    aliases.map((alias) => JSON.stringify([alias.merchantId, alias.displayName])),
  )
  if (identities.size > 1)
    return { ...base, status: 'ambiguous', evidence: ['conflicting-private-merchant-aliases'] }
  const alias = aliases[0]
  if (alias)
    return {
      ...base,
      status: 'resolved',
      merchantId: alias.merchantId,
      displayName: alias.displayName,
      normalizedKey: normalized.normalizedKey,
      source: 'user',
      aliasId: alias.id,
      aliasRevision: alias.revision,
      evidence: [
        `private-alias:${alias.id}`,
        `private-alias-revision:${alias.revision}`,
        ...normalized.evidence,
      ],
    }
  const known =
    options.globalDictionaryEnabled !== false && Object.hasOwn(DICTIONARY, normalized.normalizedKey)
      ? DICTIONARY[normalized.normalizedKey]
      : undefined
  if (!known)
    return {
      ...base,
      status: 'unknown',
      normalizedKey: normalized.normalizedKey,
      evidence: normalized.evidence,
    }
  return {
    ...base,
    status: 'resolved',
    merchantId: known.id,
    displayName: known.name,
    normalizedKey: normalized.normalizedKey,
    source: 'dictionary',
    dictionaryVersion: MERCHANT_DICTIONARY_VERSION,
    evidence: [`dictionary:${MERCHANT_DICTIONARY_VERSION}`, ...normalized.evidence],
  }
}

export function italianPaymentHint(
  description: string,
  declaredKind?: TransactionKind,
): PaymentSemanticHint {
  if (!supportedText(description, 500))
    return {
      type: null,
      status: 'unknown',
      kind: null,
      version: 'italian-payment-hints-v1',
      evidence: ['unsupported_source_text'],
    }
  const text = bounded(description, 500).normalize('NFKC').toUpperCase()
  const definitions = [
    ['f24', /\bF24\b/u, 'expense'],
    ['pagopa_cbill', /\b(?:PAGOPA|CBILL)\b/u, 'expense'],
    ['mav_rav', /\b(?:MAV|RAV)\b/u, 'expense'],
    ['bill', /\bBOLLETTINO\b/u, 'expense'],
    ['direct_debit', /\b(?:SDD|ADDEBITO DIRETTO)\b/u, 'expense'],
    ['wallet_topup', /\bRICARICA WALLET\b/u, 'transfer'],
    ['cash_withdrawal', /\b(?:PRELIEVO ATM|PRELIEVO CONTANTI)\b/u, 'cash_withdrawal'],
    ['card_settlement', /\b(?:SALDO CARTA|ADDEBITO CARTA DI CREDITO)\b/u, 'card_settlement'],
    ['salary', /\bSTIPENDIO\b/u, 'income'],
    ['pension', /\bPENSIONE\b/u, 'income'],
  ] as const
  const found = definitions.filter(([, pattern]) => pattern.test(text))
  const hint = found[0]
  if (!hint)
    return {
      type: null,
      status: 'unknown',
      kind: null,
      version: 'italian-payment-hints-v1',
      evidence: [],
    }
  if (found.length > 1 || (declaredKind !== undefined && declaredKind !== hint[2]))
    return {
      type: null,
      status: 'conflict',
      kind: null,
      version: 'italian-payment-hints-v1',
      evidence: ['conflicting-payment-hints'],
    }
  return {
    type: hint[0],
    status: 'hint',
    kind: hint[2],
    version: 'italian-payment-hints-v1',
    evidence: [`descriptor-hint:${hint[0]}`, 'not-a-verified-provider-code'],
  }
}
