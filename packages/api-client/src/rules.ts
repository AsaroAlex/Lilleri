import type { RuleDefinition, RulePreview, RuleRecord } from '@lilleri/domain'
/** Reuse createApiClient().request to preserve typed Problem errors and origin configuration. */
export function createRulesClient(request: <T>(path: string, init?: RequestInit) => Promise<T>) {
  const path = (id: string) => `/v1/rules/${encodeURIComponent(id)}`
  return {
    list: () => request<readonly RuleRecord[]>('/v1/rules'),
    create: (definition: RuleDefinition) =>
      request<RuleRecord>('/v1/rules', { method: 'POST', body: JSON.stringify(definition) }),
    edit: (id: string, revision: number, definition: RuleDefinition) =>
      request<RuleRecord>(path(id), {
        method: 'PATCH',
        body: JSON.stringify({ revision, definition }),
      }),
    preview: (id: string) =>
      request<RulePreview>(`${path(id)}/preview`, { method: 'POST', body: '{}' }),
    apply: (id: string, revision: number, previewRevision: string) =>
      request<RuleRecord>(`${path(id)}/apply`, {
        method: 'POST',
        body: JSON.stringify({ revision, previewRevision }),
      }),
    state: (id: string, revision: number, action: 'disable' | 'archive' | 'undo') =>
      request<RuleRecord>(`${path(id)}/state`, {
        method: 'POST',
        body: JSON.stringify({ revision, action }),
      }),
  }
}
