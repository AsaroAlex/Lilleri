import {
  CANONICAL_CATEGORIES,
  type CategoryId,
  CURRENT_TAXONOMY,
  dateOnly,
  isProfileLocale,
  isProfileTimezone,
  PROFILE_LOCALE,
  type ProfileLocale,
  TAXONOMY_VERSION,
} from '@lilleri/domain'
import { currencyExponent, type FormatOptions, formatMoney, type Money } from '@lilleri/money'
import { IntlMessageFormat } from 'intl-messageformat'
import { MESSAGE_CATALOGUES, type MessageKey } from './catalogue'
import { PROBLEM_MESSAGES } from './problems'

export { MESSAGE_CATALOGUES, MESSAGE_PAIRS, type MessageKey } from './catalogue'
export { PROBLEM_MESSAGES } from './problems'
export type MessageValues = Readonly<Record<string, string | number | boolean | Date>>
export const CATEGORY_LABEL_VERSION = 'canonical-prototype-v1' as const
const legacyCategories: Readonly<Record<CategoryId, readonly [string, string]>> = Object.freeze({
  income: ['Entrate', 'Income'],
  groceries: ['Spesa alimentare', 'Groceries'],
  shopping: ['Acquisti', 'Shopping'],
  food: ['Bar e ristoranti', 'Bars and restaurants'],
  transport: ['Trasporti', 'Transport'],
  utilities: ['Casa e utenze', 'Home and utilities'],
  subscriptions: ['Abbonamenti', 'Subscriptions'],
  health: ['Salute', 'Health'],
  travel: ['Viaggi', 'Travel'],
  transfer: ['Trasferimenti', 'Transfers'],
  uncategorised: ['Da controllare', 'Needs review'],
})
const canonicalCategories = new Map(CANONICAL_CATEGORIES.map((row) => [row.code, row]))
const canonicalParents = new Map(CURRENT_TAXONOMY.parents.map((row) => [row.id as string, row]))
const evidenceKeys: Readonly<Record<string, MessageKey>> = Object.freeze({
  'sticky-user-correction': 'evidence.userCorrection',
  'equal-priority-rule-conflict': 'evidence.ruleConflict',
  'no-deterministic-match': 'evidence.noMatch',
  'same-account': 'evidence.sameAccount',
  'provider-related-transaction': 'evidence.providerRelated',
  'unique-provider-reference': 'evidence.uniqueReference',
  'same-amount': 'evidence.sameAmount',
  'changed-amount': 'evidence.changedAmount',
  'different-sources': 'evidence.differentSources',
  'same-account-merchant-date-amount': 'evidence.sameFingerprint',
  'same-account-amount-within-seven-days': 'evidence.sameAccountSevenDays',
  'same-merchant': 'evidence.sameMerchant',
  'merchant-not-proven': 'evidence.merchantNotProven',
  'explicit-source-link': 'evidence.explicitSourceLink',
  'relationship-unproven': 'evidence.unproven',
  'owned-accounts': 'evidence.ownedAccounts',
  'opposite-exact-amount': 'evidence.oppositeAmounts',
  'provider-account-relationship': 'evidence.providerAccountRelationship',
  'account-relationship-unproven': 'evidence.accountRelationshipUnproven',
  'reference-unproven': 'evidence.referenceUnproven',
  'same-account-currency': 'evidence.sameAccountCurrency',
  'cumulative-refund-bound': 'evidence.cumulativeRefund',
  'competing-candidates': 'evidence.competing',
  'original-not-counted': 'evidence.incomeExcluded',
  'three-observed-monthly-payments': 'evidence.recurring',
  'not-a-confirmed-contract': 'recurring.notContract',
  'provider-kind:income': 'evidence.providerIncome',
  'provider-kind:expense': 'evidence.providerExpense',
  'provider-kind:transfer': 'evidence.providerTransfer',
  'provider-kind:card_settlement': 'evidence.providerSettlement',
  'provider-kind:cash_withdrawal': 'evidence.providerWithdrawal',
  'provider-kind:refund': 'evidence.providerRefund',
})
const currencyNames = {
  'it-IT': {
    EUR: ['euro', 'euro'],
    GBP: ['sterlina britannica', 'sterline britanniche'],
    USD: ['dollaro statunitense', 'dollari statunitensi'],
    CHF: ['franco svizzero', 'franchi svizzeri'],
    JPY: ['yen giapponese', 'yen giapponesi'],
  },
  'en-GB': {
    EUR: ['euro', 'euros'],
    GBP: ['pound sterling', 'pounds sterling'],
    USD: ['US dollar', 'US dollars'],
    CHF: ['Swiss franc', 'Swiss francs'],
    JPY: ['Japanese yen', 'Japanese yen'],
  },
} as const
function checkedValues(values: MessageValues): Record<string, string | number | boolean | Date> {
  const result = { ...values }
  if ('amount' in result && typeof result.amount !== 'string')
    throw new Error('Money arguments must be formatted exactly before interpolation')
  for (const value of Object.values(result)) {
    if (typeof value === 'bigint') throw new Error('Format bigint money before ICU interpolation')
    if (
      typeof value === 'number' &&
      (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
    )
      throw new Error('Unsafe ICU numeric value; format money exactly before interpolation')
    if (value instanceof Date && !Number.isFinite(value.getTime()))
      throw new Error('Invalid ICU instant')
  }
  return result
}

/** No mutable global locale. Each UI context gets its own captured display preferences. */
export function createTranslator(locale: ProfileLocale = PROFILE_LOCALE, timezone = 'Europe/Rome') {
  if (!isProfileLocale(locale) || !isProfileTimezone(timezone))
    throw new Error('Invalid display preferences')
  const messages = MESSAGE_CATALOGUES[locale]
  const cache = new Map<string, IntlMessageFormat>()
  const format = (key: string, message: string, values: MessageValues = {}): string => {
    let formatter = cache.get(key)
    if (!formatter) {
      formatter = new IntlMessageFormat(message, locale, undefined, {
        ignoreTag: true,
        formatters: {
          getNumberFormat: (locales, options) =>
            new Intl.NumberFormat(locales, options as Intl.NumberFormatOptions),
          getPluralRules: (locales, options) => new Intl.PluralRules(locales, options),
          getDateTimeFormat: (locales, options) =>
            new Intl.DateTimeFormat(locales, { ...options, timeZone: timezone }),
        },
      })
      cache.set(key, formatter)
    }
    const result = formatter.format(checkedValues(values))
    if (typeof result !== 'string') throw new Error('Catalogue messages must produce plain text')
    return result
  }
  const t = (key: MessageKey, values: MessageValues = {}): string => {
    const message = messages[key]
    if (message === undefined) throw new Error('Unknown message key')
    return format(key, message, values)
  }
  return Object.freeze({
    locale,
    timezone,
    t,
    notificationTitle(type: string, textVersion: string): string {
      const keys: Readonly<Record<string, MessageKey>> = {
        inbox: 'notifications.noticeInbox',
        consent_reminder: 'notifications.noticeConsent',
        balance_mismatch: 'notifications.noticeMismatch',
        connection_expired: 'notifications.noticeExpired',
        connection_paused: 'notifications.noticePaused',
        summary_ready: 'notifications.noticeSummary',
        security_notice: 'notifications.noticeSecurity',
        export_ready: 'notifications.noticeExport',
        deletion_status: 'notifications.noticeDeletion',
        rights_action: 'notifications.noticeRights',
      }
      return t(
        textVersion === 'notification-text-v1' && Object.hasOwn(keys, type)
          ? (keys[type] as MessageKey)
          : 'notifications.noticeUnknown',
      )
    },
    evidenceMessage(code: string, merchant?: string): string {
      const key = Object.hasOwn(evidenceKeys, code) ? evidenceKeys[code] : undefined
      if (key) return t(key)
      if (code.startsWith('rule:')) return t('evidence.rule')
      if (code.startsWith('merchant:')) return t('evidence.preference')
      if (code.startsWith('dictionary:'))
        return merchant ? t('evidence.dictionary', { merchant }) : t('evidence.dictionaryUnknown')
      return t('evidence.generic')
    },
    problemMessage(cause: unknown): string {
      const code =
        typeof cause === 'string'
          ? cause
          : cause && typeof cause === 'object' && 'code' in cause
            ? cause.code
            : undefined
      if (typeof code !== 'string' || !Object.hasOwn(PROBLEM_MESSAGES, code))
        return t('common.problem')
      const pair = PROBLEM_MESSAGES[code as keyof typeof PROBLEM_MESSAGES]
      return format(`problem.${code}`, pair[locale === 'it-IT' ? 0 : 1])
    },
    categoryLabel(id: string, taxonomyVersion?: string): string {
      if (
        taxonomyVersion &&
        !['ledger-local-v1', CATEGORY_LABEL_VERSION, TAXONOMY_VERSION].includes(taxonomyVersion)
      )
        return t('category.unknown')
      if (taxonomyVersion === TAXONOMY_VERSION) {
        const parent = canonicalParents.get(id)
        if (parent) return locale === 'it-IT' ? parent.labelIt : parent.labelEn
      }
      if (Object.hasOwn(legacyCategories, id))
        return legacyCategories[id as CategoryId][locale === 'it-IT' ? 0 : 1]
      const canonical = canonicalCategories.get(id)
      return canonical
        ? locale === 'it-IT'
          ? canonical.labelIt
          : canonical.labelEn
        : t('category.unknown')
    },
    money(value: Money, options: Omit<FormatOptions, 'locale'> = {}): string {
      return formatMoney(value, { ...options, locale })
    },
    accessibleMoney(value: Money): string {
      const magnitude = value.amountMinor < 0n ? -value.amountMinor : value.amountMinor
      const formatted = formatMoney(value, { locale, sign: 'never', currencyDisplay: 'code' })
      // Remove the known ISO code only, keeping the exact grouped integer/fraction untouched.
      const amount = formatted.replace(
        new RegExp(`(?:^${value.currency}\\u00a0|\\u00a0${value.currency}$)`),
        '',
      )
      const names = currencyNames[locale]
      const oneUnit = 10n ** BigInt(currencyExponent(value.currency))
      const currency = Object.hasOwn(names, value.currency)
        ? names[value.currency as keyof typeof names][magnitude === oneUnit ? 0 : 1]
        : value.currency
      const full = t('money.currencyAmount', { amount, currency })
      return value.amountMinor < 0n ? t('money.negative', { amount: full }) : full
    },
    calendarDate(value: string | null | undefined): string {
      if (!value) return t('format.invalidDate')
      if (Number(value.slice(0, 4)) < 1) throw new Error('Invalid calendar date')
      const canonical = dateOnly(value)
      return new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(`${canonical}T00:00:00Z`))
    },
    calendarMonth(value: string): string {
      if (!/^\d{4}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1)
        throw new Error('Invalid calendar month')
      const canonical = dateOnly(`${value}-01`)
      return new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${canonical}T00:00:00Z`))
    },
    instant(value: string | null | undefined, zone = timezone): string {
      if (!value) return t('format.invalidDate')
      if (!isProfileTimezone(zone)) throw new Error('Invalid display time zone')
      const instant = new Date(value)
      if (!Number.isFinite(instant.getTime())) throw new Error('Invalid instant')
      return new Intl.DateTimeFormat(locale, {
        timeZone: zone,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(instant)
    },
  })
}
export type Translator = ReturnType<typeof createTranslator>
