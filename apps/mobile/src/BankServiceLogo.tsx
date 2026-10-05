import { type BrandTheme, colors } from '@lilleri/brand'
import { useState } from 'react'
import { Image, PixelRatio, StyleSheet, Text, View } from 'react-native'
import { bankLogoAssets } from './bank-logo-assets'

interface BankServiceLogoProps {
  readonly entryId: string
  readonly name: string
  readonly theme: BrandTheme
  readonly detail?: boolean
}

/** Text fallback for an unknown service or an unavailable bundled image. */
function monogram(name: string) {
  if (name === 'American Express') return 'Amex'
  if (name === 'Banco BPM') return 'BPM'
  if (name === 'Intesa Sanpaolo') return 'IS'
  if (name === 'Monte dei Paschi di Siena') return 'MPS'
  if (name === 'BNL BNP Paribas') return 'BNL'
  if (name === 'BPER Banca') return 'BPER'
  if (name === 'ING' || name === 'N26') return name
  const words = name.split(/[\s-]+/).filter(Boolean)
  return words.length > 1
    ? words
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : name.slice(0, 2)
}

/** Bundled brand artwork is decorative; the adjacent service name labels the action. */
export function BankServiceLogo({ entryId, name, theme, detail = false }: BankServiceLogoProps) {
  const [failedEntry, setFailedEntry] = useState<string | null>(null)
  const source = Object.hasOwn(bankLogoAssets, entryId) ? bankLogoAssets[entryId] : undefined
  const showLogo = source !== undefined && failedEntry !== entryId
  const resolutionLimit = source?.rasterPixels
    ? Math.floor(source.rasterPixels / PixelRatio.get())
    : undefined
  const c = colors[theme]
  return (
    <View
      testID={`bank-service-logo-${entryId}`}
      accessible={false}
      aria-hidden={true}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        s.plate,
        detail && s.detailPlate,
        { backgroundColor: showLogo ? '#FFFFFF' : c.background },
      ]}
    >
      {showLogo ? (
        <Image
          key={entryId}
          source={source.source}
          style={[
            s.image,
            detail && s.detailImage,
            resolutionLimit !== undefined && {
              maxWidth: resolutionLimit,
              maxHeight: resolutionLimit,
            },
          ]}
          resizeMode="contain"
          onError={() => setFailedEntry(entryId)}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text accessible={false} style={[s.monogram, { color: c.textSecondary }]}>
          {monogram(name)}
        </Text>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  // A white plate preserves official logo colours in both application themes.
  plate: {
    width: 64,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: 8,
  },
  detailPlate: { width: 64, height: 64, borderRadius: 12 },
  image: { width: 56, height: 32 },
  detailImage: { width: 52, height: 52 },
  monogram: { fontFamily: 'GeistSemibold', fontSize: 12, lineHeight: 18 },
})
