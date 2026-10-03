import {
  CANONICAL_CATEGORIES,
  CATEGORIES,
  CURRENT_TAXONOMY,
  TAXONOMY_VERSION,
} from '@lilleri/domain'
import { money } from '@lilleri/money'
import { IntlMessageFormat } from 'intl-messageformat'
import { describe, expect, test } from 'vitest'
import { MESSAGE_PAIRS, type MessageKey } from './catalogue'
import { lintCopy, messageArguments, validateMessageCatalogues } from './catalogue-validation'
import { CATEGORY_LABEL_VERSION, createTranslator } from './index'
import { PROBLEM_MESSAGES } from './problems'
import { displayMessage, displayProblem, UiValidationError } from './ui-message'

/** Generate representative argument types from the maintained ICU parser, including new feature namespaces. */
function sampleArguments(message: string): Record<string, string | number | Date> {
  const samples: Record<string, string | number | Date> = { amount: '1.234,56 €' }
  const visit = (elements: ReturnType<IntlMessageFormat['getAst']>) => {
    for (const element of elements) {
      if ('value' in element && element.type !== 0) {
        samples[element.value] =
          element.type === 3 || element.type === 4
            ? new Date('2026-10-02T12:30:00Z')
            : element.type === 2 || element.type === 6
              ? 2
              : element.value === 'amount'
                ? '1.234,56 €'
                : 'Synthetic'
      }
      if ('options' in element)
        for (const option of Object.values(element.options)) visit(option.value)
      if ('children' in element) visit(element.children)
    }
  }
  visit(new IntlMessageFormat(message, 'it-IT', undefined, { ignoreTag: true }).getAst())
  return samples
}

describe('explicit Italian and British English display catalogue', () => {
  test('official ICU parsing and copy lint cover both locales with identical arguments', () => {
    expect(validateMessageCatalogues()).toEqual([])
    expect(messageArguments('{count, plural, one {{name} has one} other {{name} has #}}')).toEqual([
      'count',
      'name',
    ])
    expect(() => messageArguments('{count, plural, one {broken}')).toThrow()
    expect(lintCopy('Your money, in order!')).toEqual(['exclamation_mark'])
    expect(lintCopy('A smart revolutionary shortcut')).toEqual(['banned_operational_copy'])
  })
  test('every master message formats in both locales without raw ICU tokens', () => {
    for (const locale of ['it-IT', 'en-GB'] as const) {
      const translator = createTranslator(locale)
      for (const key of Object.keys(MESSAGE_PAIRS) as MessageKey[]) {
        const result = translator.t(key, sampleArguments(MESSAGE_PAIRS[key][0]))
        expect(result, key).not.toContain('{count,')
        expect(result, key).not.toContain('{amount}')
        expect(result.length, key).toBeGreaterThan(0)
      }
    }
  })
  test('ICU plural branches use real zero, singular and plural counts', () => {
    const it = createTranslator('it-IT'),
      en = createTranslator('en-GB')
    expect(it.t('common.transactionCount', { count: 0 })).toBe('Nessun movimento')
    expect(it.t('common.transactionCount', { count: 1 })).toBe('1 movimento')
    expect(it.t('common.transactionCount', { count: 3 })).toBe('3 movimenti')
    expect(en.t('common.transactionCount', { count: 0 })).toBe('No transactions')
    expect(en.t('common.transactionCount', { count: 1 })).toBe('1 transaction')
    expect(en.t('common.transactionCount', { count: 3 })).toBe('3 transactions')
    expect(
      en.t('evidence.dictionary', { merchant: '{count, plural, other {untrusted}}' }),
    ).toContain('{count, plural, other {untrusted}}')
  })
  test('money stays exact beyond safe JavaScript integers with locale punctuation and Unicode minus', () => {
    const value = money(-900719925474099399n, 'EUR')
    expect(createTranslator('it-IT').money(value)).toBe('−9.007.199.254.740.993,99 €')
    expect(createTranslator('en-GB').money(value)).toBe('−€9,007,199,254,740,993.99')
    expect(createTranslator('en-GB').accessibleMoney(value)).toBe(
      'minus 9,007,199,254,740,993.99 euros',
    )
    expect(createTranslator('it-IT').accessibleMoney(money(-100n, 'EUR'))).toBe('meno 1,00 euro')
    expect(createTranslator('en-GB').accessibleMoney(money(-1n, 'JPY'))).toBe(
      'minus 1 Japanese yen',
    )
    expect(createTranslator('en-GB').money(money(12345n, 'KWD'))).toBe('KWD 12.345')
    expect(() =>
      createTranslator('en-GB').t('common.accountCount', { count: Number.MAX_SAFE_INTEGER + 1 }),
    ).toThrow()
  })
  test('financial dates never shift through the profile time zone, while instants do', () => {
    const it = createTranslator('it-IT', 'Europe/Rome'),
      en = createTranslator('en-GB', 'America/New_York')
    expect(it.calendarDate('2026-03-29')).toContain('29')
    expect(en.calendarDate('2026-03-29')).toBe('29 Mar 2026')
    expect(en.calendarMonth('2026-03')).toBe('March 2026')
    expect(() => en.calendarMonth('2026-13')).toThrow()
    expect(en.instant('2026-03-29T00:30:00.000Z')).toContain('28 Mar 2026')
    expect(it.instant('2026-07-02T23:30:00.000Z')).toContain('3 lug 2026')
    expect(it.t('common.observedAt', { observedAt: new Date('2026-07-02T23:30:00Z') })).toContain(
      '3 lug 2026',
    )
    expect(en.t('common.observedAt', { observedAt: new Date('2026-07-02T23:30:00Z') })).toContain(
      '2 Jul 2026',
    )
    expect(en.calendarDate(null)).toBe('Date unavailable')
    for (const value of ['2026-02-29', '2026-13-01', '0000-01-01', '2026-03-29T00:00:00Z'])
      expect(() => en.calendarDate(value)).toThrow()
  })
  test('every actual category code and legacy id has both labels and unknown versions do not invent a category', () => {
    for (const locale of ['it-IT', 'en-GB'] as const) {
      const translator = createTranslator(locale)
      for (const category of CANONICAL_CATEGORIES)
        for (const version of [CATEGORY_LABEL_VERSION, TAXONOMY_VERSION])
          expect(translator.categoryLabel(category.code, version)).toBe(
            locale === 'it-IT' ? category.labelIt : category.labelEn,
          )
      for (const id of Object.keys(CATEGORIES)) expect(translator.categoryLabel(id)).not.toBe(id)
      for (const parent of CURRENT_TAXONOMY.parents)
        expect(translator.categoryLabel(parent.id, TAXONOMY_VERSION)).toBe(
          locale === 'it-IT' ? parent.labelIt : parent.labelEn,
        )
      expect(translator.categoryLabel('food', 'ledger-local-v1')).toBe(
        locale === 'it-IT' ? 'Bar e ristoranti' : 'Bars and restaurants',
      )
      expect(translator.categoryLabel('FOOD_GROCERIES', 'future-taxonomy')).toBe(
        translator.t('category.unknown'),
      )
    }
  })
  test('known public problem codes translate without echoing server exception text, unknown codes stay generic', () => {
    const en = createTranslator('en-GB')
    for (const code of Object.keys(PROBLEM_MESSAGES))
      expect(en.problemMessage(code).length).toBeGreaterThan(0)
    expect(en.problemMessage({ code: 'session_invalid', message: 'PRIVATE_EXCEPTION' })).toBe(
      'Sign in again to continue.',
    )
    expect(en.problemMessage(new Error('PRIVATE_EXCEPTION'))).toBe(en.t('common.problem'))
    expect(en.problemMessage({ code: 'unknown_future_error', detail: 'PRIVATE_DETAIL' })).toBe(
      en.t('common.problem'),
    )
    expect(en.evidenceMessage('merchant:synthetic', 'Synthetic')).toBe(en.t('evidence.preference'))
    expect(en.evidenceMessage('dictionary:synthetic', 'Synthetic')).toContain('Synthetic')
    expect(en.evidenceMessage('untrusted_PRIVATE_DETAIL')).toBe(en.t('evidence.generic'))
    expect(() => createTranslator('en-US' as 'en-GB')).toThrow()
  })
  test('stored copy keys change language, while unknown notification versions and errors cannot echo private text', () => {
    const it = createTranslator('it-IT'),
      en = createTranslator('en-GB')
    const validation = displayProblem(new UiValidationError('rules.nameRequired'), 'common.problem')
    expect(displayMessage(it, validation)).toBe('Scrivi un nome per riconoscere la regola.')
    expect(displayMessage(en, validation)).toBe('Enter a name to identify the rule.')
    expect(
      displayMessage(
        en,
        displayProblem({ code: 'session_invalid', message: 'SECRET' }, 'common.problem'),
      ),
    ).toBe('Sign in again to continue.')
    expect(displayMessage(en, displayProblem(new Error('SECRET'), 'common.problem'))).toBe(
      en.t('common.problem'),
    )
    expect(en.notificationTitle('export_ready', 'notification-text-v1')).toBe(
      'Your export is ready',
    )
    expect(en.notificationTitle('export_ready', 'unknown_version')).toBe('Notice to review')
    expect(en.notificationTitle('__proto__', 'notification-text-v1')).toBe('Notice to review')
    expect(en.evidenceMessage('__proto__')).toBe(en.t('evidence.generic'))
  })
})
