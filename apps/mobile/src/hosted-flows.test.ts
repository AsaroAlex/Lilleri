import { ApiError } from '@lilleri/api-client'
import { describe, expect, test, vi } from 'vitest'
import {
  BANK_RETURN_MESSAGES,
  BILLING_RETURN_MESSAGES,
  bankAuthorizationLanguage,
  bankAuthorizationProblem,
  bankInstitutionName,
  bankRenewalInput,
  billingDate,
  billingProblem,
  consentDays,
  consumeHostedReturnLocation,
  firstSyncOutcome,
  formatPlanPrice,
  NO_HOSTED_RETURN,
  newestBankConnection,
  normaliseBankInstitutions,
  planPriceMoney,
  renewalRoute,
  secureRedirectUrl,
} from './hosted-flows'
import { MESSAGE_PAIRS } from './i18n/catalogue'
import { createTranslator } from './i18n/index'

const origin = 'https://app.lilleri.example'
const NBSP = ' '

describe('bank and billing return parameters', () => {
  test('a bank outcome is read once and removed while unrelated state is preserved', () => {
    const replace = vi.fn<(url: string) => void>()
    expect(
      consumeHostedReturnLocation(`${origin}/?lang=en&bank=connected#connections`, replace),
    ).toEqual({ bank: 'connected', billing: null })
    expect(replace).toHaveBeenCalledExactlyOnceWith(`${origin}/?lang=en#connections`)
    expect(consumeHostedReturnLocation(replace.mock.calls[0]?.[0] ?? '', replace)).toBe(
      NO_HOSTED_RETURN,
    )
    expect(replace).toHaveBeenCalledTimes(1)
  })
  test('every documented bank and billing outcome is recognised and has localized copy', () => {
    for (const outcome of Object.keys(BANK_RETURN_MESSAGES)) {
      const replace = vi.fn<(url: string) => void>()
      expect(consumeHostedReturnLocation(`${origin}/?bank=${outcome}`, replace).bank).toBe(outcome)
      expect(replace).toHaveBeenCalledExactlyOnceWith(`${origin}/`)
    }
    for (const outcome of Object.keys(BILLING_RETURN_MESSAGES)) {
      const replace = vi.fn<(url: string) => void>()
      expect(consumeHostedReturnLocation(`${origin}/?billing=${outcome}`, replace).billing).toBe(
        outcome,
      )
      expect(replace).toHaveBeenCalledExactlyOnceWith(`${origin}/`)
    }
    for (const key of [
      ...Object.values(BANK_RETURN_MESSAGES),
      ...Object.values(BILLING_RETURN_MESSAGES),
    ])
      expect(MESSAGE_PAIRS[key]).toHaveLength(2)
  })
  test('unknown, repeated or injected values are removed from the address bar and ignored', () => {
    const replace = vi.fn<(url: string) => void>()
    expect(
      consumeHostedReturnLocation(`${origin}/?bank=%3Cscript%3E&billing=refund&x=1`, replace),
    ).toEqual({ bank: null, billing: null })
    expect(replace).toHaveBeenLastCalledWith(`${origin}/?x=1`)
    expect(
      consumeHostedReturnLocation(`${origin}/?bank=connected&bank=cancelled`, replace),
    ).toEqual({ bank: null, billing: null })
    expect(replace).toHaveBeenLastCalledWith(`${origin}/`)
    expect(consumeHostedReturnLocation(`${origin}/?bank=CONNECTED`, replace).bank).toBeNull()
    const untouched = vi.fn<(url: string) => void>()
    expect(consumeHostedReturnLocation(`${origin}/?identity=recover`, untouched)).toBe(
      NO_HOSTED_RETURN,
    )
    expect(consumeHostedReturnLocation('not a url', untouched)).toBe(NO_HOSTED_RETURN)
    expect(untouched).not.toHaveBeenCalled()
  })
})

describe('redirect validation', () => {
  test('only an HTTPS page without embedded credentials may receive the window', () => {
    expect(secureRedirectUrl('https://tilisy.enablebanking.com/ais/start?sessionid=a')).toBe(
      'https://tilisy.enablebanking.com/ais/start?sessionid=a',
    )
    expect(secureRedirectUrl('https://checkout.stripe.com/c/pay/cs_test#fid')).toBe(
      'https://checkout.stripe.com/c/pay/cs_test#fid',
    )
    for (const unsafe of [
      'http://checkout.stripe.com/c/pay',
      'javascript:alert(1)',
      'data:text/html,<p>x</p>',
      'https://user:secret@bank.example/',
      'https://user@bank.example/',
      '//bank.example/path',
      '/v1/bank/callback',
      '',
      ' ',
      null,
      undefined,
      42,
      { url: 'https://bank.example' },
    ])
      expect(secureRedirectUrl(unsafe), String(unsafe)).toBeNull()
  })
})

describe('renewal routing by provider', () => {
  test('Enable Banking renews through a new bank authorisation for the same connection', () => {
    const connection = {
      id: 'connection-1',
      providerId: 'enable-banking',
      institutionId: 'IT:Intesa Sanpaolo',
    }
    expect(renewalRoute(connection)).toBe('bank_authorization')
    expect(bankRenewalInput(connection, 'it-IT')).toEqual({
      institutionId: 'IT:Intesa Sanpaolo',
      connectionId: 'connection-1',
      language: 'it',
    })
    expect(bankRenewalInput(connection, 'en-GB').language).toBe('en')
    expect(bankAuthorizationLanguage('en-GB')).toBe('en')
  })
  test('other providers keep their existing lifecycle renewal', () => {
    for (const providerId of ['mock-italian', 'yapily-sandbox', 'local-manual', 'Enable-Banking'])
      expect(renewalRoute({ providerId })).toBe('consent_renewal')
  })
  test('institution identifiers produce a readable name only when one is present', () => {
    expect(bankInstitutionName('IT:BPER Banca Carte')).toBe('BPER Banca Carte')
    expect(bankInstitutionName('Fineco')).toBe('Fineco')
    expect(bankInstitutionName('IT: ')).toBeNull()
  })
})

describe('bank authorisation problems and institution lists', () => {
  test('server problem codes map to calm explanations and unknown codes stay generic', () => {
    const cases = {
      plus_required: 'plus_required',
      bank_capacity_reached: 'capacity_reached',
      bank_provider_unavailable: 'provider_not_configured',
      already_connected: 'already_connected',
      connection_creation_pending: 'creation_pending',
      revocation_pending: 'revocation_pending',
      institution_unavailable: 'institution_unavailable',
      provider_unavailable: 'provider_unavailable',
      session_invalid: 'unknown',
      toString: 'unknown',
    } as const
    for (const [code, expected] of Object.entries(cases))
      expect(bankAuthorizationProblem(new ApiError(409, code, 'PRIVATE')), code).toBe(expected)
    expect(bankAuthorizationProblem(new ApiError(409, '__proto__', 'PRIVATE'))).toBe('unknown')
    expect(bankAuthorizationProblem(new Error('plus_required'))).toBe('unknown')
    expect(billingProblem(new ApiError(409, 'already_subscribed', 'x'))).toBe('already_subscribed')
    expect(billingProblem(new ApiError(409, 'no_billing_account', 'x'))).toBe('no_billing_account')
    expect(billingProblem(new ApiError(403, 'forbidden', 'x'))).toBe('not_owner')
    expect(billingProblem(new ApiError(404, 'not_found', 'x'))).toBe('not_owner')
    expect(billingProblem(new ApiError(502, 'request_failed', 'x'))).toBe('unknown')
  })
  test('institution lists keep only well-formed entries for the requested market', () => {
    const value = normaliseBankInstitutions(
      {
        providerId: 'enable-banking',
        available: true,
        reason: null,
        institutions: [
          {
            id: 'IT:BPER Banca',
            name: 'BPER Banca',
            country: 'IT',
            beta: false,
            maximumConsentDays: 180,
          },
          {
            id: 'IT:BPER Banca Carte',
            name: 'BPER Banca Carte',
            country: 'it',
            beta: true,
            maximumConsentDays: 90,
          },
          {
            id: 'IT:BPER Banca',
            name: 'Duplicate',
            country: 'IT',
            beta: false,
            maximumConsentDays: 180,
          },
          {
            id: 'FR:BNP Paribas',
            name: 'BNP Paribas',
            country: 'FR',
            beta: false,
            maximumConsentDays: 180,
          },
          { id: '', name: 'Nameless id', country: 'IT' },
          { id: 'IT:x', name: '  ', country: 'IT' },
          { id: 'IT:Long', name: 'Long', country: 'IT', beta: 'yes', maximumConsentDays: 720 },
          null,
        ],
      },
      'IT',
    )
    expect(
      value?.institutions.map((item) => [item.id, item.beta, item.maximumConsentDays]),
    ).toEqual([
      ['IT:BPER Banca', false, 180],
      ['IT:BPER Banca Carte', true, 90],
      ['IT:Long', false, 180],
    ])
    expect(normaliseBankInstitutions({ available: false, institutions: [] }, 'IT')?.reason).toBe(
      'provider_not_configured',
    )
    expect(
      normaliseBankInstitutions(
        { available: false, reason: 'plus_required', institutions: [] },
        'IT',
      )?.reason,
    ).toBe('plus_required')
    expect(
      normaliseBankInstitutions(
        { available: true, reason: 'plus_required', institutions: [] },
        'IT',
      )?.reason,
    ).toBeNull()
    expect(normaliseBankInstitutions({ available: 'yes', institutions: [] }, 'IT')).toBeNull()
    expect(normaliseBankInstitutions({ available: true }, 'IT')).toBeNull()
    expect(consentDays(30)).toBe(30)
    expect(consentDays(0)).toBe(180)
    expect(consentDays(Number.NaN)).toBe(180)
  })
})

describe('first background synchronisation', () => {
  const connection = (id: string, createdAt: string, providerId = 'enable-banking') => ({
    id,
    providerId,
    createdAt,
    status: 'active' as const,
    lastSyncedAt: null,
  })
  test('the newest automatic bank connection is followed', () => {
    expect(
      newestBankConnection([
        connection('manual', '2026-10-05T10:00:00Z', 'local-manual'),
        connection('older', '2026-10-01T10:00:00Z'),
        connection('newer', '2026-10-05T09:00:00Z'),
        { ...connection('revoked', '2026-10-05T09:30:00Z'), status: 'revoked' as const },
        connection('fixture', '2026-10-05T09:45:00Z', 'mock-italian'),
      ])?.id,
    ).toBe('newer')
    expect(
      newestBankConnection([connection('manual', '2026-10-05T10:00:00Z', 'local-manual')]),
    ).toBeNull()
  })
  test('it settles on a completed read or a terminal latest job, and keeps waiting otherwise', () => {
    const base = connection('c', '2026-10-05T09:00:00Z')
    expect(firstSyncOutcome({ ...base, lastSyncedAt: '2026-10-05T09:01:00Z' }, [])).toBe('done')
    expect(firstSyncOutcome(base, [])).toBeNull()
    expect(
      firstSyncOutcome(base, [
        { state: 'failed', createdAt: '2026-10-05T09:00:10Z' },
        { state: 'running', createdAt: '2026-10-05T09:00:20Z' },
      ]),
    ).toBeNull()
    expect(
      firstSyncOutcome(base, [{ state: 'completed', createdAt: '2026-10-05T09:00:20Z' }]),
    ).toBe('done')
    for (const state of ['failed', 'cancelled', 'blocked'] as const)
      expect(firstSyncOutcome(base, [{ state, createdAt: '2026-10-05T09:00:20Z' }])).toBe('failed')
  })
})

describe('Plus price formatting', () => {
  test('server prices format exactly with the existing money helpers and VAT copy', () => {
    const it = createTranslator('it-IT'),
      en = createTranslator('en-GB')
    expect(formatPlanPrice(it, { amount: '6.99', currency: 'EUR' }, 'month')).toEqual({
      text: `6,99${NBSP}€ al mese`,
      accessible: '6,99 euro al mese',
    })
    expect(formatPlanPrice(it, { amount: '69.99', currency: 'EUR' }, 'year')?.text).toBe(
      `69,99${NBSP}€ all’anno`,
    )
    expect(formatPlanPrice(en, { amount: '6.99', currency: 'EUR' }, 'month')).toEqual({
      text: '€6.99 a month',
      accessible: '6.99 euros a month',
    })
    expect(formatPlanPrice(en, { amount: '1069.9', currency: 'EUR' }, 'year')?.text).toBe(
      '€1,069.90 a year',
    )
    expect(it.t('subscription.vatIncluded')).toBe('IVA inclusa')
  })
  test('malformed, negative, zero, rounded or unknown-currency prices are not shown', () => {
    for (const price of [
      null,
      undefined,
      { amount: '6,99', currency: 'EUR' },
      { amount: '-6.99', currency: 'EUR' },
      { amount: '0.00', currency: 'EUR' },
      { amount: '6.999', currency: 'EUR' },
      { amount: '6.99e2', currency: 'EUR' },
      { amount: ' 6.99', currency: 'EUR' },
      { amount: '6.99', currency: 'XXX' },
      { amount: 6.99, currency: 'EUR' } as unknown as { amount: string; currency: string },
    ])
      expect(planPriceMoney(price), JSON.stringify(price)).toBeNull()
    expect(planPriceMoney({ amount: '6.990', currency: 'EUR' })?.amountMinor).toBe(699n)
    expect(billingDate('2026-11-05T00:00:00Z')?.toISOString()).toBe('2026-11-05T00:00:00.000Z')
    expect(billingDate('not a date')).toBeNull()
    expect(billingDate(null)).toBeNull()
  })
})
