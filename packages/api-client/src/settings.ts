import type {
  CapabilityEntitlements,
  ProfileSettings,
  ProfileSettingsValues,
} from '@lilleri/domain'

export interface SettingsResponse {
  readonly settings: ProfileSettings
  readonly entitlements: CapabilityEntitlements
}
/** No profile selector, paid flag or billing data is accepted from the client. */
export function createSettingsClient(request: <T>(path: string, init?: RequestInit) => Promise<T>) {
  return {
    get: () => request<SettingsResponse>('/v1/settings'),
    update: (revision: number, values: ProfileSettingsValues) =>
      request<SettingsResponse>('/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify({ ...values, revision }),
      }),
  }
}
