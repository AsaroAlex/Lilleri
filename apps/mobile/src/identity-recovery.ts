export interface HostedIdentityClientOptions {
  readonly termsVersion: string
  readonly termsUrl: string
  readonly browserOrigin: string
}
export function assertHostedIdentityClientConfiguration(
  baseUrl: string,
  options: HostedIdentityClientOptions,
) {
  const base = new URL(baseUrl),
    terms = new URL(options.termsUrl)
  if (
    base.protocol !== 'https:' ||
    baseUrl !== base.origin ||
    base.origin !== options.browserOrigin ||
    base.username ||
    base.password
  )
    throw new Error('Hosted sign-in requires the exact same HTTPS browser and API origin')
  if (
    terms.origin !== base.origin ||
    terms.username ||
    terms.password ||
    terms.search ||
    terms.hash
  )
    throw new Error('Hosted sign-in requires an application terms URL')
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(options.termsVersion) ||
    /(?:local|synthetic)/i.test(options.termsVersion)
  )
    throw new Error('Hosted sign-in requires an explicit reviewed terms version')
}

/**
 * Hosted builds may configure a notice as a same-origin path such as "/legal/terms". Resolve it
 * against the browser origin; any other value is returned unchanged for the existing validation.
 */
export function resolveSameOriginNoticeUrl(value: string, origin: string | undefined): string {
  if (!origin || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return value
  try {
    const base = new URL(origin)
    const resolved = new URL(value, base.origin)
    return resolved.origin === base.origin ? resolved.href : value
  } catch {
    return value
  }
}

/** Optional notice links render only for an exact same-origin HTTPS page without query or fragment. */
export function sameOriginNoticeUrl(
  value: string | undefined,
  origin: string | undefined,
): string | null {
  if (!value || !origin) return null
  try {
    const base = new URL(origin)
    const notice = new URL(resolveSameOriginNoticeUrl(value, origin))
    return notice.protocol === 'https:' &&
      notice.origin === base.origin &&
      !notice.username &&
      !notice.password &&
      !notice.search &&
      !notice.hash &&
      notice.pathname !== '/'
      ? notice.href
      : null
  } catch {
    return null
  }
}

/** Take the recovery token into volatile memory and immediately remove it from browser history. */
export function consumeIdentityRecoveryLocation(href: string, replace: (url: string) => void) {
  const url = new URL(href)
  if (url.searchParams.get('identity') !== 'recover') return { token: null, invalid: false }
  const value = url.searchParams.get('token')
  const invalid =
    Boolean(url.searchParams.get('error')) || !value || !/^[A-Za-z0-9_-]{20,256}$/.test(value)
  url.searchParams.delete('token')
  url.searchParams.delete('error')
  url.searchParams.delete('identity')
  replace(url.href)
  return { token: invalid ? null : value, invalid }
}
