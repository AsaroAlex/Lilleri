import {
  ApiError,
  createManualClient,
  type DemoOverview,
  type ManualAccountDto,
  type ManualBalanceEventDto,
  type ManualEntryDto,
  manualRequestId,
} from '@lilleri/api-client'
import { type BrandTheme, colors, tokens } from '@lilleri/brand'
import { type CurrencyCode, parseDecimal } from '@lilleri/domain'
import { fromJson } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { Translator } from './src/i18n'
import { useI18n } from './src/i18n/context'

type Request = <T>(path: string, init?: RequestInit) => Promise<T>
type CsvReport = {
  readonly inserted: number
  readonly updated: number
  readonly unchanged: number
  readonly rejected: number
  readonly importedAt: string
}
type Mode = 'entry' | 'account' | 'csv' | 'balance'
type ThemeColors = typeof colors.light | typeof colors.dark
const MANUAL_CSV_SAMPLE =
  'id,date,amount,currency,description,merchant,reference\ncaffe-1,2026-10-03,-2.50,EUR,Caffe,Bar,'
export interface ImportManualPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly request: Request
  readonly importCsv: (accountId: string, csv: string) => Promise<CsvReport>
  readonly onChanged: () => Promise<void>
  readonly onError?: (cause: unknown) => boolean
}
const currencyAmount = (amountMinor: string, currency: CurrencyCode, i18n: Translator) =>
  i18n.money(fromJson({ amountMinor, currency }), { symbolPosition: 'before' })
const localDate = (timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value ?? '')
    .join('-')
}
class ManualValidationError extends Error {}
function inputMinor(value: string, currency: CurrencyCode, i18n: Translator): string {
  const { t } = i18n
  const normalized = value.trim().replace(',', '.')
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized))
    throw new ManualValidationError(
      t('manual.enter_an_amount_without_thousands_separators_for_example_2_50'),
    )
  try {
    return parseDecimal(normalized, currency).amountMinor.toString()
  } catch {
    throw new ManualValidationError(
      t('manual.the_amount_or_currency_is_invalid_decimal_places_must_be_exact_for_this_cur'),
    )
  }
}

/** Explicit local sources and file fallback; command IDs are preserved after an uncertain response. */
export function ImportManualPanel({
  overview,
  theme,
  request,
  importCsv,
  onChanged,
  onError,
}: ImportManualPanelProps) {
  const i18n = useI18n()
  const { t } = i18n
  const modeLabels: Readonly<Record<Mode, string>> = {
    entry: t('manual.add_transaction'),
    account: t('manual.add_account'),
    csv: t('manual.import_csv'),
    balance: t('manual.correct_balance'),
  }
  const eventLabels: Readonly<Record<ManualBalanceEventDto['operation'], string>> = {
    opening: t('manual.opening_balance'),
    entry: t('manual.manual_entry'),
    import: t('manual.csv_import'),
    adjustment: t('manual.balance_correction'),
    reversal: t('manual.entry_reversed'),
  }
  const c = colors[theme],
    s = useMemo(() => styles(c), [c]),
    client = useMemo(() => createManualClient(request), [request])
  const [mode, setMode] = useState<Mode>('entry')
  const [accounts, setAccounts] = useState<readonly ManualAccountDto[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null)
  const [accountName, setAccountName] = useState(t('manual.cash')),
    [accountKind, setAccountKind] = useState<ManualAccountDto['kind']>('cash')
  const [newCurrency, setNewCurrency] = useState('EUR'),
    [openingAmount, setOpeningAmount] = useState('0')
  const [openingOn, setOpeningOn] = useState(() => localDate(overview.profile.timezone))
  const [entryAmount, setEntryAmount] = useState(''),
    [entryDescription, setEntryDescription] = useState('')
  const [entryDate, setEntryDate] = useState(() => localDate(overview.profile.timezone)),
    [entryKind, setEntryKind] = useState<'expense' | 'income' | 'transfer'>('expense')
  const [transferReference, setTransferReference] = useState('')
  const [balanceAmount, setBalanceAmount] = useState(''),
    [balanceReason, setBalanceReason] = useState('')
  const [csv, setCsv] = useState(''),
    [csvAccountId, setCsvAccountId] = useState('')
  const [preview, setPreview] = useState<{
    csv: string
    report: Awaited<ReturnType<typeof client.previewCsv>>
  } | null>(null)
  const [lastEntry, setLastEntry] = useState<ManualEntryDto | null>(null)
  const [lastAdjustment, setLastAdjustment] = useState<{
    accountId: string
    revision: number
    beforeMinor: string
  } | null>(null)
  const [events, setEvents] = useState<readonly ManualBalanceEventDto[]>([])
  const pending = useRef<{ fingerprint: string; requestId: string } | null>(null)
  const mounted = useRef(true)
  const selected = accounts.find((account) => account.id === selectedId) ?? accounts[0]
  const selectedCsv =
    overview.accounts.find((account) => account.id === csvAccountId) ?? overview.accounts[0]
  const reload = useCallback(async () => {
    const current = await client.list()
    if (mounted.current) {
      setAccounts(current)
      setSelectedId((id) => (current.some((item) => item.id === id) ? id : (current[0]?.id ?? '')))
    }
  }, [client])
  useEffect(() => {
    mounted.current = true
    setLoading(true)
    reload()
      .catch((cause) => {
        if (mounted.current && !onError?.(cause))
          setError(
            cause instanceof ApiError
              ? i18n.problemMessage(cause)
              : cause instanceof ManualValidationError
                ? cause.message
                : t('manual.local_accounts_are_unavailable_try_again'),
          )
      })
      .finally(() => {
        if (mounted.current) setLoading(false)
      })
    return () => {
      mounted.current = false
    }
  }, [reload, onError, t, i18n])
  useEffect(() => {
    if (mode !== 'balance' || !selected) {
      setEvents([])
      return
    }
    let active = true
    client
      .history(selected.id)
      .then((rows) => {
        if (active) setEvents(rows)
      })
      .catch((cause) => {
        if (active && !onError?.(cause))
          setError(
            cause instanceof ApiError
              ? i18n.problemMessage(cause)
              : cause instanceof ManualValidationError
                ? cause.message
                : t('manual.history_is_unavailable'),
          )
      })
    return () => {
      active = false
    }
  }, [client, mode, selected, onError, t, i18n])
  const commandId = (fingerprint: string) => {
    if (!pending.current || pending.current.fingerprint !== fingerprint)
      pending.current = { fingerprint, requestId: manualRequestId() }
    return pending.current.requestId
  }
  const run = async (action: () => Promise<void>, success: string | (() => string)) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    let saved = false
    try {
      await action()
      saved = true
      pending.current = null
      await reload()
      await onChanged()
      if (mounted.current) setNotice(typeof success === 'function' ? success() : success)
    } catch (cause) {
      if (!mounted.current || onError?.(cause)) return
      if (saved)
        setError(
          t('manual.the_change_was_saved_but_i_could_not_refresh_the_data_reload_the_page_to_se'),
        )
      else if (cause instanceof ApiError && cause.code === 'manual_balance_changed') {
        try {
          await reload()
          await onChanged()
          setLastEntry(null)
          setLastAdjustment(null)
          setError(
            t('manual.the_balance_changed_i_refreshed_the_data_review_it_before_choosing_again'),
          )
        } catch (refreshError) {
          if (!onError?.(refreshError))
            setError(
              t(
                'manual.the_balance_changed_and_could_not_be_refreshed_refresh_the_data_before_choo',
              ),
            )
        }
      } else
        setError(
          cause instanceof ApiError
            ? i18n.problemMessage(cause)
            : cause instanceof ManualValidationError
              ? cause.message
              : t(
                  'manual.the_change_is_unconfirmed_retry_with_the_same_data_the_request_retains_its_',
                ),
        )
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  const createAccount = () =>
    run(async () => {
      const currency = newCurrency.trim().toUpperCase() as CurrencyCode
      const body = {
        name: accountName.trim(),
        kind: accountKind,
        currency,
        openingBalanceMinor: inputMinor(openingAmount, currency, i18n),
        openingOn,
      }
      const result = await client.create({
        ...body,
        requestId: commandId(JSON.stringify({ operation: 'account', body })),
      })
      setSelectedId(result.id)
      setAccountName('')
      setMode('entry')
    }, t('manual.local_account_added_the_opening_balance_is_not_new_income'))
  const addEntry = () =>
    run(
      async () => {
        if (!selected) throw new ManualValidationError(t('manual.add_a_local_account_first'))
        const parsed = BigInt(inputMinor(entryAmount, selected.currency, i18n))
        if (entryKind === 'income' && parsed < 0n)
          throw new ManualValidationError(
            t('manual.for_incoming_amounts_enter_a_positive_amount_or_choose_expense'),
          )
        const amountMinor = (
          entryKind === 'expense'
            ? -(parsed < 0n ? -parsed : parsed)
            : entryKind === 'income'
              ? parsed < 0n
                ? -parsed
                : parsed
              : parsed
        ).toString()
        const body = {
          accountId: selected.id,
          currency: selected.currency,
          amountMinor,
          bookedOn: entryDate,
          kind: entryKind,
          description:
            entryDescription.trim() ||
            (entryKind === 'expense'
              ? t('manual.cash_expense')
              : entryKind === 'income'
                ? t('manual.manual_income')
                : t('manual.manual_transfer')),
          ...(transferReference.trim() ? { reference: transferReference.trim() } : {}),
        }
        const result = await client.enter({
          ...body,
          requestId: commandId(JSON.stringify({ operation: 'entry', body })),
        })
        setLastEntry(result)
        setLastAdjustment(null)
        setEntryAmount('')
        setEntryDescription('')
        setTransferReference('')
      },
      entryKind === 'transfer'
        ? t('manual.transaction_added_review_and_confirm_the_link_between_accounts_before_exclu')
        : t('manual.transaction_added_and_balance_updated'),
    )
  const adjust = () =>
    run(async () => {
      if (!selected) throw new ManualValidationError(t('manual.choose_a_local_account'))
      const body = {
        revision: selected.revision,
        currency: selected.currency,
        balanceMinor: inputMinor(balanceAmount, selected.currency, i18n),
        reason: balanceReason.trim(),
      }
      const result = await client.adjust(selected.id, {
        ...body,
        requestId: commandId(JSON.stringify({ operation: 'adjust', accountId: selected.id, body })),
      })
      setLastAdjustment({
        accountId: selected.id,
        revision: result.revision,
        beforeMinor: result.beforeMinor,
      })
      setLastEntry(null)
      setBalanceAmount('')
      setBalanceReason('')
    }, t('manual.balance_corrected_the_difference_is_in_history_and_does_not_count_as_income'))
  const reverseEntry = () =>
    run(async () => {
      if (!lastEntry) throw new ManualValidationError(t('manual.there_is_no_entry_to_reverse'))
      const body = {
        revision: lastEntry.transactionRevision,
        accountRevision: lastEntry.accountRevision,
        reason: t('manual.reversal_of_the_latest_entry'),
      }
      await client.reverse(lastEntry.transactionId, {
        ...body,
        requestId: commandId(
          JSON.stringify({ operation: 'reverse', id: lastEntry.transactionId, body }),
        ),
      })
      setLastEntry(null)
    }, t('manual.entry_reversed_balance_and_totals_were_updated_history_is_retained'))
  const undoAdjustment = () =>
    run(async () => {
      if (!selected || !lastAdjustment)
        throw new ManualValidationError(t('manual.there_is_no_correction_to_reverse'))
      const body = {
        revision: selected.revision,
        currency: selected.currency,
        balanceMinor: lastAdjustment.beforeMinor,
        reason: t('manual.reversal_of_the_previous_correction'),
      }
      await client.adjust(selected.id, {
        ...body,
        requestId: commandId(JSON.stringify({ operation: 'undo-adjust', id: selected.id, body })),
      })
      setLastAdjustment(null)
    }, t('manual.correction_reversed_with_a_new_history_event'))
  const validateCsv = async () => {
    if (busy || !selectedCsv) return
    setBusy(true)
    setError(null)
    setNotice(null)
    setPreview(null)
    try {
      const report = await client.previewCsv(selectedCsv.id, csv)
      setPreview({ csv, report })
    } catch (cause) {
      if (!onError?.(cause))
        setError(
          cause instanceof ApiError
            ? i18n.problemMessage(cause)
            : cause instanceof ManualValidationError
              ? cause.message
              : t('manual.the_csv_is_invalid'),
        )
    } finally {
      setBusy(false)
    }
  }
  const applyCsv = () => {
    let completed = t('manual.import_completed')
    return run(
      async () => {
        if (!preview || preview.csv !== csv || preview.report.accountId !== selectedCsv?.id)
          throw new ManualValidationError(t('manual.review_a_new_preview_before_importing'))
        const report = await importCsv(preview.report.accountId, preview.csv)
        setCsv('')
        setPreview(null)
        setLastEntry(null)
        setLastAdjustment(null)
        completed = t('manual.csvResult', {
          inserted: report.inserted,
          unchanged: report.unchanged,
        })
      },
      () => completed,
    )
  }
  const button = (label: string, onPress: () => void, disabled = false, quiet = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy }}
      aria-disabled={disabled || busy}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        quiet && s.quiet,
        pressed && { opacity: 0.8 },
        (disabled || busy) && { opacity: 0.5 },
      ]}
    >
      <Text style={[s.buttonText, quiet && { color: c.primary }]}>{label}</Text>
    </Pressable>
  )
  const field = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder = '',
    multiline = false,
  ) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        editable={!busy}
        multiline={multiline}
        autoCapitalize="none"
        style={[s.input, multiline && s.textarea]}
      />
    </View>
  )
  return (
    <View style={s.root}>
      <Text accessibilityRole="header" aria-level={2} style={s.heading}>
        {t('manual.manual_accounts_and_files')}
      </Text>
      <Text style={s.body}>
        {t('manual.cash_wallets_and_unconnected_accounts_amounts_retain_the_account_currency_d')}
      </Text>
      <View style={s.row}>
        {(Object.keys(modeLabels) as Mode[]).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === key, disabled: busy }}
            aria-pressed={mode === key}
            aria-disabled={busy}
            disabled={busy}
            onPress={() => {
              setMode(key)
              setError(null)
              setNotice(null)
            }}
            style={[
              s.mode,
              mode === key && { backgroundColor: c.primarySoft, borderColor: c.primary },
            ]}
          >
            <Text style={s.modeText}>{modeLabels[key]}</Text>
          </Pressable>
        ))}
      </View>
      {loading && (
        <ActivityIndicator
          color={c.primary}
          accessibilityLabel={t('manual.loading_local_accounts')}
        />
      )}
      {busy && <ActivityIndicator color={c.primary} accessibilityLabel={t('manual.saving')} />}
      {error && (
        <Text accessibilityRole="alert" style={[s.feedback, { color: c.danger }]}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={[s.feedback, { color: c.success }]}>
          {notice}
        </Text>
      )}
      {mode === 'account' ? (
        <View style={s.card}>
          <Text style={s.title}>{t('manual.which_balance_are_you_starting_from')}</Text>
          <Text style={s.body}>
            {t(
              'manual.the_opening_balance_is_the_balance_at_the_start_of_the_selected_date_entrie',
            )}
          </Text>
          {field(t('manual.account_name'), accountName, setAccountName, t('manual.cash'))}
          <View style={s.row}>
            {(['cash', 'current', 'card', 'savings'] as const).map((kind) => (
              <Pressable
                key={kind}
                accessibilityRole="radio"
                accessibilityState={{ checked: accountKind === kind, disabled: busy }}
                aria-checked={accountKind === kind}
                aria-disabled={busy}
                disabled={busy}
                onPress={() => setAccountKind(kind)}
                style={[
                  s.choice,
                  accountKind === kind && {
                    borderColor: c.primary,
                    backgroundColor: c.primarySoft,
                  },
                ]}
              >
                <Text style={s.body}>
                  {
                    {
                      cash: t('manual.cash'),
                      current: t('manual.wallet_or_other'),
                      card: t('manual.manual_card'),
                      savings: t('manual.savings'),
                    }[kind]
                  }
                </Text>
              </Pressable>
            ))}
          </View>
          {field(t('manual.account_iso_currency'), newCurrency, setNewCurrency, 'EUR')}
          {field(t('manual.opening_balance'), openingAmount, setOpeningAmount, '0,00')}
          {field(t('manual.tracking_start_date'), openingOn, setOpeningOn, 'YYYY-MM-DD')}
          {button(
            t('manual.create_local_account'),
            () => {
              void createAccount()
            },
            loading,
          )}
        </View>
      ) : mode === 'csv' ? (
        <View style={s.card}>
          <Text style={s.title}>{t('manual.import_a_csv_with_stable_identities')}</Text>
          <Text style={s.body}>
            {t(
              'manual.up_to_1_000_rows_and_256_kib_this_csv_format_is_supported_with_comma_separa',
            )}
          </Text>
          <Text selectable style={s.sample}>
            {MANUAL_CSV_SAMPLE}
          </Text>
          <Text style={s.label}>{t('manual.destination_account')}</Text>
          <View style={s.row}>
            {overview.accounts.map((account) => (
              <Pressable
                key={account.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedCsv?.id === account.id, disabled: busy }}
                aria-checked={selectedCsv?.id === account.id}
                aria-disabled={busy}
                disabled={busy}
                onPress={() => {
                  setCsvAccountId(account.id)
                  setPreview(null)
                }}
                style={[
                  s.choice,
                  selectedCsv?.id === account.id && {
                    borderColor: c.primary,
                    backgroundColor: c.primarySoft,
                  },
                ]}
              >
                <Text style={s.body}>
                  {account.name} · {account.balance.currency}
                </Text>
              </Pressable>
            ))}
          </View>
          {!selectedCsv && <Text style={s.body}>{t('manual.add_a_local_account_to_begin')}</Text>}
          {field(
            t('manual.csv_content'),
            csv,
            (value) => {
              setCsv(value)
              setPreview(null)
            },
            t('manual.paste_the_header_and_rows'),
            true,
          )}
          {button(
            t('manual.review_csv_preview'),
            () => {
              void validateCsv()
            },
            !selectedCsv || !csv.trim() || loading,
          )}
          {preview && (
            <View style={s.preview}>
              <Text style={s.title}>
                {t('manual.csvRowCount', { count: preview.report.rowCount })}
              </Text>
              <Text style={s.body}>
                {t('manual.csvPreview', {
                  inserted: preview.report.newRows,
                  unchanged: preview.report.unchangedRows,
                  amount: currencyAmount(
                    preview.report.newAmountTotalMinor,
                    preview.report.currency,
                    i18n,
                  ),
                })}
              </Text>
              <Text style={s.body}>
                {preview.report.manualBalanceWillChange
                  ? t('manual.the_local_account_balance_will_update_with_new_rows_only')
                  : t(
                      'manual.the_source_balance_remains_the_balance_declared_by_its_source_the_csv_adds_',
                    )}
              </Text>
              {button(t('manual.import_reviewed_rows'), () => {
                void applyCsv()
              })}
            </View>
          )}
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.label}>{t('manual.local_account')}</Text>
          <View style={s.row}>
            {accounts.map((account) => (
              <Pressable
                key={account.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected?.id === account.id, disabled: busy }}
                aria-checked={selected?.id === account.id}
                aria-disabled={busy}
                disabled={busy}
                onPress={() => {
                  setSelectedId(account.id)
                  setLastEntry(null)
                  setLastAdjustment(null)
                }}
                style={[
                  s.choice,
                  selected?.id === account.id && {
                    borderColor: c.primary,
                    backgroundColor: c.primarySoft,
                  },
                ]}
              >
                <Text style={s.body}>
                  {account.name} · {currencyAmount(account.balanceMinor, account.currency, i18n)}
                </Text>
              </Pressable>
            ))}
          </View>
          {!selected ? (
            <View style={s.field}>
              <Text style={s.body}>
                {t('manual.you_have_no_local_accounts_yet_start_with_your_cash_or_wallet_balance')}
              </Text>
              {button(t('manual.add_your_first_account'), () => setMode('account'), loading)}
            </View>
          ) : mode === 'entry' ? (
            <>
              <Text style={s.title}>
                {selected.name}
                {t('manual.unconnected')}
              </Text>
              <View style={s.row}>
                {(['expense', 'income', 'transfer'] as const).map((kind) => (
                  <Pressable
                    key={kind}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: entryKind === kind, disabled: busy }}
                    aria-checked={entryKind === kind}
                    aria-disabled={busy}
                    disabled={busy}
                    onPress={() => setEntryKind(kind)}
                    style={[
                      s.choice,
                      entryKind === kind && {
                        borderColor: c.primary,
                        backgroundColor: c.primarySoft,
                      },
                    ]}
                  >
                    <Text style={s.body}>
                      {
                        {
                          expense: t('manual.expense'),
                          income: t('manual.income'),
                          transfer: t('manual.transfer'),
                        }[kind]
                      }
                    </Text>
                  </Pressable>
                ))}
              </View>
              {field(
                t('manual.amountCurrency', { currency: selected.currency }),
                entryAmount,
                setEntryAmount,
                i18n.locale === 'it-IT' ? '2,50' : '2.50',
              )}
              {field(
                t('manual.optional_description'),
                entryDescription,
                setEntryDescription,
                t('manual.cash_expense'),
              )}
              {field(t('manual.transaction_date'), entryDate, setEntryDate, 'YYYY-MM-DD')}
              {entryKind === 'transfer' && (
                <>
                  <Text style={s.body}>
                    {t(
                      'manual.for_an_incoming_transfer_use_a_positive_amount_for_outgoing_transfers_use_a',
                    )}
                  </Text>
                  {field(
                    t('manual.optional_transfer_reference'),
                    transferReference,
                    setTransferReference,
                  )}
                </>
              )}
              {button(
                t('manual.save_transaction'),
                () => {
                  void addEntry()
                },
                !entryAmount.trim(),
              )}
              {lastEntry &&
                button(
                  t('manual.reverse_latest_entry'),
                  () => {
                    void reverseEntry()
                  },
                  selected.id !== lastEntry.accountId ||
                    selected.revision !== lastEntry.accountRevision,
                  true,
                )}
            </>
          ) : (
            <>
              <Text style={s.title}>
                {t('manual.currentBalance', {
                  amount: currencyAmount(selected.balanceMinor, selected.currency, i18n),
                })}
              </Text>
              <Text style={s.body}>
                {t(
                  'manual.enter_the_balance_you_verified_and_the_reason_the_difference_becomes_a_hist',
                )}
              </Text>
              {field(
                t('manual.correctedCurrency', { currency: selected.currency }),
                balanceAmount,
                setBalanceAmount,
                i18n.locale === 'it-IT' ? '0,00' : '0.00',
              )}
              {field(
                t('manual.correction_reason'),
                balanceReason,
                setBalanceReason,
                t('manual.cash_counted_manually'),
              )}
              {button(
                t('manual.confirm_corrected_balance'),
                () => {
                  void adjust()
                },
                !balanceAmount.trim() || !balanceReason.trim(),
              )}
              {lastAdjustment &&
                button(
                  t('manual.reverse_latest_correction'),
                  () => {
                    void undoAdjustment()
                  },
                  lastAdjustment.accountId !== selected.id ||
                    lastAdjustment.revision !== selected.revision,
                  true,
                )}
              <Text style={s.title}>{t('manual.balance_history')}</Text>
              {[...events]
                .reverse()
                .slice(0, 10)
                .map((event) => (
                  <View key={event.id} style={s.event}>
                    <Text style={s.label}>
                      {eventLabels[event.operation]} · {i18n.instant(event.createdAt)}
                    </Text>
                    <Text style={s.body}>{event.reason}</Text>
                    <Text style={s.body}>
                      {currencyAmount(event.beforeMinor, selected.currency, i18n)} →{' '}
                      {currencyAmount(event.afterMinor, selected.currency, i18n)}
                    </Text>
                  </View>
                ))}
            </>
          )}
        </View>
      )}
    </View>
  )
}
function styles(c: ThemeColors) {
  return StyleSheet.create({
    root: { gap: tokens.spacing.md },
    heading: {
      fontFamily: 'GeistSemibold',
      fontSize: tokens.typography.scale.h2.size,
      lineHeight: tokens.typography.scale.h2.lineHeight,
      color: c.textPrimary,
    },
    title: {
      fontFamily: 'GeistSemibold',
      fontSize: tokens.typography.scale.title.size,
      lineHeight: tokens.typography.scale.title.lineHeight,
      color: c.textPrimary,
    },
    body: {
      fontFamily: 'Geist',
      fontSize: 16,
      lineHeight: 24,
      color: c.textSecondary,
      flexShrink: 1,
    },
    label: { fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 20, color: c.textPrimary },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.lg,
      padding: 16,
      gap: 16,
    },
    field: { gap: 8 },
    input: {
      fontFamily: 'Geist',
      fontSize: 16,
      lineHeight: 24,
      color: c.textPrimary,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: tokens.radius.sm,
      minHeight: 48,
      padding: 12,
    },
    textarea: { minHeight: 176, textAlignVertical: 'top' },
    button: {
      backgroundColor: c.primary,
      borderRadius: tokens.radius.md,
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    buttonText: {
      fontFamily: 'GeistMedium',
      fontSize: 14,
      lineHeight: 20,
      color: c.onPrimary,
      textAlign: 'center',
    },
    quiet: { backgroundColor: 'transparent', borderColor: c.primary, borderWidth: 1 },
    mode: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
      justifyContent: 'center',
    },
    modeText: { fontFamily: 'GeistMedium', fontSize: 14, lineHeight: 20, color: c.textPrimary },
    choice: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: tokens.radius.sm,
      padding: 12,
      justifyContent: 'center',
      maxWidth: '100%',
    },
    sample: {
      fontFamily: 'Geist',
      fontSize: 12,
      lineHeight: 18,
      color: c.textPrimary,
      backgroundColor: c.surfaceElevated,
      padding: 12,
      borderRadius: tokens.radius.sm,
    },
    preview: {
      gap: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: tokens.radius.md,
    },
    feedback: {
      fontFamily: 'GeistMedium',
      fontSize: 14,
      lineHeight: 20,
      padding: 12,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    event: { gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderColor: c.border },
  })
}
