import type { AccountDto, DemoOverview, MoneyDto } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { calendarDateAt } from '@lilleri/domain'
import { fromJson } from '@lilleri/money'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { CategoryVisual, FinanceVisual } from './FinanceVisual'
import { useI18n } from './i18n/context'

interface Props {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly history: string
  readonly emptyFixtures: boolean
  readonly onManualAccount?: () => void
  readonly onConnections: () => void
  readonly onAccount: (accountId: string) => void
}

/** Uses the engine's privacy-aware, currency-separated aggregates only. */
export function FinanceHome({
  overview,
  theme,
  history,
  emptyFixtures,
  onManualAccount,
  onConnections,
  onAccount,
}: Props) {
  const { t, money, accessibleMoney, calendarDate, instant } = useI18n()
  const c = colors[theme]
  const s = styles(c)
  const { width } = useWindowDimensions()
  const [details, setDetails] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null)
  const currency = overview.analysis.summaries.some(
    (summary) => summary.currency === selectedCurrency,
  )
    ? selectedCurrency
    : overview.analysis.summaries[0]?.currency
  const amount = (value: MoneyDto) => money(fromJson(value), { symbolPosition: 'before' })
  const accountTile = (account: AccountDto) => (
    <Pressable
      key={account.id}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, ${accessibleMoney(fromJson(account.balance))}, ${account.balanceUpdatedAt ? instant(account.balanceUpdatedAt) : t('app.notUpdated')}`}
      onPress={() => onAccount(account.id)}
      style={({ pressed }) => [
        s.account,
        width < 600 ? s.carouselAccount : s.gridAccount,
        pressed && s.pressed,
      ]}
    >
      <View style={s.accountHeading}>
        <FinanceVisual
          kind={
            account.kind === 'current'
              ? 'bank'
              : account.kind === 'cash'
                ? 'cash'
                : account.kind === 'card'
                  ? 'card'
                  : 'savings'
          }
          size={40}
          mode={theme}
        />
        <View style={s.accountName}>
          <Text numberOfLines={1} style={s.accountTitle}>
            {account.name}
          </Text>
          <Text numberOfLines={1} style={s.small}>
            {account.institutionName}
          </Text>
        </View>
      </View>
      <Text style={s.accountAmount}>{amount(account.balance)}</Text>
      <Text style={s.small}>
        {account.balanceUpdatedAt
          ? calendarDate(
              calendarDateAt(new Date(account.balanceUpdatedAt), overview.profile.timezone),
            )
          : t('app.notUpdated')}{' '}
        · {account.balance.currency}
      </Text>
      {emptyFixtures &&
        overview.connections.some(
          (connection) =>
            connection.id === account.connectionId && connection.providerId === 'mock-italian',
        ) && <Text style={s.small}>{t('app.syntheticBalance')}</Text>}
    </Pressable>
  )
  if (!overview.accounts.length && !overview.transactions.length)
    return (
      <View style={s.welcome}>
        <View style={[s.welcomeTop, width >= 700 && s.welcomeWide]}>
          <FinanceVisual kind="wallet" size={width < 600 ? 104 : 160} mode={theme} />
          <View style={s.welcomeCopy}>
            <Text accessibilityRole="header" aria-level={2} style={s.welcomeTitle}>
              {t('app.emptyHomeTitle')}
            </Text>
            <Text style={s.copy}>{t('app.emptyHomeCopy')}</Text>
            <Pressable accessibilityRole="button" onPress={onConnections} style={s.primaryButton}>
              <Text style={s.primaryText}>{t('app.connectionSetup')}</Text>
            </Pressable>
            {onManualAccount && (
              <Pressable
                accessibilityRole="button"
                onPress={onManualAccount}
                style={s.detailsButton}
              >
                <Text style={s.link}>{t('home.manualAccount')}</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={s.categoryPreview} aria-hidden={true} accessible={false}>
          {(['groceries', 'transport', 'shopping', 'utilities'] as const).map((id) => (
            <CategoryVisual key={id} categoryId={id} size={48} mode={theme} />
          ))}
        </View>
      </View>
    )
  return (
    <View style={s.root}>
      <View style={s.summaryHeading}>
        <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
          {t('app.spendingShort')}
        </Text>
        <Text style={s.small}>{history}</Text>
      </View>
      {width < 600 && overview.analysis.summaries.length > 1 && (
        <View style={s.currencyChoices}>
          {overview.analysis.summaries.map((summary) => (
            <Pressable
              key={summary.currency}
              accessibilityRole="button"
              accessibilityState={{ selected: currency === summary.currency }}
              aria-pressed={currency === summary.currency}
              onPress={() => setSelectedCurrency(summary.currency)}
              style={[s.currencyChoice, currency === summary.currency && s.chosenCurrency]}
            >
              <Text style={[s.small, currency === summary.currency && { color: c.primary }]}>
                {summary.currency} · {amount(summary.spend)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={s.summaries}>
        {overview.analysis.summaries
          .filter((summary) => width >= 600 || summary.currency === currency)
          .map((summary, index) => (
            <View key={summary.currency} style={[s.summary, index === 0 && s.leadingSummary]}>
              <View style={s.summaryTop}>
                <FinanceVisual kind="wallet" size={32} mode={theme} />
                <Text style={s.currency}>{summary.currency}</Text>
              </View>
              <Text
                accessibilityLabel={t('app.spendLabel', {
                  amount: accessibleMoney(fromJson(summary.spend)),
                })}
                style={[s.spend, width < 400 && s.compactSpend]}
              >
                {amount(summary.spend)}
              </Text>
              <View style={s.metrics}>
                <View style={s.metric}>
                  <Text style={s.small}>{t('app.incomeShort')}</Text>
                  <Text style={s.metricAmount}>{amount(summary.income)}</Text>
                </View>
                <View style={s.metric}>
                  <Text style={s.small}>{t('app.pendingShort')}</Text>
                  <Text style={s.metricAmount}>{amount(summary.pending)}</Text>
                </View>
              </View>
            </View>
          ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: details }}
        aria-expanded={details}
        onPress={() => setDetails(!details)}
        style={s.detailsButton}
      >
        <Text style={s.small}>
          {t('app.summaryDetails')} {details ? '−' : '+'}
        </Text>
      </Pressable>
      {details && <Text style={s.small}>{t('app.summaryNote')}</Text>}
      <View style={s.summaryHeading}>
        <Text accessibilityRole="header" aria-level={2} style={s.sectionTitle}>
          {t('app.accountsHeading')}
        </Text>
        <Pressable accessibilityRole="button" onPress={onConnections} style={s.textButton}>
          <Text style={s.link}>{t('app.accountSources')}</Text>
        </Pressable>
      </View>
      {width < 600 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.accountCarousel}
        >
          {overview.accounts.map(accountTile)}
        </ScrollView>
      ) : (
        <View style={s.accountGrid}>{overview.accounts.map(accountTile)}</View>
      )}
    </View>
  )
}

function styles(c: typeof colors.light | typeof colors.dark) {
  return StyleSheet.create({
    root: { gap: 10 },
    summaryHeading: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontFamily: 'GeistSemibold',
      fontSize: 18,
      lineHeight: 26,
      color: c.textPrimary,
    },
    small: {
      fontFamily: 'Geist',
      fontSize: 12,
      lineHeight: 18,
      color: c.textSecondary,
      flexShrink: 1,
    },
    summaries: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    currencyChoices: { flexDirection: 'row', gap: 4 },
    currencyChoice: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    chosenCurrency: { backgroundColor: c.primarySoft },
    summary: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 260,
      minWidth: 0,
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 16,
      gap: 8,
    },
    leadingSummary: { borderWidth: 1, borderColor: c.border },
    summaryTop: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    currency: { fontFamily: 'GeistMedium', fontSize: 12, color: c.textSecondary },
    spend: {
      fontFamily: 'GeistSemibold',
      fontSize: 34,
      lineHeight: 42,
      color: c.textPrimary,
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    },
    compactSpend: { fontSize: 28, lineHeight: 36 },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metric: { minWidth: 110, flexGrow: 1, gap: 2 },
    metricAmount: {
      fontFamily: 'GeistMedium',
      fontSize: 16,
      lineHeight: 24,
      fontVariant: ['tabular-nums'],
      color: c.textPrimary,
    },
    detailsButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
    textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
    link: { fontFamily: 'GeistMedium', fontSize: 14, color: c.primary },
    accountCarousel: { gap: 12, paddingBottom: 4 },
    accountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    account: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    carouselAccount: { width: 224 },
    gridAccount: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, maxWidth: 360 },
    accountHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    accountName: { flex: 1, minWidth: 0, gap: 2 },
    accountTitle: { fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 20, color: c.textPrimary },
    accountAmount: {
      fontFamily: 'GeistSemibold',
      fontSize: 22,
      lineHeight: 30,
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    pressed: { opacity: 0.75 },
    welcome: { padding: 24, gap: 20, borderRadius: 24, backgroundColor: c.surface },
    welcomeTop: { alignItems: 'flex-start', gap: 16 },
    welcomeWide: { flexDirection: 'row', alignItems: 'center', gap: 32 },
    welcomeCopy: { flexShrink: 1, gap: 12 },
    welcomeTitle: {
      fontFamily: 'GeistSemibold',
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: -0.8,
      color: c.textPrimary,
    },
    copy: { fontFamily: 'Geist', fontSize: 16, lineHeight: 24, color: c.textSecondary },
    primaryButton: {
      minHeight: 48,
      justifyContent: 'center',
      alignSelf: 'flex-start',
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    primaryText: { color: c.onPrimary, fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 22 },
    categoryPreview: { flexDirection: 'row', gap: 12 },
  })
}
