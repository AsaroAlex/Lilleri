import type { BrandTheme } from '@lilleri/brand'
import type { Account, CategoryId } from '@lilleri/domain'
import { Image } from 'react-native'
import { type FinanceArtwork, financeAssets } from './finance-assets'

export type FinanceVisualKind =
  | 'bank'
  | 'cash'
  | 'card'
  | 'savings'
  | 'search'
  | 'home'
  | 'review'
  | 'settings'
  | 'transfer'
  | 'recurring'
  | 'wallet'
  | 'filter'
  | 'plus'
  | 'link'

interface VisualProps {
  readonly size?: number
  readonly mode?: BrandTheme
}

export interface FinanceVisualProps extends VisualProps {
  readonly kind: FinanceVisualKind
  /** A transparent line icon for navigation and controls. */
  readonly bare?: boolean
  /** Optional tint for bare icons, e.g. an active navigation colour. */
  readonly color?: string
}

function DecorativeArtwork({
  artwork,
  size = 40,
  mode = 'light',
  bare = false,
  color,
}: VisualProps & {
  readonly artwork: FinanceArtwork
  readonly bare?: boolean
  readonly color?: string
}) {
  return (
    <Image
      source={financeAssets[bare ? 'bare' : mode][artwork]}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        ...(bare && color ? { tintColor: color } : {}),
      }}
      resizeMode="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      accessibilityIgnoresInvertColors
    />
  )
}

/** Original decorative artwork; the adjacent label remains the accessible name. */
export function FinanceVisual(props: FinanceVisualProps) {
  const { kind, ...visualProps } = props
  return <DecorativeArtwork artwork={kind} {...visualProps} />
}

const CATEGORY_ARTWORK = {
  income: 'income',
  groceries: 'groceries',
  shopping: 'shopping',
  food: 'food',
  transport: 'transport',
  utilities: 'utilities',
  subscriptions: 'subscriptions',
  health: 'health',
  travel: 'travel',
  transfer: 'transfer',
  uncategorised: 'uncategorised',
} as const satisfies Readonly<Record<CategoryId, FinanceArtwork>>

export interface CategoryVisualProps extends VisualProps {
  /** Unknown/custom categories get a neutral fallback, without guessing their meaning. */
  readonly categoryId: string | null | undefined
}

export function CategoryVisual({ categoryId, ...visualProps }: CategoryVisualProps) {
  const artwork =
    categoryId && Object.hasOwn(CATEGORY_ARTWORK, categoryId)
      ? CATEGORY_ARTWORK[categoryId as CategoryId]
      : 'uncategorised'
  return <DecorativeArtwork artwork={artwork} {...visualProps} />
}

const ACCOUNT_ARTWORK = {
  current: 'bank',
  card: 'card',
  cash: 'cash',
  savings: 'savings',
} as const satisfies Readonly<Record<Account['kind'], FinanceVisualKind>>

export interface AccountVisualProps extends VisualProps {
  readonly kind: Account['kind']
}

/** Account kind comes from owned account metadata, never from a guessed institution logo. */
export function AccountVisual({ kind, ...visualProps }: AccountVisualProps) {
  return <DecorativeArtwork artwork={ACCOUNT_ARTWORK[kind]} {...visualProps} />
}
