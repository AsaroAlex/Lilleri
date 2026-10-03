import assert from 'node:assert/strict'
import test from 'node:test'
import { lintUiCopy } from './lint-ui-copy.mjs'

test('rejects product text, control labels, accessible copy and concatenated template labels', () => {
  const fixtures = [
    '<Text>Nuovo movimento</Text>',
    '<Text>{"New transaction"}</Text>',
    '<TextInput accessibilityLabel="Import amount" />',
    '<TextInput placeholder="Enter your name" />',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: The negative fixture contains actual JSX template interpolation source.
    '<Text>{`Balance: ${balance}`}</Text>',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: The negative fixture contains actual JSX template interpolation source.
    '<Pressable accessibilityLabel={`Include ${account.name}`} />',
    "button('Save changes', save)",
    "field('Rule name', 'name')",
  ]
  for (const source of fixtures) assert.equal(lintUiCopy(source).length, 1, source)
})

test('rejects raw errors, single-language server explanations and fixed formatter locales', () => {
  const fixtures = [
    '<Text>{cause.message}</Text>',
    '<Text>{problem.detail}</Text>',
    '<Text>{result.explanationIt}</Text>',
    'setError(cause.message)',
    'class ArbitraryValidationError extends Error {}; const e = new ArbitraryValidationError(secret); setError(cause instanceof ArbitraryValidationError ? cause.message : fallback)',
    "new Intl.DateTimeFormat('it-IT').format(now)",
    "new Intl.NumberFormat('en-GB').format(amount)",
  ]
  for (const source of fixtures) assert.equal(lintUiCopy(source).length, 1, source)
})

test('accepts explicit ICU keys, original data, invariant identifiers and captured display preferences', () => {
  const source = `
    // Display source labels and immutable disclosure text unchanged.
    const endpoint = '/v1/settings'; const profile = { locale: 'it-IT' };
    const input = <TextInput accessibilityLabel={t('settings.name')} placeholder="2026-10-03" />;
    const title = <Text>{t('account.balance', {amount:money(balance)})}</Text>;
    const original = <Text>{transaction.description}{permission.disclosure.text}</Text>;
    const technicalKey = <Text key={\`safe-\${currency}\`}>{currency}</Text>;
    const brand = <Text>Lilleri</Text>; const format = <Text>CSV</Text>;
    const request = <Pressable onPress={() => send(\`/v1/transactions/\${id}\`)} />;
    class LocalValidationError extends Error {};
    const local = new LocalValidationError(t('settings.invalid'));
    setError(cause instanceof LocalValidationError ? cause.message : problemMessage(cause));
    const day = new Intl.DateTimeFormat('en-CA', {timeZone:profile.timezone}).formatToParts(now);
    const style = <View style={s.detail} />;
    button(t('settings.save'), save); new Intl.DateTimeFormat(locale).format(now);
  `
  assert.deepEqual(lintUiCopy(source), [])
})
