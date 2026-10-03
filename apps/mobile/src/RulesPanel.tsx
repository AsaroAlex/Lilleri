import {
  type AccountDto,
  ApiError,
  createRulesClient,
  type TransactionDto,
} from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import {
  CATEGORIES,
  type CategoryId,
  type RuleConditions,
  type RuleDefinition,
  type RulePreview,
  type RuleRecord,
  type TransactionKind,
} from '@lilleri/domain'
import { fromJson } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { MessageKey } from './i18n'
import { useI18n } from './i18n/context'
import {
  displayMessage,
  displayProblem,
  type UiMessage,
  UiValidationError,
} from './i18n/ui-message'

interface Props {
  readonly request: <T>(path: string, init?: RequestInit) => Promise<T>
  readonly accounts: readonly AccountDto[]
  readonly transactions: readonly TransactionDto[]
  readonly theme: BrandTheme
  readonly onChanged: () => Promise<void> | void
  readonly onError?: (cause: unknown) => boolean
  readonly proposal?: { readonly merchantKey: string; readonly categoryId: CategoryId }
}
interface Form {
  name: string
  merchantKey: string
  description: string
  operator: 'contains' | 'equals'
  min: string
  max: string
  currency: string
  accountId: string
  kind: TransactionKind | ''
  direction: RuleConditions['direction'] | ''
  categoryId: CategoryId
  priority: string
}
const emptyForm = (): Form => ({
  name: '',
  merchantKey: '',
  description: '',
  operator: 'contains',
  min: '',
  max: '',
  currency: 'EUR',
  accountId: '',
  kind: '',
  direction: '',
  categoryId: 'uncategorised',
  priority: '10',
})
const formFrom = (rule: RuleRecord): Form => ({
  name: rule.name,
  merchantKey: rule.conditions.merchantKey ?? '',
  description: rule.conditions.description?.value ?? '',
  operator: rule.conditions.description?.operator ?? 'contains',
  min: rule.conditions.amount?.minMinor ?? '',
  max: rule.conditions.amount?.maxMinor ?? '',
  currency: rule.conditions.amount?.currency ?? 'EUR',
  accountId: rule.conditions.accountId ?? '',
  kind: rule.conditions.kind ?? '',
  direction: rule.conditions.direction ?? '',
  categoryId: rule.categoryId,
  priority: String(rule.priority),
})
const kindLabels: Record<TransactionKind, MessageKey> = {
  expense: 'rules.expense',
  income: 'rules.income',
  transfer: 'rules.transfer',
  card_settlement: 'rules.settlement',
  refund: 'rules.refund',
  cash_withdrawal: 'rules.withdrawal',
}
/** Rule drafts stay inactive until the user sees a fresh retroactive preview and applies it. */
export function RulesPanel({
  request,
  accounts,
  transactions,
  theme,
  onChanged,
  onError,
  proposal,
}: Props) {
  const i18n = useI18n()
  const i18nRef = useRef(i18n)
  i18nRef.current = i18n
  const client = useMemo(() => createRulesClient(request), [request]),
    c = colors[theme],
    s = useMemo(() => styles(c), [c])
  const [rules, setRules] = useState<readonly RuleRecord[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<UiMessage | null>(null),
    [notice, setNotice] = useState<MessageKey | null>(null),
    [showForm, setShowForm] = useState(false),
    [editing, setEditing] = useState<RuleRecord | null>(null),
    [form, setForm] = useState<Form>(emptyForm),
    [preview, setPreview] = useState<{ rule: RuleRecord; value: RulePreview } | null>(null),
    [showArchived, setShowArchived] = useState(false)
  const handleParentError = useCallback(
    (cause: unknown) => {
      if (!onError?.(cause)) return false
      setRules([])
      setPreview(null)
      setEditing(null)
      setShowForm(false)
      setForm(emptyForm())
      setNotice(null)
      setError(null)
      return true
    },
    [onError],
  )
  const reload = useCallback(async () => {
    setRules(await client.list())
  }, [client])
  useEffect(() => {
    reload().catch((cause) => {
      if (handleParentError(cause)) return
      setError('rules.loadFailed')
    })
  }, [reload, handleParentError])
  useEffect(() => {
    if (proposal) {
      setForm({
        ...emptyForm(),
        name: i18nRef.current.t('rules.proposalName', { merchant: proposal.merchantKey }),
        merchantKey: proposal.merchantKey,
        categoryId: proposal.categoryId,
      })
      setEditing(null)
      setShowForm(true)
      setPreview(null)
    }
  }, [proposal])
  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))
  const run = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (cause) {
      if (handleParentError(cause)) return
      if (cause instanceof ApiError && cause.status === 409) {
        setPreview(null)
        setEditing(null)
        setShowForm(false)
        try {
          await reload()
          setError('rules.changed')
        } catch (refreshCause) {
          if (handleParentError(refreshCause)) return
          setError('rules.refreshFailed')
        }
      } else setError(displayProblem(cause, 'rules.saveFailed'))
    } finally {
      setBusy(false)
    }
  }
  const button = (label: string, action: () => void, primary = false, selected = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, selected }}
      aria-disabled={busy}
      aria-pressed={selected}
      disabled={busy}
      onPress={action}
      style={[s.button, primary && s.primary, selected && s.selected]}
    >
      <Text style={[s.buttonText, primary && s.primaryText]}>{label}</Text>
    </Pressable>
  )
  const field = (
    label: string,
    key: 'name' | 'merchantKey' | 'description' | 'min' | 'max' | 'currency' | 'priority',
    hint?: string,
  ) => (
    <View key={key} style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={form[key]}
        onChangeText={(value) => update(key, value)}
        editable={!busy}
        style={s.input}
        autoCapitalize={key === 'currency' ? 'characters' : 'none'}
        maxLength={
          key === 'description'
            ? 200
            : key === 'name'
              ? 100
              : key === 'merchantKey'
                ? 150
                : key === 'currency'
                  ? 3
                  : 18
        }
      />
      {hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  )
  const save = () =>
    run(async () => {
      const conditions: RuleConditions = {
        ...(form.merchantKey.trim() ? { merchantKey: form.merchantKey.trim() } : {}),
        ...(form.description.trim()
          ? { description: { operator: form.operator, value: form.description.trim() } }
          : {}),
        ...(form.min || form.max
          ? {
              amount: {
                currency: form.currency.trim().toUpperCase() as NonNullable<
                  RuleConditions['amount']
                >['currency'],
                ...(form.min ? { minMinor: form.min } : {}),
                ...(form.max ? { maxMinor: form.max } : {}),
              },
            }
          : {}),
        ...(form.accountId ? { accountId: form.accountId } : {}),
        ...(form.kind ? { kind: form.kind } : {}),
        ...(form.direction ? { direction: form.direction } : {}),
      }
      if (!Object.keys(conditions).length) throw new UiValidationError('rules.conditionRequired')
      if (!form.name.trim()) throw new UiValidationError('rules.nameRequired')
      const definition: RuleDefinition = {
        name: form.name.trim(),
        conditions,
        categoryId: form.categoryId,
        priority: Number(form.priority),
      }
      const rule = editing
        ? await client.edit(editing.id, editing.revision, definition)
        : await client.create(definition)
      setEditing(null)
      setShowForm(false)
      await reload()
      setPreview({ rule, value: await client.preview(rule.id) })
      await onChanged()
    })
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.heading}>
        {i18nRef.current.t('rules.title')}
      </Text>
      <Text style={s.text}>{i18nRef.current.t('rules.help')}</Text>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {displayMessage(i18n, error)}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" aria-live="polite" style={s.text}>
          {i18n.t(notice)}
        </Text>
      )}
      {busy && (
        <ActivityIndicator
          accessibilityLabel={i18nRef.current.t('rules.loading')}
          color={c.primary}
        />
      )}
      <View style={s.row}>
        {button(
          i18nRef.current.t('rules.new'),
          () => {
            setEditing(null)
            setForm(emptyForm())
            setShowForm(true)
            setPreview(null)
          },
          true,
        )}
        {button(i18nRef.current.t('rules.refresh'), () => {
          void run(reload)
        })}
        {button(
          showArchived
            ? i18nRef.current.t('rules.hideArchived')
            : i18nRef.current.t('rules.showArchived'),
          () => setShowArchived(!showArchived),
        )}
      </View>
      {showForm && (
        <View style={s.card}>
          <Text accessibilityRole="header" aria-level={3} style={s.title}>
            {editing ? i18nRef.current.t('rules.editRule') : i18nRef.current.t('rules.new')}
          </Text>
          {editing?.enabled && <Text style={s.hint}>{i18nRef.current.t('rules.draftHelp')}</Text>}
          {field(i18nRef.current.t('rules.name'), 'name')}
          {field(
            i18nRef.current.t('rules.merchant'),
            'merchantKey',
            i18nRef.current.t('rules.merchantHelp'),
          )}
          <View style={s.row}>
            {[
              ...new Map(
                transactions
                  .filter((item): item is TransactionDto & { merchantKey: string } =>
                    Boolean(item.merchantKey),
                  )
                  .map((item) => [item.merchantKey, item]),
              ).values(),
            ]
              .slice(0, 12)
              .map((item) =>
                button(
                  i18n.t('rules.merchantChoice', {
                    merchant: item.merchantName || item.merchantKey,
                  }),
                  () => update('merchantKey', item.merchantKey),
                  false,
                  form.merchantKey === item.merchantKey,
                ),
              )}
          </View>
          {field(
            i18nRef.current.t('rules.description'),
            'description',
            i18nRef.current.t('rules.descriptionHelp'),
          )}
          <View style={s.row}>
            {button(
              i18nRef.current.t('rules.contains'),
              () => update('operator', 'contains'),
              false,
              form.operator === 'contains',
            )}
            {button(
              i18nRef.current.t('rules.equals'),
              () => update('operator', 'equals'),
              false,
              form.operator === 'equals',
            )}
          </View>
          {field(
            i18nRef.current.t('rules.minimum'),
            'min',
            i18nRef.current.t('rules.minorUnitsHelp'),
          )}
          {field(i18nRef.current.t('rules.maximum'), 'max')}
          {field(i18nRef.current.t('rules.limitCurrency'), 'currency')}
          <Text style={s.label}>{i18nRef.current.t('rules.account')}</Text>
          <View style={s.row}>
            {button(
              i18nRef.current.t('rules.anyAccount'),
              () => update('accountId', ''),
              false,
              !form.accountId,
            )}
            {accounts.map((account) =>
              button(
                i18n.t('rules.accountChoice', { account: account.name }),
                () => update('accountId', account.id),
                false,
                form.accountId === account.id,
              ),
            )}
          </View>
          <Text style={s.label}>{i18nRef.current.t('rules.kind')}</Text>
          <View style={s.row}>
            {button(
              i18nRef.current.t('rules.anyKind'),
              () => update('kind', ''),
              false,
              !form.kind,
            )}
            {(Object.keys(kindLabels) as TransactionKind[]).map((kind) =>
              button(
                i18n.t(kindLabels[kind]),
                () => update('kind', kind),
                false,
                form.kind === kind,
              ),
            )}
          </View>
          <Text style={s.label}>{i18nRef.current.t('rules.direction')}</Text>
          <View style={s.row}>
            {button(
              i18nRef.current.t('rules.anyDirection'),
              () => update('direction', ''),
              false,
              !form.direction,
            )}
            {button(
              i18nRef.current.t('rules.negative'),
              () => update('direction', 'debit'),
              false,
              form.direction === 'debit',
            )}
            {button(
              i18nRef.current.t('rules.positive'),
              () => update('direction', 'credit'),
              false,
              form.direction === 'credit',
            )}
            {button(
              i18nRef.current.t('rules.zero'),
              () => update('direction', 'zero'),
              false,
              form.direction === 'zero',
            )}
          </View>
          <Text style={s.label}>{i18nRef.current.t('rules.category')}</Text>
          <View style={s.row}>
            {(Object.keys(CATEGORIES) as CategoryId[]).map((category) =>
              button(
                i18n.categoryLabel(category),
                () => update('categoryId', category),
                false,
                form.categoryId === category,
              ),
            )}
          </View>
          {field(
            i18nRef.current.t('rules.priority'),
            'priority',
            i18nRef.current.t('rules.priorityHelp'),
          )}
          <View style={s.row}>
            {button(
              i18nRef.current.t('rules.savePreview'),
              () => {
                void save()
              },
              true,
            )}
            {button(i18nRef.current.t('rules.closeDraft'), () => {
              setShowForm(false)
              setEditing(null)
            })}
          </View>
        </View>
      )}
      {preview && (
        <View style={s.card}>
          <Text accessibilityRole="header" aria-level={3} style={s.title}>
            {i18nRef.current.t('rules.preview', { name: preview.rule.name })}
          </Text>
          <Text style={s.text}>
            {i18n.t('rules.previewCounts', {
              matched: preview.value.matchedTransactionIds.length,
              changed: preview.value.affectedTransactionIds.length,
              retained: preview.value.lockedTransactionIds.length,
            })}
          </Text>
          <Text style={s.hint}>
            {i18n.t('rules.previewCategory', {
              category: i18n.categoryLabel(preview.rule.categoryId),
            })}
          </Text>
          {preview.value.affectedTransactionIds.slice(0, 5).map((id) => {
            const transaction = transactions.find((item) => item.id === id)
            return (
              <Text
                key={id}
                style={s.text}
                accessibilityLabel={
                  transaction
                    ? `${transaction.merchantName || transaction.description} · ${i18n.accessibleMoney(fromJson(transaction.amount))}`
                    : i18nRef.current.t('rules.savedTransaction')
                }
              >
                {transaction
                  ? `${transaction.merchantName || transaction.description} · ${i18n.money(fromJson(transaction.amount))}`
                  : i18nRef.current.t('rules.savedTransaction')}
              </Text>
            )
          })}
          {preview.value.affectedTransactionIds.length > 5 && (
            <Text style={s.hint}>
              {i18n.t('rules.otherCount', {
                count: preview.value.affectedTransactionIds.length - 5,
              })}
            </Text>
          )}
          <View style={s.row}>
            {button(
              i18nRef.current.t('rules.apply'),
              () => {
                void run(async () => {
                  await client.apply(
                    preview.rule.id,
                    preview.value.revision,
                    preview.value.previewRevision,
                  )
                  setPreview(null)
                  await reload()
                  await onChanged()
                  setNotice('rules.applied')
                })
              },
              true,
            )}
            {button(i18nRef.current.t('rules.closePreview'), () => setPreview(null))}
          </View>
        </View>
      )}
      {rules
        .filter((rule) => showArchived || !rule.archived)
        .map((rule) => (
          <View key={rule.id} style={s.card}>
            <Text style={s.title}>{rule.name}</Text>
            <Text style={s.text}>
              {i18n.t('rules.statusLine', {
                category: i18n.categoryLabel(rule.categoryId),
                status: i18n.t(
                  rule.archived ? 'rules.archived' : rule.enabled ? 'rules.active' : 'rules.draft',
                ),
                priority: rule.priority,
              })}
            </Text>
            <Text style={s.hint}>
              {i18nRef.current.t('rules.owned')}{' '}
              {rule.conditions.merchantKey
                ? i18n.t('rules.merchantCondition', { merchant: rule.conditions.merchantKey })
                : ''}
              {rule.conditions.description
                ? i18n.t(
                    rule.conditions.description.operator === 'equals'
                      ? 'rules.equalsCondition'
                      : 'rules.containsCondition',
                    { description: rule.conditions.description.value },
                  )
                : ''}
              {i18nRef.current.t('rules.allConditions')}
            </Text>
            <View style={s.row}>
              {!rule.archived &&
                button(i18nRef.current.t('rules.edit'), () => {
                  setEditing(rule)
                  setForm(formFrom(rule))
                  setShowForm(true)
                  setPreview(null)
                })}
              {!rule.archived &&
                button(i18nRef.current.t('rules.showPreview'), () => {
                  void run(async () => setPreview({ rule, value: await client.preview(rule.id) }))
                })}
              {rule.enabled &&
                button(i18nRef.current.t('rules.disable'), () => {
                  void run(async () => {
                    await client.state(rule.id, rule.revision, 'disable')
                    setPreview(null)
                    await reload()
                    await onChanged()
                    setNotice('rules.disabled')
                  })
                })}
              {!rule.archived &&
                button(i18nRef.current.t('rules.archive'), () => {
                  void run(async () => {
                    await client.state(rule.id, rule.revision, 'archive')
                    setPreview(null)
                    await reload()
                    await onChanged()
                    setNotice('rules.archivedNotice')
                  })
                })}
              {rule.revision > 1 &&
                button(i18nRef.current.t('rules.undo'), () => {
                  void run(async () => {
                    await client.state(rule.id, rule.revision, 'undo')
                    setPreview(null)
                    await reload()
                    await onChanged()
                    setNotice('rules.undone')
                  })
                })}
            </View>
          </View>
        ))}
      {!rules.length && !busy && <Text style={s.hint}>{i18nRef.current.t('rules.empty')}</Text>}
    </View>
  )
}
function styles(c: typeof colors.light | typeof colors.dark) {
  return StyleSheet.create({
    panel: { gap: 16 },
    heading: { fontFamily: 'Newsreader', fontSize: 30, color: c.textPrimary },
    title: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
    },
    text: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 16,
      lineHeight: 24,
      color: c.textPrimary,
    },
    hint: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 14,
      lineHeight: 21,
      color: c.textSecondary,
    },
    label: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 14,
      fontWeight: '600',
      color: c.textPrimary,
    },
    error: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 16,
      lineHeight: 24,
      color: c.danger,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    card: {
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      backgroundColor: c.surface,
    },
    field: { gap: 6 },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      padding: 12,
      color: c.textPrimary,
      backgroundColor: c.surfaceElevated,
      fontFamily: 'Geist',
      fontSize: 16,
    },
    button: {
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 10,
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
    },
    buttonText: {
      fontFamily: 'Geist',
      fontVariant: ['tabular-nums'],
      fontSize: 14,
      color: c.textPrimary,
    },
    primary: { backgroundColor: c.primary, borderColor: c.primary },
    primaryText: { color: c.onPrimary, fontWeight: '600' },
    selected: { backgroundColor: c.primarySoft, borderColor: c.primary },
  })
}
