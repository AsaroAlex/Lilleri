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
