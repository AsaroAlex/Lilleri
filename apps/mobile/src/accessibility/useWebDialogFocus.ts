import { type RefObject, useEffect, useRef } from 'react'
import { activateWebDialog, webElement } from './web-focus'

interface Options {
  readonly active: boolean
  readonly root: RefObject<unknown>
  readonly resetKey: string | number
  readonly initialFocusSelector?: string
  readonly onDismiss?: () => void
  readonly canDismiss?: () => boolean
  readonly isCurrent?: () => boolean
  readonly mayRestoreFocus?: () => boolean
}

/** Native views are left to their platform modal implementation; no native acceptance is inferred. */
export function useWebDialogFocus(options: Options) {
  const latest = useRef(options)
  latest.current = options
  const { active, root, resetKey, initialFocusSelector } = options
  useEffect(() => {
    if (!active) return
    const element = webElement(root.current)
    if (!element) return
    const isCurrent = () =>
      latest.current.active &&
      (latest.current.isCurrent?.() ?? true) &&
      latest.current.resetKey === resetKey &&
      webElement(root.current) === element
    return activateWebDialog(element, {
      initialFocus: initialFocusSelector
        ? element.querySelector<HTMLElement>(initialFocusSelector)
        : null,
      onDismiss: () => {
        if (isCurrent()) latest.current.onDismiss?.()
      },
      canDismiss: () => isCurrent() && (latest.current.canDismiss?.() ?? true),
      isCurrent,
      mayRestoreFocus: () =>
        latest.current.resetKey === resetKey && (latest.current.mayRestoreFocus?.() ?? true),
    })
  }, [active, root, resetKey, initialFocusSelector])
}
