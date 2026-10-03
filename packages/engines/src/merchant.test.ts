import type { MerchantAlias, MerchantInput } from '@lilleri/domain'
import { describe, expect, test } from 'vitest'
import {
  italianPaymentHint,
  normalizedMerchantKey,
  normalizeMerchant,
  resolveMerchant,
} from './merchant.js'

const input = (
  merchantName: string | null = 'Netflix',
  description = 'Operazione sintetica',
): MerchantInput => ({
  profileId: 'profile-one',
  transactionId: 'tx-one',
  merchantName,
  description,
})
const alias = (values: Partial<MerchantAlias> = {}): MerchantAlias => ({
  id: 'alias-one',
  profileId: 'profile-one',
  normalizedKey: 'netflix',
  merchantId: 'merchant:private:stable',
  displayName: 'Abbonamento di casa',
  revision: 1,
  archived: false,
  createdAt: '2026-10-03T12:00:00.000Z',
  updatedAt: '2026-10-03T12:00:00.000Z',
  ...values,
})

describe('conservative versioned merchant identity without rewriting financial evidence', () => {
  test('normalizes comparison keys while retaining exact original Unicode source strings', () => {
    const original = input('  CAFÉ — Firenze  ', 'Testo originale, importo 12,50')
    const result = normalizeMerchant(original)
    expect(result.normalizedKey).toBe('cafe firenze')
    expect(result.originalMerchantName).toBe(original.merchantName)
    expect(result.originalDescription).toBe(original.description)
    expect(result.normalizerVersion).toBe('merchant-normalizer-v1')
  })
  test('extracts only explicit versioned delimiters and never strips arbitrary merchant digits', () => {
    const resolved = normalizeMerchant(input(null, 'PAGAMENTO POS | Negozio 123 | 02/10/2026'))
    expect(resolved.normalizedKey).toBe('negozio 123')
    expect(resolved.evidence).toContain('pattern:generic-it-v1:card-delimiter')
    expect(normalizeMerchant(input('Negozio 123', 'PAGAMENTO POS NEGOZIO 123')).normalizedKey).toBe(
      'negozio 123',
    )
    expect(normalizeMerchant(input(null, 'PAGAMENTO POS NEGOZIO 123')).status).toBe('unknown')
  })
  test('a delimited payment intermediary identifies the declared underlying merchant only', () => {
    const normalized = normalizeMerchant(input('PAYPAL * NETFLIX'))
    expect(normalized.normalizedKey).toBe('netflix')
    expect(normalized.intermediary).toBe('paypal')
    expect(resolveMerchant(input('PAYPAL * NETFLIX')).merchantId).toBe('merchant:netflix')
    expect(resolveMerchant(input('PayPal')).status).toBe('unknown')
  })
  test('conflicting provider and descriptor candidates abstain without returning an identity', () => {
    const resolution = resolveMerchant(input('Coop', 'PAGAMENTO CARTA | Netflix'))
    expect(resolution.status).toBe('ambiguous')
    expect(resolution.merchantId).toBeNull()
    expect(resolution.normalizedKey).toBeNull()
    expect(resolution.evidence).toContain('conflicting-source-merchant-hints')
  })
  test('known spelling variants share stable identity across profiles; private display choices do not', () => {
    const first = resolveMerchant(input('Mc Donald S'))
    const second = resolveMerchant({ ...input('McDonalds'), profileId: 'other-profile' })
    expect(first.merchantId).toBe(second.merchantId)
    expect(first.dictionaryVersion).toBe('merchant-dictionary-local-v1')
    const renamed = resolveMerchant(input(), { aliases: [alias()] })
    expect(renamed.source).toBe('user')
    expect(renamed.displayName).toBe('Abbonamento di casa')
    expect(
      resolveMerchant({ ...input(), profileId: 'other-profile' }, { aliases: [alias()] }).source,
    ).toBe('dictionary')
  })
  test('private alias revision changes explanation and label while keeping grouping identity stable', () => {
    const first = resolveMerchant(input(), { aliases: [alias()] })
    const second = resolveMerchant(input(), {
      aliases: [alias({ revision: 2, displayName: 'Il mio nome' })],
    })
    expect(second.merchantId).toBe(first.merchantId)
    expect(second.aliasRevision).toBe(2)
    expect(second.displayName).toBe('Il mio nome')
  })
  test('rules-only disables the dictionary while explicit private choices remain usable', () => {
    expect(resolveMerchant(input(), { globalDictionaryEnabled: false }).status).toBe('unknown')
    expect(
      resolveMerchant(input(), { globalDictionaryEnabled: false, aliases: [alias()] }).source,
    ).toBe('user')
    expect(resolveMerchant(input(), { aliases: [alias({ archived: true })] }).source).toBe(
      'dictionary',
    )
  })
  test('conflicting private aliases abstain rather than choosing the first array entry', () => {
    const aliases = [alias(), alias({ id: 'alias-two', merchantId: 'merchant:private:other' })]
    expect(resolveMerchant(input(), { aliases }).status).toBe('ambiguous')
    expect(resolveMerchant(input(), { aliases: [...aliases].reverse() }).status).toBe('ambiguous')
  })
  test('quiet/private suppression returns no identity, label, normalized key or source evidence', () => {
    const result = resolveMerchant(input('Farmacia privata', 'Testo riservato'), {
      aliases: [alias()],
      excludedTransactionIds: ['tx-one'],
    })
    expect(result).toMatchObject({
      status: 'suppressed',
      merchantId: null,
      displayName: null,
      normalizedKey: null,
      source: 'none',
      evidence: [],
    })
    expect(JSON.stringify(result)).not.toContain('privata')
    expect(JSON.stringify(result)).not.toContain('riservato')
  })
  test('unknown/prototype-looking strings cannot resolve through object inheritance', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'Negozio sconosciuto']) {
      const result = resolveMerchant(input(name))
      expect(result.status).toBe('unknown')
      expect(result.merchantId).toBeNull()
    }
  })
  test('rejects corrupt/oversize evidence and an undeclared bank-pattern version', () => {
    expect(() => normalizedMerchantKey('a'.repeat(501))).toThrow()
    expect(() => normalizedMerchantKey('Acme\u0000')).toThrow()
    expect(() => normalizedMerchantKey('Acme\u202e')).toThrow()
    expect(() => normalizeMerchant({ ...input(), profileId: '' })).toThrow()
    expect(() =>
      normalizeMerchant({ ...input(), bankPatternId: 'guessed-bank-v9' as 'generic-it-v1' }),
    ).toThrow()
  })
  test('unsupported existing ledger text abstains per row without changing or rejecting raw evidence', () => {
    for (const description of [
      'Text\u0000with control',
      'Text\u202ewith format',
      'x'.repeat(501),
    ]) {
      const source = input('Netflix', description)
      expect(normalizeMerchant(source)).toMatchObject({
        originalDescription: description,
        status: 'unknown',
        normalizedKey: null,
        evidence: ['unsupported_source_text'],
      })
      expect(resolveMerchant(source)).toMatchObject({
        status: 'unknown',
        merchantId: null,
        normalizedKey: null,
        evidence: ['unsupported_source_text'],
      })
      expect(italianPaymentHint(description)).toMatchObject({ status: 'unknown', kind: null })
    }
    expect(resolveMerchant(input('Net\u0000flix'))).toMatchObject({
      status: 'unknown',
      merchantId: null,
    })
    expect(resolveMerchant(input('Netflix', 'Tabs\tare\tvalid')).status).toBe('resolved')
  })
  test('Italian payment types are inspectable hints, not invented provider codes or ledger edits', () => {
    for (const [description, type, kind] of [
      ['Pagamento F24', 'f24', 'expense'],
      ['PAGOPA avviso', 'pagopa_cbill', 'expense'],
      ['MAV pratica', 'mav_rav', 'expense'],
      ['Bollettino postale', 'bill', 'expense'],
      ['SDD creditore', 'direct_debit', 'expense'],
      ['Ricarica wallet', 'wallet_topup', 'transfer'],
      ['Prelievo ATM', 'cash_withdrawal', 'cash_withdrawal'],
      ['Saldo carta', 'card_settlement', 'card_settlement'],
      ['Accredito stipendio', 'salary', 'income'],
      ['Pensione mensile', 'pension', 'income'],
    ] as const) {
      expect(italianPaymentHint(description)).toMatchObject({
        status: 'hint',
        type,
        kind,
        version: 'italian-payment-hints-v1',
      })
      expect(italianPaymentHint(description).evidence).toContain('not-a-verified-provider-code')
    }
  })
  test('conflicting keywords or declared structural kind abstain; generic topup never invents a wallet', () => {
    expect(italianPaymentHint('F24 stipendio').status).toBe('conflict')
    expect(italianPaymentHint('Stipendio', 'expense').kind).toBeNull()
    expect(italianPaymentHint('Ricarica telefonica')).toMatchObject({
      status: 'unknown',
      kind: null,
    })
  })
})
