import { type BrandTheme, colors, tokens } from '@lilleri/brand'
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
    title: 'Da dove vuoi iniziare?',
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
    <View style={s.container}>
      <Text accessibilityRole="header" aria-level={2} style={[s.heading, { color: c.textPrimary }]}>
        {copy.title}
      </Text>
      <View style={s.actions}>
        {actions.map((action) => (
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
                backgroundColor: pressed ? c.primarySoft : c.surface,
                borderColor: c.borderStrong,
              },
              disabled && s.disabled,
            ]}
          >
            <View style={s.titleRow}>
              <Text style={[s.title, { color: c.textPrimary }]}>{action.title}</Text>
              <Text style={[s.arrow, { color: c.primary }]} aria-hidden={true} accessible={false}>
                →
              </Text>
            </View>
            <Text style={[s.help, { color: c.textSecondary }]}>{action.help}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { gap: 12, marginBottom: 24 },
  heading: {
    fontFamily: tokens.typography.fontUI,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: {
    flexBasis: 220,
    flexGrow: 1,
    minWidth: 0,
    minHeight: 96,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flexShrink: 1,
    fontFamily: tokens.typography.fontUI,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  arrow: { fontSize: 20, lineHeight: 24 },
  help: { fontFamily: tokens.typography.fontUI, fontSize: 14, lineHeight: 21 },
  disabled: { opacity: 0.6 },
})
