import {
  type ApiClient,
  ApiError,
  type LedgerReadPage,
  type LedgerSearchQuery,
  type TransactionDto,
} from '@lilleri/api-client'

export interface LedgerSearchState {
  readonly items: readonly TransactionDto[]
  readonly loading: boolean
  readonly error: unknown | null
  readonly nextCursor: string | null
  readonly searchComplete: boolean
}
export const EMPTY_LEDGER_SEARCH: LedgerSearchState = {
  items: [],
  loading: false,
  error: null,
  nextCursor: null,
  searchComplete: false,
}
export interface LedgerSearchContext {
  readonly profileId: string
  readonly query: LedgerSearchQuery
  readonly history90: boolean
  /** Rechecks current profile/session epoch and network state after every await. */
  readonly current: () => boolean
}

/** Responses belong to the exact query and current identity that started them. */
export class LedgerSearchSession {
  private version = 0
  private abort: AbortController | null = null
  private context: LedgerSearchContext | null = null
  private state: LedgerSearchState = EMPTY_LEDGER_SEARCH
  constructor(
    readonly client: Pick<ApiClient, 'searchTransactions' | 'ledgerProjection'>,
    readonly publish: (state: LedgerSearchState) => void,
    readonly identityFailure: (cause: unknown) => boolean,
  ) {}
  stop() {
    this.version++
    this.abort?.abort()
    this.abort = null
    this.context = null
    this.state = EMPTY_LEDGER_SEARCH
  }
  async start(context: LedgerSearchContext) {
    this.stop()
    this.context = context
    this.state = EMPTY_LEDGER_SEARCH
    await this.fetchPage(false)
  }
  async more() {
    if (this.state.loading || !this.state.nextCursor) return
    await this.fetchPage(true)
  }
  private async fetchPage(append: boolean) {
    const context = this.context,
      version = this.version
    if (!context?.current()) return
    const abort = new AbortController()
    this.abort = abort
    const accepted = () => !abort.signal.aborted && version === this.version && context.current()
    this.state = { ...this.state, loading: true, error: null }
    this.publish(this.state)
    const query = {
      ...context.query,
      ...(append && this.state.nextCursor ? { cursor: this.state.nextCursor } : {}),
    }
    try {
      const page: LedgerReadPage = context.history90
        ? await this.client.ledgerProjection(query, abort.signal)
        : await this.client.searchTransactions(query, abort.signal)
      if (!accepted()) return
      if (page.items.some((item) => item.profileId !== context.profileId))
        throw new ApiError(401, 'session_invalid', 'Accedi di nuovo per continuare.')
      const items = append ? [...this.state.items, ...page.items] : page.items
      if (new Set(items.map((item) => item.id)).size !== items.length)
        throw new ApiError(409, 'ledger_changed', 'I movimenti sono cambiati. Ripeti la ricerca.')
      this.state = {
        items,
        loading: false,
        error: null,
        nextCursor: page.nextCursor,
        searchComplete: page.searchComplete,
      }
      this.publish(this.state)
    } catch (cause) {
      if (!accepted() || this.identityFailure(cause)) return
      // Invalid/stale cursors cannot leave an apparently complete mixed snapshot.
      const stale =
        cause instanceof ApiError &&
        (cause.code === 'ledger_changed' || cause.code === 'invalid_cursor')
      this.state = { ...(stale ? EMPTY_LEDGER_SEARCH : this.state), loading: false, error: cause }
      this.publish(this.state)
    }
  }
}
