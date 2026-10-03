/** Local planning only. No provider, payment, telemetry or filesystem writes. */
function integer(value, name, max = 1_000_000_000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max)
    throw new Error(`${name} must be a nonnegative integer <= ${max}`)
  return value
}

function object(value, keys, name) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error(`${name} must contain exactly: ${keys.join(', ')}`)
}

function roundRatio(numerator, denominator) {
  return safeAmount((BigInt(numerator) * 2n + BigInt(denominator)) / (BigInt(denominator) * 2n))
}

function safeAmount(value) {
  const amount = Number(value)
  if (!Number.isSafeInteger(amount))
    throw new Error('Scenario exceeds exact supported cent arithmetic')
  return amount
}

export function formatEuroCents(cents) {
  if (cents === null) return 'non determinabile'
  if (!Number.isSafeInteger(cents)) throw new Error('Amount must be exact integer cents')
  const amount = BigInt(cents)
  const absolute = amount < 0n ? -amount : amount
  return `${amount < 0n ? '-' : ''}${absolute / 100n},${String(absolute % 100n).padStart(2, '0')} €`
}

export function validateZeroBudgetPolicy(policy) {
  object(
    policy,
    [
      'schemaVersion',
      'mode',
      'initialInvestmentCents',
      'externalServicesBudgetCents',
      'freeExpires',
      'bankConnectionsEnabled',
      'externalInferenceEnabled',
      'checkoutEnabled',
      'pricesForTesting',
      'minimumCashCoverageMonths',
    ],
    'policy',
  )
  if (
    policy.schemaVersion !== 1 ||
    policy.mode !== 'local-synthetic' ||
    policy.initialInvestmentCents !== 0 ||
    policy.externalServicesBudgetCents !== 0 ||
    policy.freeExpires !== false ||
    policy.bankConnectionsEnabled !== false ||
    policy.externalInferenceEnabled !== false ||
    policy.checkoutEnabled !== false
  )
    throw new Error('This launcher requires permanent free access and zero paid external services')
  object(policy.pricesForTesting, ['monthlyCents', 'annualCents'], 'pricesForTesting')
  integer(policy.pricesForTesting.monthlyCents, 'monthlyCents')
  integer(policy.pricesForTesting.annualCents, 'annualCents')
  integer(policy.minimumCashCoverageMonths, 'minimumCashCoverageMonths', 120)
  if (policy.minimumCashCoverageMonths < 12)
    throw new Error('Reserve at least twelve months before modelling annual bank service')
  return policy
}

export function netReceiptCents(grossCents, vatBps, paymentBps, billingBps, fixedCents) {
  integer(grossCents, 'grossCents')
  integer(vatBps, 'vatBps', 10_000)
  integer(paymentBps, 'paymentBps', 10_000)
  integer(billingBps, 'billingBps', 10_000)
  integer(fixedCents, 'fixedCents')
  if (paymentBps + billingBps > 10_000) throw new Error('Total percentage fees exceed 100%')
  const exVat = roundRatio(BigInt(grossCents) * 10_000n, 10_000 + vatBps)
  const fees = roundRatio(BigInt(grossCents) * BigInt(paymentBps + billingBps), 10_000)
  return exVat - fees - fixedCents
}

/** Public-list benchmark, not an Italian contractual quote. Amounts are ex VAT. */
export function finapiBenchmarkCents(users) {
  integer(users, 'users', 1_000_000)
  // An active contract has a minimum invoice even with no remaining users.
  let accessCents = users <= 200 ? 6_000 : 30_000
  let lower = 1_000
  for (const [upper, priceCents] of [
    [5_000, 30],
    [10_000, 27],
    [25_000, 24],
    [50_000, 21],
    [100_000, 18],
    [1_000_000, 15],
  ]) {
    accessCents += Math.max(0, Math.min(users, upper) - lower) * priceCents
    lower = upper
  }
  const managedAisCents = Math.max(20_000, Math.min(100_000, Math.ceil(users / 100) * 10_000))
  return { accessCents, managedAisCents, totalCents: accessCents + managedAisCents }
}

export function assessEconomics(scenario, policy) {
  validateZeroBudgetPolicy(policy)
  const counters = ['monthlySubscribers', 'annualSubscribers', 'freeUsers']
  const money = [
    'cashAvailableAfterObligationsCents',
    'monthlyPriceCents',
    'annualPriceCents',
    'paymentFixedFeeCents',
    'fixedMonthlyCostCents',
    'paidUserMonthlyCostCents',
    'freeUserMonthlyCostCents',
  ]
  const percentages = [
    'vatBasisPoints',
    'paymentFeeBasisPoints',
    'billingFeeBasisPoints',
    'refundReserveBasisPoints',
  ]
  object(
    scenario,
    ['schemaVersion', ...counters, ...money, ...percentages, 'unknownCosts', 'bank'],
    'scenario',
  )
  if (scenario.schemaVersion !== 1) throw new Error('Unsupported scenario version')
  for (const key of counters) integer(scenario[key], key, 1_000_000)
  for (const key of money) integer(scenario[key], key)
  for (const key of percentages) integer(scenario[key], key, 10_000)
  if (
    !Array.isArray(scenario.unknownCosts) ||
    scenario.unknownCosts.length > 20 ||
    scenario.unknownCosts.some(
      (cost) => typeof cost !== 'string' || !cost.trim() || cost.length > 160,
    )
  )
    throw new Error('unknownCosts must list unresolved costs explicitly')
  const bank = scenario.bank
  const invoices = ['monthlyNetInvoiceCents', 'monthlyCashInvoiceCents', 'setupCashCents']
  const evidence = [
    'writtenQuoteVerified',
    'licenceRouteVerified',
    'productionReady',
    'billingAndPaidBenefitReady',
  ]
  object(bank, [...invoices, 'commitmentMonths', ...evidence], 'bank')
  for (const key of invoices) if (bank[key] !== null) integer(bank[key], key)
  if (bank.commitmentMonths !== null) {
    integer(bank.commitmentMonths, 'commitmentMonths', 120)
    if (bank.commitmentMonths === 0)
      throw new Error('A bank commitment must cover at least one month')
  }
  for (const key of evidence)
    if (typeof bank[key] !== 'boolean') throw new Error(`${key} must be boolean`)
  if (
    bank.monthlyCashInvoiceCents !== null &&
    bank.monthlyNetInvoiceCents !== null &&
    bank.monthlyCashInvoiceCents < bank.monthlyNetInvoiceCents
  )
    throw new Error('The cash invoice cannot be less than its net expense')
  const receipt = (gross) =>
    netReceiptCents(
      gross,
      scenario.vatBasisPoints,
      scenario.paymentFeeBasisPoints,
      scenario.billingFeeBasisPoints,
      scenario.paymentFixedFeeCents,
    )
  const monthlyNetReceiptCents = receipt(scenario.monthlyPriceCents)
  const annualNetReceiptCents = receipt(scenario.annualPriceCents)
  if (monthlyNetReceiptCents < 0 || annualNetReceiptCents < 0)
    throw new Error('Payment and VAT expenses exceed the test price')
  // Recognised annual revenue is spread over twelve months; it is not new monthly cash.
  const monthlyNetRevenueCents = roundRatio(
    BigInt(scenario.monthlySubscribers) * BigInt(monthlyNetReceiptCents) * 12n +
      BigInt(scenario.annualSubscribers) * BigInt(annualNetReceiptCents),
    12,
  )
  const reserveCents = safeAmount(
    (BigInt(monthlyNetRevenueCents) * BigInt(scenario.refundReserveBasisPoints) + 9_999n) / 10_000n,
  )
  const recurringNonBankCents =
    scenario.fixedMonthlyCostCents +
    (scenario.monthlySubscribers + scenario.annualSubscribers) * scenario.paidUserMonthlyCostCents +
    scenario.freeUsers * scenario.freeUserMonthlyCostCents
  const knownCostsMonthlyCents = recurringNonBankCents + reserveCents
  const quoteComplete = [...invoices, 'commitmentMonths'].every((key) => bank[key] !== null)
  const monthlyContributionAfterBankCents = quoteComplete
    ? monthlyNetRevenueCents - knownCostsMonthlyCents - bank.monthlyNetInvoiceCents
    : null
  const cashCoverageMonths = Math.max(policy.minimumCashCoverageMonths, bank.commitmentMonths ?? 0)
  const cashRequiredCents = quoteComplete
    ? safeAmount(
        BigInt(bank.setupCashCents) +
          BigInt(cashCoverageMonths) *
            BigInt(bank.monthlyCashInvoiceCents + knownCostsMonthlyCents),
      )
    : null
  const reasons = []
  if (!quoteComplete) reasons.push('Incomplete cash invoice, setup cost or contract term')
  for (const key of evidence) if (!bank[key]) reasons.push(`Missing evidence: ${key}`)
  if (scenario.unknownCosts.length)
    reasons.push('Unresolved costs prevent a profitability conclusion')
  if (scenario.monthlySubscribers + scenario.annualSubscribers === 0)
    reasons.push('No paying subscriber base; a free beta is not paid conversion')
  if (monthlyContributionAfterBankCents !== null && monthlyContributionAfterBankCents <= 0)
    reasons.push('Monthly contribution does not cover the bank expense')
  if (cashRequiredCents !== null && scenario.cashAvailableAfterObligationsCents < cashRequiredCents)
    reasons.push('Collected unrestricted cash does not cover the full reserve')
  return {
    schemaVersion: 1,
    currency: 'EUR',
    kind: 'planning-only-no-activation',
    currentMode: policy.mode,
    checkoutEnabled: false,
    bankConnectionsEnabled: false,
    monthlyNetReceiptCents,
    annualNetReceiptCents,
    monthlyNetRevenueCents,
    knownCostsMonthlyCents,
    monthlyContributionAfterBankCents,
    cashAvailableAfterObligationsCents: scenario.cashAvailableAfterObligationsCents,
    cashCoverageMonths,
    cashRequiredCents,
    bankExpansion: reasons.length ? 'blocked' : 'eligible-for-further-review',
    reasons,
    unknownCosts: scenario.unknownCosts,
  }
}
