import {
  createFxEvidenceClient,
  type FxEvidenceDto,
  type FxEvidenceEventDto,
} from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import { fromJson } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useI18n } from './i18n/context'
import { displayMessage, displayProblem } from './i18n/ui-message'

interface Props {
  readonly request: <T>(path: string, init?: RequestInit) => Promise<T>
  readonly profileId: string
  readonly transactionId: string
  readonly resetKey: number
  readonly theme: BrandTheme
  readonly onError: (cause: unknown) => boolean
}

/** Read-only source evidence. Scope changes immediately hide stale asynchronous results. */
export function FxEvidencePanel({
  request,
  profileId,
  transactionId,
  resetKey,
  theme,
  onError,
}: Props) {
  const i18n = useI18n(),
    { t } = i18n,
    c = colors[theme]
  const styles = useMemo(
    () =>
      StyleSheet.create({
        panel: { gap: 10, marginVertical: 12 },
        title: { color: c.textPrimary, fontSize: 18, fontWeight: '600' },
        body: { color: c.textPrimary, fontSize: 15 },
        caption: { color: c.textSecondary, fontSize: 13 },
        history: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderColor: c.border },
        button: {
          padding: 12,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 8,
          alignSelf: 'flex-start',
          minHeight: 44,
        },
      }),
    [c],
  )
  const client = useMemo(() => createFxEvidenceClient(request), [request]),
    scope = `${profileId}:${transactionId}:${resetKey}`
  const identity = useRef({ scope, request, epoch: 0 })
  if (identity.current.scope !== scope || identity.current.request !== request)
    identity.current = { scope, request, epoch: identity.current.epoch + 1 }
  const epoch = identity.current.epoch,
    mounted = useRef(true),
    handlers = useRef({ onError })
  handlers.current = { onError }
  const [state, setState] = useState<{
    epoch: number
    value: FxEvidenceDto | null
    loading: boolean
    error: unknown
  }>({ epoch, value: null, loading: true, error: null })
  const view = state.epoch === epoch ? state : { value: null, loading: true, error: null }
  const current = useCallback(
    (captured: number) => mounted.current && identity.current.epoch === captured,
    [],
  )
  const load = useCallback(
    async (beforeRevision?: number, signal?: AbortSignal) => {
      const captured = epoch
      if (!current(captured)) return
      setState((prior) => ({ ...prior, epoch: captured, loading: true, error: null }))
      try {
        const value = await client.evidence(transactionId, beforeRevision, signal)
        if (current(captured))
          setState((prior) => ({
            epoch: captured,
            loading: false,
            error: null,
            value:
              beforeRevision !== undefined && prior.epoch === captured && prior.value
                ? {
                    ...value,
                    history: [...prior.value.history, ...value.history].filter(
                      (event, index, events) =>
                        events.findIndex((other) => other.id === event.id) === index,
                    ),
                  }
                : value,
          }))
      } catch (cause) {
        if (!current(captured) || signal?.aborted) return
        const handled = handlers.current.onError(cause)
        if (current(captured))
          setState((prior) => ({
            epoch: captured,
            value: handled ? null : prior.epoch === captured ? prior.value : null,
            loading: false,
            error: handled ? null : cause,
          }))
      }
    },
    [epoch, current, client, transactionId],
  )
  useEffect(() => {
    mounted.current = true
    const abort = new AbortController()
    void load(undefined, abort.signal)
    return () => {
      mounted.current = false
      abort.abort()
    }
  }, [load])
  const money = (value: FxEvidenceEventDto['original']) =>
    value ? `${i18n.money(fromJson(value))} · ${value.currency}` : t('fx.missing')
  const details = (event: FxEvidenceEventDto) => (
    <View style={styles.panel}>
      <Text style={styles.body}>
        {t('fx.original')}: {money(event.original)}
      </Text>
      <Text style={styles.body}>
        {t('fx.billed')}: {money(event.billed)}
      </Text>
      <Text style={styles.caption}>
        {t('fx.ledger')}: {money(event.ledgerAmount)}
      </Text>
      <Text style={styles.body}>
        {event.rate
          ? t('fx.rate', {
              base: event.rate.baseCurrency,
              rate: event.rate.decimal,
              quote: event.rate.quoteCurrency,
            })
          : t('fx.missing')}
      </Text>
      <Text style={styles.caption}>
        {t('fx.rateDate', {
          date: event.rate?.date ? i18n.calendarDate(event.rate.date) : t('common.dateUnknown'),
        })}
      </Text>
      <Text style={styles.caption}>{t('fx.source', { provider: event.providerId })}</Text>
      <Text style={styles.caption}>
        {t('fx.reference', { reference: event.sourceReference ?? t('fx.missing') })}
      </Text>
    </View>
  )
  const value = view.value
  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('fx.title')}
      </Text>
      {view.loading ? <ActivityIndicator accessibilityLabel={t('common.loading')} /> : null}
      {view.error ? (
        <View style={styles.panel}>
          <Text accessibilityRole="alert" style={styles.body}>
            {displayMessage(i18n, displayProblem(view.error, 'common.problem'))}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => {
              void load()
            }}
          >
            <Text style={styles.body}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {value ? (
        <>
          <Text style={styles.body}>{t(`fx.${value.state}`)}</Text>
          {value.current ? details(value.current) : null}
          <Text style={styles.caption}>{t('fx.unchanged')}</Text>
          {value.history.some((event) => event.id !== value.current?.id) ? (
            <View style={styles.history}>
              <Text style={styles.title}>{t('fx.history')}</Text>
              {value.history
                .filter((event) => event.id !== value.current?.id)
                .map((event) => (
                  <View key={event.id}>
                    <Text style={styles.caption}>
                      {t('fx.version', {
                        revision: event.revision,
                        date: i18n.instant(event.observedAt),
                      })}
                    </Text>
                    <Text style={styles.caption}>{t(`fx.${event.state}`)}</Text>
                    {details(event)}
                  </View>
                ))}
            </View>
          ) : null}
          {value.nextBeforeRevision !== null ? (
            <Pressable
              accessibilityRole="button"
              disabled={view.loading}
              style={styles.button}
              onPress={() => {
                void load(value.nextBeforeRevision ?? undefined)
              }}
            >
              <Text style={styles.body}>{t('fx.more')}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  )
}
