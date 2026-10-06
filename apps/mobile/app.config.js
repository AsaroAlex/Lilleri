// Native settings that depend on the public domain: universal links (iOS) and verified App Links
// (Android) open https://<domain>/app… in the app, and passwords/passkeys saved for the website
// work in the app. The server publishes the matching association files (apps/api/src/app-links.ts).
module.exports = ({ config }) => {
  const domain = process.env.LILLERI_APP_DOMAIN ?? 'lilleri.app'
  if (!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(domain))
    throw new Error('LILLERI_APP_DOMAIN must be a bare host name such as lilleri.app')
  return {
    ...config,
    ios: {
      ...config.ios,
      associatedDomains: [`applinks:${domain}`, `webcredentials:${domain}`],
    },
    android: {
      ...config.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: domain, pathPrefix: '/app' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  }
}
