import type { ApiClient, LedgerSearchQuery } from '@lilleri/api-client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EMPTY_LEDGER_SEARCH, LedgerSearchSession } from './ledger-search-session'

export function useLedgerSearch(options: {
  readonly api: ApiClient
  readonly enabled: boolean
  readonly profileId: string | undefined
  readonly identityEpoch: number
  readonly refreshKey: unknown
  readonly query: LedgerSearchQuery
  readonly history90: boolean
  readonly current: () => boolean
  readonly identityFailure: (cause: unknown) => boolean
}) {
  const [state, setState] = useState(EMPTY_LEDGER_SEARCH)
  const [retry, setRetry] = useState(0)
  const current = useRef(options.current),
    failure = useRef(options.identityFailure)
  current.current = options.current
  failure.current = options.identityFailure
  const session = useMemo(
    () => new LedgerSearchSession(options.api, setState, (cause) => failure.current(cause)),
    [options.api],
  )
  const queryKey = JSON.stringify(options.query)
  const refresh = useRef({ value: options.refreshKey, version: 0 })
  if (refresh.current.value !== options.refreshKey)
    refresh.current = { value: options.refreshKey, version: refresh.current.version + 1 }
  const requestKey = `${options.profileId ?? ''}:${options.identityEpoch}:${options.enabled}:${options.history90}:${queryKey}:${refresh.current.version}:${retry}`
  const latestKey = useRef(requestKey)
  latestKey.current = requestKey
  const startedKey = useRef('')
  useEffect(() => {
    session.stop()
    setState(EMPTY_LEDGER_SEARCH)
    startedKey.current = requestKey
    if (!options.enabled || !options.profileId) return
    const profileId = options.profileId
    const verifyIdentity = current.current
    const timer = setTimeout(() => {
      void session.start({
        profileId,
        query: JSON.parse(queryKey) as LedgerSearchQuery,
        history90: options.history90,
        current: () => latestKey.current === requestKey && verifyIdentity(),
      })
    }, 250)
    return () => {
      clearTimeout(timer)
      session.stop()
    }
  }, [session, options.enabled, options.profileId, requestKey, options.history90, queryKey])
  return {
    ...(startedKey.current === requestKey ? state : EMPTY_LEDGER_SEARCH),
    more: useCallback(() => {
      void session.more()
    }, [session]),
    retry: useCallback(() => setRetry((value) => value + 1), []),
  }
}
