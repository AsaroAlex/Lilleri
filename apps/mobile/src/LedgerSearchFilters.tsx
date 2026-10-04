import type { AccountDto } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import type { CurrencyCode } from '@lilleri/domain'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useI18n } from './i18n/context'

export interface LedgerFilters {
  readonly history90: boolean
  readonly accountId: string
  readonly currency: CurrencyCode | ''
  readonly from: string
  readonly to: string
}
export const EMPTY_LEDGER_FILTERS: LedgerFilters = {
  history90: false,
  accountId: '',
  currency: '',
  from: '',
  to: '',
}
export function LedgerSearchFilters({
  accounts,
  value,
  onChange,
  theme,
  offline,
}: {
  readonly accounts: readonly AccountDto[]
  readonly value: LedgerFilters
  readonly onChange: (value: LedgerFilters) => void
  readonly theme: BrandTheme
  readonly offline: boolean
}) {
  const { t } = useI18n(),
    c = colors[theme]
  const [expanded, setExpanded] = useState(
    Boolean(value.accountId || value.currency || value.from || value.to),
  )
  const s = StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
    option: {
      minHeight: 44,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 12,
      borderColor: c.border,
    },
    text: { color: c.textPrimary, fontFamily: 'Geist', fontSize: 14 },
    caption: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 13, lineHeight: 20 },
    input: {
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 12,
      borderColor: c.border,
      color: c.textPrimary,
      padding: 12,
      fontFamily: 'Geist',
      fontSize: 14,
    },
    date: { flexGrow: 1, flexBasis: 170, gap: 6 },
  })
  const option = (label: string, selected: boolean, press: () => void, key = label) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={press}
      style={[s.option, selected && { borderColor: c.textPrimary }]}
    >
      <Text style={s.text}>{label}</Text>
    </Pressable>
  )
  const currencies = [...new Set(accounts.map((item) => item.balance.currency))].sort()
  return (
    <View>
      {offline && <Text style={s.caption}>{t('ledger.offlineScope')}</Text>}
      <View style={s.row}>
        {option(t('ledger.allHistory'), !value.history90, () =>
          onChange({ ...value, history90: false }),
        )}
        {option(t('ledger.last90Days'), value.history90, () =>
          onChange({ ...value, history90: true }),
        )}
      </View>
      {value.history90 && <Text style={s.caption}>{t('ledger.windowHelp')}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onPress={() => setExpanded((value) => !value)}
        style={s.option}
      >
        <Text style={s.text}>{t(expanded ? 'ledger.fewerFilters' : 'ledger.moreFilters')}</Text>
      </Pressable>
      {expanded && (
        <>
          <View style={s.row}>
            {option(t('ledger.allAccounts'), !value.accountId, () =>
              onChange({ ...value, accountId: '' }),
            )}
            {accounts.map((account) =>
              option(
                account.name,
                value.accountId === account.id,
                () => onChange({ ...value, accountId: account.id }),
                account.id,
              ),
            )}
          </View>
          <View style={s.row}>
            {option(t('ledger.allCurrencies'), !value.currency, () =>
              onChange({ ...value, currency: '' }),
            )}
            {currencies.map((currency) =>
              option(currency, value.currency === currency, () => onChange({ ...value, currency })),
            )}
          </View>
          {!value.history90 && (
            <View style={s.row}>
              {(['from', 'to'] as const).map((field) => (
                <View key={field} style={s.date}>
                  <Text style={s.caption}>
                    {t(field === 'from' ? 'ledger.fromDate' : 'ledger.toDate')}
                  </Text>
                  <TextInput
                    accessibilityLabel={t(field === 'from' ? 'ledger.fromDate' : 'ledger.toDate')}
                    value={value[field]}
                    onChangeText={(text) => onChange({ ...value, [field]: text })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={c.textTertiary}
                    maxLength={10}
                    style={s.input}
                  />
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  )
}
