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
import { formatMoney, fromJson } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

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
const kindLabels: Record<TransactionKind, string> = {
  expense: 'Spesa',
  income: 'Entrata',
  transfer: 'Trasferimento',
  card_settlement: 'Addebito carta',
  refund: 'Rimborso',
  cash_withdrawal: 'Prelievo',
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
  const client = useMemo(() => createRulesClient(request), [request]),
    c = colors[theme],
    s = useMemo(() => styles(c), [c])
  const [rules, setRules] = useState<readonly RuleRecord[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null),
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
      setError('Non riesco a caricare le regole. Riprova.')
    })
  }, [reload, handleParentError])
  useEffect(() => {
    if (proposal) {
      setForm({
        ...emptyForm(),
        name: `Categoria per ${proposal.merchantKey}`,
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
          setError(
            'La regola o i movimenti sono cambiati. Controlla i dati e prepara una nuova anteprima.',
          )
        } catch (refreshCause) {
          if (handleParentError(refreshCause)) return
          setError(
            'La regola o i movimenti sono cambiati. Non riesco ad aggiornare i dati: riprova.',
          )
        }
      } else
        setError(
          cause instanceof Error ? cause.message : 'Non riesco a salvare questa modifica. Riprova.',
        )
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
      if (!Object.keys(conditions).length)
        throw new Error('Scegli almeno una condizione per la regola.')
      if (!form.name.trim()) throw new Error('Scrivi un nome per riconoscere la regola.')
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
      <Text accessibilityRole="header" style={s.heading}>
        Le tue regole
      </Text>
      <Text style={s.text}>
        Scegli la categoria dei movimenti che rispettano tutte le condizioni. Prima di applicare,
        controlli l’effetto sui dati già salvati. Le correzioni fatte su un singolo movimento
        restano valide.
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          {notice}
        </Text>
      )}
      {busy && (
        <ActivityIndicator accessibilityLabel="Aggiornamento delle regole" color={c.primary} />
      )}
      <View style={s.row}>
        {button(
          'Nuova regola',
          () => {
            setEditing(null)
            setForm(emptyForm())
            setShowForm(true)
            setPreview(null)
          },
          true,
        )}
        {button('Aggiorna regole', () => {
          void run(reload)
        })}
        {button(showArchived ? 'Nascondi archiviate' : 'Mostra archiviate', () =>
          setShowArchived(!showArchived),
        )}
      </View>
      {showForm && (
        <View style={s.card}>
          <Text accessibilityRole="header" style={s.title}>
            {editing ? 'Modifica regola' : 'Nuova regola'}
          </Text>
          {editing?.enabled && (
            <Text style={s.hint}>
              Salvando la modifica, la regola torna in bozza. Dopo l’anteprima puoi applicarla di
              nuovo.
            </Text>
          )}
          {field('Nome della regola', 'name')}
          {field(
            'Esercente esatto',
            'merchantKey',
            'La corrispondenza è esatta. Puoi scegliere un esercente presente nei tuoi movimenti. I servizi di pagamento richiedono anche un conto o una descrizione.',
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
                  `Esercente: ${item.merchantName || item.merchantKey}`,
                  () => update('merchantKey', item.merchantKey),
                  false,
                  form.merchantKey === item.merchantKey,
                ),
              )}
          </View>
          {field(
            'Descrizione',
            'description',
            'Confronto letterale, senza espressioni regolari. Lascia vuoto se non serve.',
          )}
          <View style={s.row}>
            {button(
              'La descrizione contiene',
              () => update('operator', 'contains'),
              false,
              form.operator === 'contains',
            )}
            {button(
              'La descrizione è uguale',
              () => update('operator', 'equals'),
              false,
              form.operator === 'equals',
            )}
          </View>
          {field(
            'Importo minimo in unità minime',
            'min',
            'Valore assoluto intero: per esempio 1,20 EUR = 120. Lascia vuoto per non fissare un limite.',
          )}
          {field('Importo massimo in unità minime', 'max')}
          {field('Valuta del limite', 'currency')}
          <Text style={s.label}>Conto</Text>
          <View style={s.row}>
            {button('Qualsiasi conto', () => update('accountId', ''), false, !form.accountId)}
            {accounts.map((account) =>
              button(
                `Conto: ${account.name}`,
                () => update('accountId', account.id),
                false,
                form.accountId === account.id,
              ),
            )}
          </View>
          <Text style={s.label}>Tipo di movimento</Text>
          <View style={s.row}>
            {button('Qualsiasi tipo', () => update('kind', ''), false, !form.kind)}
            {(Object.keys(kindLabels) as TransactionKind[]).map((kind) =>
              button(kindLabels[kind], () => update('kind', kind), false, form.kind === kind),
            )}
          </View>
          <Text style={s.label}>Segno dell’importo</Text>
          <View style={s.row}>
            {button('Qualsiasi segno', () => update('direction', ''), false, !form.direction)}
            {button(
              'Importo negativo',
              () => update('direction', 'debit'),
              false,
              form.direction === 'debit',
            )}
            {button(
              'Importo positivo',
              () => update('direction', 'credit'),
              false,
              form.direction === 'credit',
            )}
            {button(
              'Importo zero',
              () => update('direction', 'zero'),
              false,
              form.direction === 'zero',
            )}
          </View>
          <Text style={s.label}>Categoria da assegnare</Text>
          <View style={s.row}>
            {(Object.keys(CATEGORIES) as CategoryId[]).map((category) =>
              button(
                CATEGORIES[category],
                () => update('categoryId', category),
                false,
                form.categoryId === category,
              ),
            )}
          </View>
          {field(
            'Priorità da 0 a 100',
            'priority',
            'Vince la priorità più alta. Le correzioni esplicite sul movimento hanno comunque precedenza.',
          )}
          <View style={s.row}>
            {button(
              'Salva e mostra anteprima',
              () => {
                void save()
              },
              true,
            )}
            {button('Chiudi senza salvare', () => {
              setShowForm(false)
              setEditing(null)
            })}
          </View>
        </View>
      )}
      {preview && (
        <View style={s.card}>
          <Text accessibilityRole="header" style={s.title}>
            Anteprima: {preview.rule.name}
          </Text>
          <Text style={s.text}>
            {preview.value.matchedTransactionIds.length} movimenti rispettano le condizioni.{' '}
            {preview.value.affectedTransactionIds.length} cambieranno classificazione.{' '}
            {preview.value.lockedTransactionIds.length} conservano la tua correzione.
          </Text>
          <Text style={s.hint}>
            Categoria: {CATEGORIES[preview.rule.categoryId]}. Gli importi, i conti e le
            riconciliazioni restano gli stessi. La regola attiva vale anche per i nuovi movimenti
            corrispondenti.
          </Text>
          {preview.value.affectedTransactionIds.slice(0, 5).map((id) => {
            const transaction = transactions.find((item) => item.id === id)
            return (
              <Text key={id} style={s.text}>
                {transaction
                  ? `${transaction.merchantName || transaction.description} · ${formatMoney(fromJson(transaction.amount))}`
                  : 'Movimento salvato'}
              </Text>
            )
          })}
          {preview.value.affectedTransactionIds.length > 5 && (
            <Text style={s.hint}>
              E altri {preview.value.affectedTransactionIds.length - 5} movimenti.
            </Text>
          )}
          <View style={s.row}>
            {button(
              'Applica questa regola',
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
                  setNotice('Regola applicata. Puoi disattivarla o annullare l’ultima modifica.')
                })
              },
              true,
            )}
            {button('Chiudi anteprima', () => setPreview(null))}
          </View>
        </View>
      )}
      {rules
        .filter((rule) => showArchived || !rule.archived)
        .map((rule) => (
          <View key={rule.id} style={s.card}>
            <Text style={s.title}>{rule.name}</Text>
            <Text style={s.text}>
              {CATEGORIES[rule.categoryId]} ·{' '}
              {rule.archived ? 'Archiviata' : rule.enabled ? 'Attiva' : 'Bozza / disattivata'} ·
              priorità {rule.priority}
            </Text>
            <Text style={s.hint}>
              Creata da te.{' '}
              {rule.conditions.merchantKey ? `Esercente: ${rule.conditions.merchantKey}. ` : ''}
              {rule.conditions.description
                ? `Descrizione ${rule.conditions.description.operator === 'equals' ? 'uguale a' : 'contenente'} “${rule.conditions.description.value}”. `
                : ''}
              Tutte le condizioni devono corrispondere.
            </Text>
            <View style={s.row}>
              {!rule.archived &&
                button('Modifica', () => {
                  setEditing(rule)
                  setForm(formFrom(rule))
                  setShowForm(true)
                  setPreview(null)
                })}
              {!rule.archived &&
                button('Mostra anteprima', () => {
                  void run(async () => setPreview({ rule, value: await client.preview(rule.id) }))
                })}
              {rule.enabled &&
                button('Disattiva', () => {
                  void run(async () => {
                    await client.state(rule.id, rule.revision, 'disable')
                    setPreview(null)
                    await reload()
                    await onChanged()
                    setNotice('Regola disattivata. I movimenti conservano i loro importi.')
                  })
                })}
              {!rule.archived &&
                button('Archivia', () => {
                  void run(async () => {
                    await client.state(rule.id, rule.revision, 'archive')
                    setPreview(null)
                    await reload()
                    await onChanged()
                    setNotice('Regola archiviata. Puoi ripristinarla annullando l’ultima modifica.')
                  })
                })}
              {rule.revision > 1 &&
                button('Annulla ultima modifica', () => {
                  void run(async () => {
                    await client.state(rule.id, rule.revision, 'undo')
                    setPreview(null)
                    await reload()
                    await onChanged()
                    setNotice(
                      'Versione precedente ripristinata come bozza. Controlla una nuova anteprima per attivarla.',
                    )
                  })
                })}
            </View>
          </View>
        ))}
      {!rules.length && !busy && (
        <Text style={s.hint}>
          Nessuna regola salvata. Puoi crearne una senza cambiare subito i movimenti.
        </Text>
      )}
    </View>
  )
}
function styles(c: typeof colors.light | typeof colors.dark) {
  return StyleSheet.create({
    panel: { gap: 16 },
    heading: { fontFamily: 'Newsreader', fontSize: 30, color: c.textPrimary },
    title: { fontFamily: 'Geist', fontSize: 18, fontWeight: '600', color: c.textPrimary },
    text: { fontFamily: 'Geist', fontSize: 16, lineHeight: 24, color: c.textPrimary },
    hint: { fontFamily: 'Geist', fontSize: 14, lineHeight: 21, color: c.textSecondary },
    label: { fontFamily: 'Geist', fontSize: 14, fontWeight: '600', color: c.textPrimary },
    error: { fontFamily: 'Geist', fontSize: 16, lineHeight: 24, color: c.danger },
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
    buttonText: { fontFamily: 'Geist', fontSize: 14, color: c.textPrimary },
    primary: { backgroundColor: c.primary, borderColor: c.primary },
    primaryText: { color: c.onPrimary, fontWeight: '600' },
    selected: { backgroundColor: c.primarySoft, borderColor: c.primary },
  })
}
