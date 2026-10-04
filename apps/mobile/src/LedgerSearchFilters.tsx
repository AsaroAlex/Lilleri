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
  const i18n = useI18n(),
    { t } = i18n,
    c = colors[theme]
  const [expanded, setExpanded] = useState(false)
  const s = StyleSheet.create({
    root: { gap: 8 },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    history: { flexDirection: 'row', flexShrink: 1, minWidth: 0, gap: 12 },
    tab: {
      minHeight: 44,
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      paddingHorizontal: 2,
    },
    selectedTab: { borderBottomColor: c.primary },
    toggle: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    filterIcon: { width: 18, height: 20, justifyContent: 'space-between', paddingVertical: 2 },
    filterLine: { height: 2, backgroundColor: c.textSecondary, borderRadius: 1 },
    filterKnob: {
      position: 'absolute',
      top: -1,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.textSecondary,
    },
    count: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: c.primary,
      textAlign: 'center',
      color: c.onPrimary,
      fontFamily: 'GeistSemibold',
      fontSize: 11,
      lineHeight: 18,
    },
    panel: { gap: 12, paddingVertical: 8 },
    group: { gap: 2 },
    groupLabel: {
      color: c.textSecondary,
      fontFamily: 'GeistMedium',
      fontSize: 12,
      lineHeight: 18,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    option: {
      minHeight: 44,
      maxWidth: '100%',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    selectedOption: { backgroundColor: c.primarySoft },
    text: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 13, lineHeight: 20 },
    selectedText: { color: c.primary, fontFamily: 'GeistSemibold' },
    caption: { color: c.textSecondary, fontFamily: 'Geist', fontSize: 12, lineHeight: 18 },
    activeFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    chip: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      maxWidth: '100%',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.primarySoft,
    },
    chipText: {
      color: c.primary,
      fontFamily: 'GeistMedium',
      fontSize: 12,
      lineHeight: 18,
      flexShrink: 1,
    },
    close: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
    closeStroke: {
      position: 'absolute',
      width: 12,
      height: 1.5,
      borderRadius: 1,
      backgroundColor: c.primary,
    },
    clear: {
      minHeight: 44,
      paddingHorizontal: 8,
      justifyContent: 'center',
    },
    input: {
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: c.border,
      color: c.textPrimary,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontFamily: 'Geist',
      fontSize: 14,
    },
    dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    date: { flexGrow: 1, flexBasis: 150, gap: 6 },
  })
  const option = (label: string, selected: boolean, press: () => void, key = label) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={press}
      style={[s.option, selected && s.selectedOption]}
    >
      <Text style={[s.text, selected && s.selectedText]}>{label}</Text>
    </Pressable>
  )
  const currencies = [...new Set(accounts.map((item) => item.balance.currency))].sort()
  const calendarDate = (text: string) => {
    try {
      return i18n.calendarDate(text)
    } catch {
      // Preserve partially typed or invalid input; the search owner validates date filters.
      return text
    }
  }
  const active = [
    ...(value.accountId
      ? [
          {
            id: 'account',
            label:
              accounts.find((account) => account.id === value.accountId)?.name ??
              t('ledger.account'),
            clear: () => onChange({ ...value, accountId: '' }),
          },
        ]
      : []),
    ...(value.currency
      ? [
          {
            id: 'currency',
            label: value.currency,
            clear: () => onChange({ ...value, currency: '' }),
          },
        ]
      : []),
    ...(!value.history90 && (value.from || value.to)
      ? [
          {
            id: 'period',
            label: `${value.from ? calendarDate(value.from) : '…'} – ${value.to ? calendarDate(value.to) : '…'}`,
            clear: () => onChange({ ...value, from: '', to: '' }),
          },
        ]
      : []),
  ]
  return (
    <View style={s.root}>
      {offline && <Text style={s.caption}>{t('ledger.offlineScope')}</Text>}
      <View style={s.toolbar}>
        <View style={s.history}>
          {([false, true] as const).map((history90) => (
            <Pressable
              key={String(history90)}
              accessibilityRole="button"
              accessibilityLabel={t(history90 ? 'ledger.last90Days' : 'ledger.allHistory')}
              accessibilityState={{ selected: value.history90 === history90 }}
              aria-pressed={value.history90 === history90}
              onPress={() => onChange({ ...value, history90 })}
              style={[s.tab, value.history90 === history90 && s.selectedTab]}
            >
              <Text style={[s.text, value.history90 === history90 && s.selectedText]}>
                {t(history90 ? 'ledger.last90DaysShort' : 'ledger.historyShort')}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(expanded ? 'ledger.fewerFilters' : 'ledger.moreFilters')}
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          onPress={() => setExpanded((value) => !value)}
          style={[s.toggle, expanded && s.selectedOption]}
        >
          <View aria-hidden style={s.filterIcon}>
            {[4, 11, 7].map((left) => (
              <View key={left} style={s.filterLine}>
                <View style={[s.filterKnob, { left }]} />
              </View>
            ))}
          </View>
          <Text style={[s.text, expanded && s.selectedText]}>{t('ledger.filters')}</Text>
          {active.length > 0 && <Text style={s.count}>{active.length}</Text>}
        </Pressable>
      </View>
      {expanded && (
        <View style={s.panel}>
          <View style={s.group}>
            <Text style={s.groupLabel}>{t('ledger.account')}</Text>
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
          </View>
          <View style={s.group}>
            <Text style={s.groupLabel}>{t('ledger.currency')}</Text>
            <View style={s.row}>
              {option(t('ledger.allCurrencies'), !value.currency, () =>
                onChange({ ...value, currency: '' }),
              )}
              {currencies.map((currency) =>
                option(currency, value.currency === currency, () =>
                  onChange({ ...value, currency }),
                ),
              )}
            </View>
          </View>
          {!value.history90 && (
            <View style={s.group}>
              <Text style={s.groupLabel}>{t('ledger.period')}</Text>
              <View style={s.dates}>
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
            </View>
          )}
          {value.history90 && <Text style={s.caption}>{t('ledger.windowHelp')}</Text>}
        </View>
      )}
      {active.length > 0 && (
        <View style={s.activeFilters}>
          {active.map((filter) => (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityLabel={t('ledger.removeFilter', { filter: filter.label })}
              onPress={filter.clear}
              style={s.chip}
            >
              <Text style={s.chipText}>{filter.label}</Text>
              <View aria-hidden style={s.close}>
                <View style={[s.closeStroke, { transform: [{ rotate: '45deg' }] }]} />
                <View style={[s.closeStroke, { transform: [{ rotate: '-45deg' }] }]} />
              </View>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange({ ...EMPTY_LEDGER_FILTERS, history90: value.history90 })}
            style={s.clear}
          >
            <Text style={s.caption}>{t('ledger.clearFilters')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
