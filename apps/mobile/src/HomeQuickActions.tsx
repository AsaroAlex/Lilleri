import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export interface HomeQuickActionsCopy {
  readonly title: string
  readonly add: string
  readonly addHelp: string
  readonly review: string
  readonly reviewHelp: string
  readonly transactions: string
  readonly transactionsHelp: string
  readonly summary: string
  readonly summaryHelp: string
}

export function defaultHomeQuickActionsCopy(reviewCount: number): HomeQuickActionsCopy {
  return {
    title: 'Usa il quaderno',
    add: 'Aggiungi conto o movimenti',
    addHelp: 'Tieni traccia di contanti o importa un file. Parti da un conto manuale.',
    review: 'Rivedi i movimenti',
    reviewHelp: `${reviewCount} ${reviewCount === 1 ? 'proposta' : 'proposte'} da confrontare prima di confermare.`,
    transactions: 'Esplora i movimenti',
    transactionsHelp: 'Cerca un movimento, controlla la categoria e apri il dettaglio.',
    summary: 'Apri il riepilogo',
    summaryHelp: 'Guarda il mese e scegli i conti da usare nella stima del margine.',
  }
}

interface Props {
  readonly theme: BrandTheme
  readonly reviewCount: number
  readonly disabled?: boolean
  readonly copy?: HomeQuickActionsCopy
  readonly onAdd: () => void
  readonly onReview: () => void
  readonly onTransactions: () => void
  readonly onSummary: () => void
}

/** Shortcuts use the existing screens; no first-run state or financial mutation. */
export function HomeQuickActions({
  theme,
  reviewCount,
  disabled = false,
  copy = defaultHomeQuickActionsCopy(reviewCount),
  onAdd,
  onReview,
  onTransactions,
  onSummary,
}: Props) {
  const c = colors[theme]
  const [width, setWidth] = useState(0)
  const roomy = width >= 600
  const actions = [
    { title: copy.add, help: copy.addHelp, onPress: onAdd },
    {
      title: reviewCount > 0 ? copy.review : copy.transactions,
      help: reviewCount > 0 ? copy.reviewHelp : copy.transactionsHelp,
      onPress: reviewCount > 0 ? onReview : onTransactions,
    },
    { title: copy.summary, help: copy.summaryHelp, onPress: onSummary },
  ]

  return (
    <View style={s.container} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      <Text accessibilityRole="header" aria-level={2} style={[s.heading, { color: c.textPrimary }]}>
        {copy.title}
      </Text>
      <View style={[s.actions, { borderTopColor: c.borderStrong }]}>
        {actions.map((action, index) => (
          <Pressable
            key={action.title}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            accessibilityHint={action.help}
            accessibilityState={{ disabled }}
            aria-disabled={disabled}
            disabled={disabled}
            onPress={action.onPress}
            style={({ pressed }) => [
              s.action,
              {
                backgroundColor: pressed ? c.primarySoft : 'transparent',
                borderBottomColor: c.border,
              },
              disabled && s.disabled,
            ]}
          >
            <Text style={[s.number, { color: c.primary }]} aria-hidden={true} accessible={false}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <View style={[s.copy, roomy && s.roomyCopy]}>
              <Text style={[s.title, roomy && s.roomyTitle, { color: c.textPrimary }]}>
                {action.title}
              </Text>
              <Text style={[s.help, roomy && s.roomyHelp, { color: c.textSecondary }]}>
                {action.help}
              </Text>
            </View>
            <Text style={[s.arrow, { color: c.primary }]} aria-hidden={true} accessible={false}>
              →
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { gap: 14, marginBottom: 24 },
  heading: {
    fontFamily: tokens.typography.fontEditorial,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  actions: { borderTopWidth: 1 },
  action: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 80,
    paddingVertical: 17,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 14,
  },
  number: {
    width: 25,
    paddingTop: 3,
    fontFamily: tokens.typography.fontUI,
    fontSize: 12,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  roomyCopy: { flexDirection: 'row', alignItems: 'center', gap: 26 },
  title: {
    fontFamily: tokens.typography.fontEditorial,
    fontSize: 23,
    lineHeight: 27,
    letterSpacing: -0.25,
  },
  roomyTitle: { flexBasis: '45%', flexShrink: 1 },
  arrow: { width: 20, fontSize: 23, lineHeight: 27 },
  help: { fontFamily: tokens.typography.fontUI, fontSize: 13, lineHeight: 20 },
  roomyHelp: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.6 },
})
