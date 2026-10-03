import { ApiError, type DemoOverview } from '@lilleri/api-client'
import { type BrandTheme, colors } from '@lilleri/brand'
import type {
  MerchantAlias,
  MerchantResolution,
  OwnedCategory,
  OwnedCategoryAssignment,
  OwnedCategoryValues,
  TaxonomySnapshot,
} from '@lilleri/domain'
import { fromJson } from '@lilleri/money'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useI18n } from './src/i18n/context'

type Request = <T>(path: string, init?: RequestInit) => Promise<T>
interface Response {
  readonly taxonomy: TaxonomySnapshot
  readonly aliases: readonly MerchantAlias[]
  readonly categories: readonly OwnedCategory[]
  readonly resolutions: readonly MerchantResolution[]
  readonly assignments: readonly OwnedCategoryAssignment[]
}
interface Preview {
  readonly previewRevision: string
  readonly affectedTransactionIds: readonly string[]
  readonly preservedHidden: true
  readonly preservedSource: true
}
export interface MerchantPanelProps {
  readonly overview: DemoOverview
  readonly theme: BrandTheme
  readonly request: Request
  readonly resetKey: number | string
  readonly disabled?: boolean
  readonly onError?: (cause: unknown) => boolean
  readonly onChanged?: () => void | Promise<void>
}
const emptyCategory = (): OwnedCategoryValues => ({
  label: '',
  canonicalCode: 'FOOD_GROCERIES',
  icon: 'basket',
  parentId: null,
  position: 0,
  hidden: false,
})

/** Every read, preview and write is fenced by both the profile epoch and captured ledger object. */
export function MerchantPanel({
  overview,
  theme,
  request,
  resetKey,
  disabled = false,
  onError,
  onChanged,
}: MerchantPanelProps) {
  const i18n = useI18n(),
    { t } = i18n
  const s = useMemo(() => styles(colors[theme]), [theme])
  const scope = `${overview.profile.id}:${resetKey}`
  const identity = useRef({ scope, overview, request, epoch: 0 })
  if (
    identity.current.scope !== scope ||
    identity.current.overview !== overview ||
    identity.current.request !== request
  )
    identity.current = { scope, overview, request, epoch: identity.current.epoch + 1 }
  const epoch = identity.current.epoch
  const mounted = useRef(true),
    ticket = useRef(0)
  const callbacks = useRef({ onError, onChanged, i18n })
  callbacks.current = { onError, onChanged, i18n }
  const [response, setResponse] = useState<{ epoch: number; data: Response } | null>(null)
  const [working, setWorking] = useState<number | null>(null)
  const [error, setError] = useState<{ epoch: number; text: string } | null>(null)
  const [notice, setNotice] = useState<{ epoch: number; text: string } | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [aliasPreview, setAliasPreview] = useState<Preview | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState<OwnedCategoryValues>(emptyCategory)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [assignmentCategoryId, setAssignmentCategoryId] = useState<string | null>(null)
  const [migrationSourceId, setMigrationSourceId] = useState<string | null>(null)
  const [migrationTargetId, setMigrationTargetId] = useState<string | null>(null)
  const [migrationPreview, setMigrationPreview] = useState<Preview | null>(null)
  const live = response?.epoch === epoch ? response.data : null
  const busy = working === epoch,
    available = !!live && !busy && !disabled
  const alive = useCallback(
    (captured: number) => mounted.current && identity.current.epoch === captured,
    [],
  )
  const problem = useCallback(
    (cause: unknown, captured: number) => {
      if (!alive(captured) || callbacks.current.onError?.(cause)) return
      setError({
        epoch: captured,
        text:
          cause instanceof ApiError && cause.status === 409
            ? callbacks.current.i18n.t('merchant.conflict')
            : callbacks.current.i18n.problemMessage(cause),
      })
    },
    [alive],
  )
  const load = useCallback(
    async (clearError = true) => {
      const captured = identity.current.epoch,
        mine = ++ticket.current
      setWorking(captured)
      if (clearError) setError(null)
      try {
        const data = await request<Response>('/v1/merchants')
        if (alive(captured) && mine === ticket.current) setResponse({ epoch: captured, data })
      } catch (cause) {
        if (mine === ticket.current) problem(cause, captured)
      } finally {
        if (alive(captured) && mine === ticket.current) setWorking(null)
      }
    },
    [request, alive, problem],
  )
  useEffect(() => {
    if (identity.current.epoch !== epoch) return
    mounted.current = true
    setResponse(null)
    setNotice(null)
    setError(null)
    setTransactionId(null)
    setDisplayName('')
    setAliasPreview(null)
    setShowCategoryForm(false)
    setEditingCategory(null)
    setCategoryForm(emptyCategory())
    setAssignmentCategoryId(null)
    setMigrationSourceId(null)
    setMigrationTargetId(null)
    setMigrationPreview(null)
    void load()
    return () => {
      mounted.current = false
      ++ticket.current
    }
  }, [epoch, load])
  const command = async <T,>(
    path: string,
    body: unknown,
    preview: boolean,
    accept?: (value: T) => void,
    method = 'POST',
  ) => {
    if (!available) return
    const captured = identity.current.epoch
    setWorking(captured)
    setError(null)
    setNotice(null)
    try {
      const result = await request<T>(path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!alive(captured)) return
      accept?.(result)
      if (!preview) {
        setAliasPreview(null)
        setMigrationPreview(null)
        setNotice({ epoch: captured, text: callbacks.current.i18n.t('merchant.saved') })
        await callbacks.current.onChanged?.()
        if (alive(captured)) await load(false)
      }
    } catch (cause) {
      if (!alive(captured)) return
      setAliasPreview(null)
      setMigrationPreview(null)
      problem(cause, captured)
      if (cause instanceof ApiError && cause.status === 409 && alive(captured)) await load(false)
    } finally {
      if (alive(captured)) setWorking(null)
    }
  }
  const button = (label: string, action: () => void, enabled = available, selected?: boolean) => (
    <Pressable
      style={[s.button, selected && s.selected]}
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityState={{
        disabled: !enabled,
        ...(selected === undefined ? {} : { checked: selected }),
      }}
      aria-disabled={!enabled}
      aria-checked={selected}
      disabled={!enabled}
      onPress={action}
    >
      <Text style={s.text}>{label}</Text>
    </Pressable>
  )
  const selectedResolution = live?.resolutions.find((row) => row.transactionId === transactionId)
  const selectedTransaction = overview.transactions.find((row) => row.id === transactionId)
  const selectedAlias = live?.aliases.find((row) => row.id === selectedResolution?.aliasId)
  const selectedAssignment = live?.assignments.find((row) => row.transactionId === transactionId)
  const activeCategories =
    live?.categories
      .filter((row) => !row.archived)
      .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label)) ?? []
  const currentCategory = live?.categories.find((row) => row.id === editingCategory)
  const migrationSource = live?.categories.find((row) => row.id === migrationSourceId)
  const selectedLeaf = live?.taxonomy.leaves.find((row) => row.code === categoryForm.canonicalCode)
  const leafLabel = (leaf: { labelIt: string; labelEn: string }) =>
    i18n.locale === 'en-GB' ? leaf.labelEn : leaf.labelIt
  const selectTransaction = (id: string) => {
    const resolution = live?.resolutions.find((row) => row.transactionId === id)
    setTransactionId(id)
    setAliasPreview(null)
    setDisplayName(
      resolution?.displayName ??
        overview.transactions.find((row) => row.id === id)?.merchantName ??
        '',
    )
    setAssignmentCategoryId(
      live?.assignments.find((row) => row.transactionId === id)?.categoryId ?? null,
    )
  }
  const editCategory = (category: OwnedCategory | null) => {
    setShowCategoryForm(true)
    setEditingCategory(category?.id ?? null)
    setCategoryForm(
      category
        ? {
            label: category.label,
            canonicalCode: category.canonicalCode,
            icon: category.icon,
            parentId: category.parentId,
            position: category.position,
            hidden: category.hidden,
          }
        : emptyCategory(),
    )
    setMigrationPreview(null)
  }
  const previewCard = (preview: Preview) => (
    <View style={s.card}>
      <Text style={s.text}>
        {t('merchant.previewImpact', { count: preview.affectedTransactionIds.length })}
      </Text>
      <Text style={s.note}>{t('merchant.previewPrivacy')}</Text>
    </View>
  )
  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" aria-level={2} style={s.title}>
        {t('merchant.title')}
      </Text>
      <Text style={s.note}>{t('merchant.help')}</Text>
      {busy && <ActivityIndicator accessibilityLabel={t('common.loading')} />}
      {error?.epoch === epoch && (
        <Text accessibilityRole="alert" style={s.error}>
          {error.text}
        </Text>
      )}
      {notice?.epoch === epoch && (
        <Text accessibilityLiveRegion="polite" style={s.note}>
          {notice.text}
        </Text>
      )}
      {button(t('common.refresh'), () => void load(), !busy && !disabled)}
      {live && (
        <>
          <Text accessibilityRole="header" aria-level={3} style={s.label}>
            {t('merchant.chooseTransaction')}
          </Text>
          {!live.resolutions.length && <Text style={s.note}>{t('merchant.noTransactions')}</Text>}
          <View style={s.wrap}>
            {live.resolutions.map((resolution) => {
              const row = overview.transactions.find((tx) => tx.id === resolution.transactionId)
              if (!row) return null
              return (
                <View key={row.id}>
                  {button(
                    `${i18n.calendarDate(row.bookedOn)} · ${row.merchantName ?? row.description} · ${i18n.money(fromJson(row.amount))}`,
                    () => selectTransaction(row.id),
                    available,
                    transactionId === row.id,
                  )}
                </View>
              )
            })}
          </View>
          {selectedTransaction && selectedResolution && (
            <View style={s.card}>
              <Text style={s.note}>{selectedTransaction.description}</Text>
              <Text style={s.label}>{selectedResolution.displayName ?? t('merchant.unknown')}</Text>
              {selectedResolution.status === 'ambiguous' && (
                <Text style={s.note}>{t('merchant.ambiguous')}</Text>
              )}
              {selectedResolution.evidence.includes('unsupported_source_text') && (
                <Text style={s.note}>{t('merchant.unsupported')}</Text>
              )}
              {selectedResolution.normalizedKey && (
                <>
                  <Text style={s.note}>{t('merchant.nameHelp')}</Text>
                  <TextInput
                    style={s.input}
                    accessibilityLabel={t('merchant.name')}
                    placeholder={t('merchant.name')}
                    value={displayName}
                    editable={available}
                    maxLength={120}
                    onChangeText={(value) => {
                      setDisplayName(value)
                      setAliasPreview(null)
                    }}
                  />
                  {button(
                    t('merchant.preview'),
                    () =>
                      void command<Preview>(
                        '/v1/merchants/preview',
                        {
                          transactionId,
                          displayName: displayName.trim(),
                          ...(selectedAlias ? { aliasId: selectedAlias.id } : {}),
                        },
                        true,
                        setAliasPreview,
                      ),
                    available && !!displayName.trim(),
                  )}
                  {aliasPreview && (
                    <>
                      {previewCard(aliasPreview)}
                      {button(
                        t('merchant.apply'),
                        () =>
                          void command(
                            '/v1/merchants/apply',
                            {
                              transactionId,
                              displayName: displayName.trim(),
                              previewRevision: aliasPreview.previewRevision,
                              ...(selectedAlias
                                ? { aliasId: selectedAlias.id, revision: selectedAlias.revision }
                                : {}),
                            },
                            false,
                          ),
                      )}
                    </>
                  )}
                </>
              )}
              <Text style={s.label}>{t('merchant.chooseCategory')}</Text>
              {!activeCategories.length && <Text style={s.note}>{t('merchant.noCategories')}</Text>}
              <View style={s.wrap}>
                {activeCategories.map((category) => (
                  <View key={category.id}>
                    {button(
                      category.label,
                      () => setAssignmentCategoryId(category.id),
                      available,
                      assignmentCategoryId === category.id,
                    )}
                  </View>
                ))}
              </View>
              {selectedAssignment && (
                <Text style={s.note}>
                  {t('merchant.historicalLabel', { label: selectedAssignment.labelSnapshot })}
                </Text>
              )}
              {button(
                t('merchant.assign'),
                () =>
                  void command(
                    `/v1/transactions/${encodeURIComponent(selectedTransaction.id)}/category`,
                    {
                      categoryId: assignmentCategoryId,
                      revision: selectedAssignment?.revision ?? 1,
                    },
                    false,
                  ),
                available && !!assignmentCategoryId,
              )}
            </View>
          )}
          {!!live.aliases.length && (
            <>
              <Text accessibilityRole="header" aria-level={3} style={s.label}>
                {t('merchant.names')}
              </Text>
              {live.aliases.map((alias) => (
                <View key={alias.id} style={s.card}>
                  <Text style={s.text}>
                    {alias.displayName}
                    {alias.archived ? ` · ${t('merchant.archived')}` : ''}
                  </Text>
                  <View style={s.wrap}>
                    {!alias.archived &&
                      button(
                        t('merchant.archive'),
                        () =>
                          void command(
                            `/v1/merchants/${encodeURIComponent(alias.id)}/archive`,
                            { revision: alias.revision },
                            false,
                          ),
                      )}
                    {button(
                      t('common.undo'),
                      () =>
                        void command(
                          `/v1/merchants/${encodeURIComponent(alias.id)}/undo`,
                          { revision: alias.revision },
                          false,
                        ),
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
          <Text accessibilityRole="header" aria-level={3} style={s.label}>
            {t('merchant.categories')}
          </Text>
          {button(t('merchant.newCategory'), () => editCategory(null))}
          {live.categories.map((category) => (
            <View key={category.id} style={s.card}>
              <Text style={s.label}>
                {category.label}
                {category.archived ? ` · ${t('merchant.archived')}` : ''}
              </Text>
              <Text style={s.note}>
                {i18n.categoryLabel(category.canonicalCode)}
                {category.hidden ? ` · ${t('merchant.hidden')}` : ''}
              </Text>
              <View style={s.wrap}>
                {!category.archived &&
                  button(t('merchant.editCategory'), () => editCategory(category))}
                {!category.archived &&
                  button(t('merchant.migrate'), () => {
                    setMigrationSourceId(category.id)
                    setMigrationTargetId(null)
                    setMigrationPreview(null)
                    setShowCategoryForm(false)
                  })}
                {button(
                  t('common.undo'),
                  () =>
                    void command(
                      `/v1/categories/${encodeURIComponent(category.id)}/undo`,
                      { revision: category.revision },
                      false,
                    ),
                )}
              </View>
            </View>
          ))}
          <Text style={s.note}>{t('merchant.undoHelp')}</Text>
          {showCategoryForm && (
            <View style={s.card}>
              <Text accessibilityRole="header" aria-level={3} style={s.label}>
                {t(editingCategory ? 'merchant.editCategory' : 'merchant.newCategory')}
              </Text>
              <TextInput
                style={s.input}
                accessibilityLabel={t('merchant.categoryName')}
                placeholder={t('merchant.categoryName')}
                value={categoryForm.label}
                maxLength={120}
                editable={available}
                onChangeText={(label) => setCategoryForm({ ...categoryForm, label })}
              />
              <Text style={s.label}>{t('merchant.chooseGroup')}</Text>
              <View style={s.wrap}>
                {live.taxonomy.parents.map((parent) => (
                  <View key={parent.id}>
                    {button(
                      leafLabel(parent),
                      () =>
                        setCategoryForm({ ...categoryForm, canonicalCode: parent.defaultChild }),
                      available,
                      selectedLeaf?.group === parent.id,
                    )}
                  </View>
                ))}
              </View>
              <Text style={s.label}>{t('merchant.categoryType')}</Text>
              <View style={s.wrap}>
                {live.taxonomy.leaves
                  .filter(
                    (leaf) =>
                      leaf.group === selectedLeaf?.group && leaf.selectable && !leaf.deprecated,
                  )
                  .map((leaf) => (
                    <View key={leaf.code}>
                      {button(
                        leafLabel(leaf),
                        () => setCategoryForm({ ...categoryForm, canonicalCode: leaf.code }),
                        available,
                        categoryForm.canonicalCode === leaf.code,
                      )}
                      {leaf.localProposal && (
                        <Text style={s.note}>{t('merchant.localProposal')}</Text>
                      )}
                    </View>
                  ))}
              </View>
              <Text style={s.label}>{t('merchant.parent')}</Text>
              <View style={s.wrap}>
                {button(
                  t('merchant.noParent'),
                  () => setCategoryForm({ ...categoryForm, parentId: null }),
                  available,
                  categoryForm.parentId === null,
                )}
                {activeCategories
                  .filter((row) => row.id !== editingCategory)
                  .map((row) => (
                    <View key={row.id}>
                      {button(
                        row.label,
                        () => setCategoryForm({ ...categoryForm, parentId: row.id }),
                        available,
                        categoryForm.parentId === row.id,
                      )}
                    </View>
                  ))}
              </View>
              <TextInput
                style={s.input}
                accessibilityLabel={t('merchant.icon')}
                placeholder={t('merchant.icon')}
                value={categoryForm.icon}
                maxLength={40}
                editable={available}
                onChangeText={(icon) => setCategoryForm({ ...categoryForm, icon })}
              />
              <TextInput
                style={s.input}
                accessibilityLabel={t('merchant.position')}
                placeholder={t('merchant.position')}
                value={String(categoryForm.position)}
                inputMode="numeric"
                editable={available}
                onChangeText={(value) => {
                  if (/^\d{0,6}$/.test(value))
                    setCategoryForm({ ...categoryForm, position: Number(value || '0') })
                }}
              />
              <Pressable
                style={s.button}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: categoryForm.hidden, disabled: !available }}
                aria-checked={categoryForm.hidden}
                disabled={!available}
                onPress={() => setCategoryForm({ ...categoryForm, hidden: !categoryForm.hidden })}
              >
                <Text style={s.text}>
                  {categoryForm.hidden ? '☑' : '☐'} {t('merchant.hidden')}
                </Text>
              </Pressable>
              <Text style={s.note}>{t('merchant.hiddenHelp')}</Text>
              <View style={s.wrap}>
                {button(
                  t('common.save'),
                  () =>
                    void command(
                      editingCategory
                        ? `/v1/categories/${encodeURIComponent(editingCategory)}`
                        : '/v1/categories',
                      {
                        ...categoryForm,
                        label: categoryForm.label.trim(),
                        ...(currentCategory ? { revision: currentCategory.revision } : {}),
                      },
                      false,
                      () => {
                        setShowCategoryForm(false)
                        setEditingCategory(null)
                      },
                      editingCategory ? 'PATCH' : 'POST',
                    ),
                  available && !!categoryForm.label.trim() && !!categoryForm.icon.trim(),
                )}
                {button(t('common.cancel'), () => setShowCategoryForm(false))}
              </View>
            </View>
          )}
          {migrationSource && (
            <View style={s.card}>
              <Text style={s.label}>
                {t('merchant.migrate')} · {migrationSource.label}
              </Text>
              <Text style={s.note}>{t('merchant.migrationHelp')}</Text>
              <View style={s.wrap}>
                {button(
                  t('merchant.archiveOnly'),
                  () => {
                    setMigrationTargetId(null)
                    setMigrationPreview(null)
                  },
                  available,
                  migrationTargetId === null,
                )}
                {activeCategories
                  .filter((row) => row.id !== migrationSource.id)
                  .map((row) => (
                    <View key={row.id}>
                      {button(
                        row.label,
                        () => {
                          setMigrationTargetId(row.id)
                          setMigrationPreview(null)
                        },
                        available,
                        migrationTargetId === row.id,
                      )}
                    </View>
                  ))}
              </View>
              {button(
                t('merchant.preview'),
                () =>
                  void command<Preview>(
                    `/v1/categories/${encodeURIComponent(migrationSource.id)}/migration-preview`,
                    { targetId: migrationTargetId },
                    true,
                    setMigrationPreview,
                  ),
              )}
              {migrationPreview && (
                <>
                  {previewCard(migrationPreview)}
                  {button(
                    t('merchant.applyMigration'),
                    () =>
                      void command(
                        `/v1/categories/${encodeURIComponent(migrationSource.id)}/migrate`,
                        {
                          targetId: migrationTargetId,
                          revision: migrationSource.revision,
                          previewRevision: migrationPreview.previewRevision,
                        },
                        false,
                        () => setMigrationSourceId(null),
                      ),
                  )}
                </>
              )}
              {button(t('common.cancel'), () => {
                setMigrationSourceId(null)
                setMigrationPreview(null)
              })}
            </View>
          )}
        </>
      )}
    </View>
  )
}
function styles(c: (typeof colors)[BrandTheme]) {
  return StyleSheet.create({
    panel: { gap: 12, padding: 16, backgroundColor: c.surface, borderRadius: 16 },
    title: { fontSize: 20, fontWeight: '700', color: c.textPrimary },
    label: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    text: { fontSize: 15, color: c.textPrimary },
    note: { fontSize: 14, lineHeight: 21, color: c.textSecondary },
    error: { fontSize: 14, color: c.danger },
    card: { gap: 10, padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    button: {
      minHeight: 48,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      justifyContent: 'center',
    },
    selected: { borderWidth: 2, borderColor: c.accent },
    input: {
      minHeight: 48,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      color: c.textPrimary,
    },
  })
}
