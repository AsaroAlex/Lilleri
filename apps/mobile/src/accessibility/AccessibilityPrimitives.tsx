import { type BrandTheme, colors } from '@lilleri/brand'
import { useEffect, useId, useRef } from 'react'
import {
  Platform,
  Pressable,
  type PressableProps,
  Text,
  type TextProps,
  View,
  type ViewProps,
} from 'react-native'
import { useWebDialogFocus } from './useWebDialogFocus'
import { webElement } from './web-focus'

export function AccessibleHeading({
  level,
  ...props
}: TextProps & { readonly level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  return <Text {...props} accessibilityRole="header" aria-level={level} />
}

export function AccessibleStatus({
  urgent = false,
  ...props
}: ViewProps & { readonly urgent?: boolean }) {
  const root = useRef<View | null>(null)
  useEffect(() => {
    // RN Web 0.21 drops aria-atomic; keep the explicit live-region DOM contract.
    if (Platform.OS === 'web') webElement(root.current)?.setAttribute('aria-atomic', 'true')
  }, [])
  return (
    <View
      {...props}
      ref={root}
      role={urgent ? 'alert' : 'status'}
      accessibilityLiveRegion={urgent ? 'assertive' : 'polite'}
      aria-live={urgent ? 'assertive' : 'polite'}
      aria-atomic={true}
    />
  )
}

export function AccessibleChoice({
  kind,
  checked,
  label,
  disabled = false,
  ...props
}: Omit<PressableProps, 'accessibilityRole' | 'accessibilityLabel' | 'disabled'> & {
  readonly kind: 'checkbox' | 'radio'
  readonly checked: boolean
  readonly label: string
  readonly disabled?: boolean
}) {
  return (
    <Pressable
      {...props}
      accessibilityRole={kind}
      accessibilityLabel={label}
      accessibilityState={{ ...props.accessibilityState, checked, disabled }}
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
    />
  )
}

/** Mount once at the application surface. Values come from its shared semantic theme. */
export function WebAccessibilityStyles({ theme }: { readonly theme: BrandTheme }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    const style = document.createElement('style')
    style.dataset.lilleriAccessibility = 'true'
    style.textContent = `
      #lilleri-skip-content { left: 8px; top: -10000px; max-width: calc(100vw - 16px); }
      #lilleri-skip-content:focus { top: 8px; }
      :focus-visible { outline: 3px solid ${colors[theme].primary} !important; outline-offset: 2px !important; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
      }
    `
    document.head.append(style)
    return () => style.remove()
  }, [theme])
  return null
}

interface DialogProps extends ViewProps {
  readonly title: string
  readonly description: string
  readonly resetKey: string | number
  readonly onDismiss: () => void
  readonly canDismiss?: () => boolean
  readonly isCurrent?: () => boolean
  readonly mayRestoreFocus?: () => boolean
  readonly initialFocusSelector: string
  readonly headingStyle?: TextProps['style']
  readonly descriptionStyle?: TextProps['style']
}

/** Web modality/focus is verified separately; native apps still need their native modal/device review. */
export function AccessibleDialog({
  title,
  description,
  resetKey,
  onDismiss,
  canDismiss,
  initialFocusSelector,
  isCurrent,
  mayRestoreFocus,
  headingStyle,
  descriptionStyle,
  children,
  ...props
}: DialogProps) {
  const id = `lilleri-dialog-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const root = useRef<View | null>(null)
  useWebDialogFocus({
    active: true,
    root,
    resetKey,
    initialFocusSelector,
    onDismiss,
    ...(canDismiss ? { canDismiss } : {}),
    ...(isCurrent ? { isCurrent } : {}),
    ...(mayRestoreFocus ? { mayRestoreFocus } : {}),
  })
  return (
    <View
      {...props}
      ref={root}
      role={Platform.OS === 'web' ? 'alertdialog' : 'alert'}
      aria-modal={true}
      aria-labelledby={`${id}-heading`}
      aria-describedby={`${id}-description`}
      accessibilityViewIsModal
    >
      <AccessibleHeading level={2} nativeID={`${id}-heading`} style={headingStyle}>
        {title}
      </AccessibleHeading>
      <Text nativeID={`${id}-description`} style={descriptionStyle}>
        {description}
      </Text>
      {children}
    </View>
  )
}
