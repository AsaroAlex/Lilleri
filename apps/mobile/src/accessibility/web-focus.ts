export interface WebDialogFocusOptions {
  readonly initialFocus?: HTMLElement | null
  readonly returnFocus?: HTMLElement | null
  readonly onDismiss?: () => void
  readonly canDismiss?: () => boolean
  /** A changing identity/context must make old listeners inert before effect cleanup. */
  readonly isCurrent?: () => boolean
  readonly mayRestoreFocus?: () => boolean
}

const activeDialogs = new WeakMap<Document, HTMLElement>()
const candidateSelector =
  'a[href],area[href],button,input,select,textarea,summary,[contenteditable],[tabindex]'

export function webElement(value: unknown): HTMLElement | null {
  if (!value || typeof value !== 'object') return null
  const element = value as HTMLElement
  const view = element.ownerDocument?.defaultView
  return view && element instanceof view.HTMLElement ? element : null
}

function available(element: HTMLElement) {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)
  if (
    !element.isConnected ||
    !element.getClientRects().length ||
    style?.visibility === 'hidden' ||
    style?.visibility === 'collapse' ||
    element.closest('[inert],[hidden],[aria-hidden="true"]') ||
    element.matches(':disabled,[aria-disabled="true"],input[type="hidden"]')
  )
    return false
  const closed = element.closest('details:not([open])')
  return !closed || !!closed.querySelector('summary')?.contains(element)
}

function focusable(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(candidateSelector)]
    .filter((element) => element.tabIndex >= 0 && available(element))
    .map((element, index) => ({ element, index }))
    .sort((a, b) => {
      const first = a.element.tabIndex,
        second = b.element.tabIndex
      if (first > 0 && second > 0) return first - second || a.index - b.index
      if (first > 0) return -1
      if (second > 0) return 1
      return a.index - b.index
    })
    .map(({ element }) => element)
}

/** Temporary programmatic focus does not add a heading/container to sequential Tab order. */
export function focusWebElement(value: unknown, preventScroll = false): boolean {
  const element = webElement(value)
  if (!element || !available(element)) return false
  const temporary = element.tabIndex < 0 && !element.hasAttribute('tabindex')
  if (temporary) element.setAttribute('tabindex', '-1')
  const restore = () => {
    if (temporary && element.getAttribute('tabindex') === '-1') element.removeAttribute('tabindex')
  }
  try {
    element.focus({ preventScroll })
  } catch {
    restore()
    return false
  }
  if (element.ownerDocument.activeElement !== element) {
    restore()
    return false
  }
  if (temporary) element.addEventListener('blur', restore, { once: true })
  return true
}

/** Browser focus behavior only. The caller supplies a named/described dialog and its safe action. */
export function activateWebDialog(root: HTMLElement, options: WebDialogFocusOptions = {}) {
  if (!webElement(root) || !root.isConnected) throw new Error('A mounted web dialog is required')
  const document = root.ownerDocument
  if (activeDialogs.has(document)) throw new Error('A web dialog focus scope is already active')
  const returnFocus =
    options.returnFocus === undefined ? webElement(document.activeElement) : options.returnFocus
  const hidden: { element: HTMLElement; inert: string | null; ariaHidden: string | null }[] = []
  const hiddenElements = new WeakSet<HTMLElement>()
  const hideBackground = () => {
    let branch = root,
      parent = branch.parentElement
    while (parent && parent !== document.documentElement) {
      for (const sibling of [...parent.children]) {
        const element = webElement(sibling)
        if (!element || element === branch || hiddenElements.has(element)) continue
        hidden.push({
          element,
          inert: element.getAttribute('inert'),
          ariaHidden: element.getAttribute('aria-hidden'),
        })
        hiddenElements.add(element)
        element.setAttribute('inert', '')
        element.setAttribute('aria-hidden', 'true')
      }
      branch = parent
      parent = branch.parentElement
    }
  }
  hideBackground()
  let disposed = false
  activeDialogs.set(document, root)
  const current = () => !disposed && root.isConnected && (options.isCurrent?.() ?? true)
  const initial = () => {
    const preferred = options.initialFocus
    if (preferred && root.contains(preferred) && available(preferred) && focusWebElement(preferred))
      return
    focusWebElement(focusable(root)[0] ?? root)
  }
  const keydown = (event: KeyboardEvent) => {
    if (!current() || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Escape' && options.onDismiss) {
      event.preventDefault()
      event.stopPropagation()
      if (options.canDismiss?.() ?? true) options.onDismiss()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      event.stopPropagation()
      const elements = focusable(root)
      if (!elements.length) {
        focusWebElement(root)
        return
      }
      const index = elements.indexOf(webElement(document.activeElement) as HTMLElement)
      const next = event.shiftKey
        ? index <= 0
          ? elements.length - 1
          : index - 1
        : index < 0 || index === elements.length - 1
          ? 0
          : index + 1
      focusWebElement(elements[next])
    }
  }
  const focusin = (event: FocusEvent) => {
    if (current() && !root.contains(event.target as Node)) initial()
  }
  document.addEventListener('keydown', keydown, true)
  document.addEventListener('focusin', focusin, true)
  const observer = new MutationObserver(() => {
    if (current()) hideBackground()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  initial()
  return () => {
    if (disposed) return
    disposed = true
    document.removeEventListener('keydown', keydown, true)
    document.removeEventListener('focusin', focusin, true)
    observer.disconnect()
    activeDialogs.delete(document)
    for (const { element, inert, ariaHidden } of hidden) {
      if (inert === null) element.removeAttribute('inert')
      else element.setAttribute('inert', inert)
      if (ariaHidden === null) element.removeAttribute('aria-hidden')
      else element.setAttribute('aria-hidden', ariaHidden)
    }
    if ((options.mayRestoreFocus?.() ?? true) && returnFocus?.ownerDocument === document)
      focusWebElement(returnFocus, true)
  }
}
