# Domain and native apps (iOS, Android): plan

**Date:** 2026-10-05. **Status:** DECISION for the domain and the order of the work. Native implementation:
see §4 (2026-10-06). Facts were checked on 2026-10-05 against first-party pages where reachable
(sources at the end); FACT / ASSUMPTION / UNKNOWN labels as in the other research notes.

## 1. Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Domain | Register **lilleri.app** (Cloudflare Registrar ≈ $8.20 then $14.20/year, or Porkbun $8.75 then $14.93). Optionally **lilleri.eu** defensively (Porkbun $5.88, OVH €7.49). | FACT: `lilleri.it` (OVH DNS, third-party site) and `lilleri.com` (registered 2016, Tucows) are taken; Google Registry RDAP returns 404 for `lilleri.app`. `.app` is HSTS-preloaded (HTTPS only), which the hosted service already requires. |
| App identifiers | iOS bundle id and Android package **`app.lilleri`**, set before the first upload. | Reverse-DNS of the domain. The current `it.lilleri.demo` package must not reach a store: a published package name can never change. |
| Order | **Web first** (today: installable PWA), then **Android**, then **iOS**. | The web has the lowest fee (Stripe ≈ 7% vs 15% in the stores) and no review risk; native apps need the engineering in §4. |
| iOS payments | Plus must also be purchasable with **Apple In-App Purchase** (Small Business Program, 15%). Web subscribers can use Plus in the app. | FACT: guideline 3.1.1 and 3.1.3(b) ("…provided those items are also available as in-app purchases"). The EU link-out (10–15%) saves little and adds VAT filing, monthly reporting, iOS 26.2+ and a 12-month lock-in. |
| Android payments | Google Play Billing (EEA: 10% service fee + 5% billing fee = 15%), or a first release that only *uses* Plus bought on the web, with no purchase prompts. | FACT: EEA fees since 2026-06-30; consumption-only apps are allowed. |
| Store accounts | **Organisation** accounts on both stores (requires the company, a D-U-N-S number and a website on the company domain). | FACT: Apple 5.1.1(ix) and Google's financial-services rule require a legal entity; Google organisation accounts are not subject to the 12-tester closed test for new personal accounts (ASSUMPTION from Google's page title and third-party guides). |

## 2. Net revenue per Plus payment (Italy, 22% VAT)

| Plan | Web (Stripe) | App Store IAP (15%) | Google Play Billing (15%) |
| --- | --- | --- | --- |
| €6.99 / month | **€5.32–5.33** | €4.87 | €4.87 |
| €69.99 / year | **€55.58** | €48.76 | €48.76 |

The store channels still leave a margin well above the bank cost per paying user (≈ €0.20–1.00,
see [value for money](../business/value-for-money-20261005.md)); keep the web as the default place
to subscribe and link to it from emails and the home page.

## 3. One-off and yearly costs

| Item | Cost | Notes |
| --- | --- | --- |
| lilleri.app | ≈ $8–9 first year, ≈ $14–15/year after | Cloudflare requires its DNS (root CNAME flattening works with Railway); Porkbun supports ALIAS records |
| Apple Developer Program (organisation) | $99/year | D-U-N-S (free, up to ~5 business days) + up to 2 business days Apple verification |
| Google Play Console (organisation) | $25 once | D-U-N-S; financial features declaration and Data safety form are mandatory |
| RevenueCat (optional) | Free below $2,500 monthly tracked revenue, then **1% of all** tracked revenue | Merges App Store, Play and Stripe entitlements; does not process payments |
| Expo EAS Build | Free tier for occasional builds (UNKNOWN current limits) | Store builds can also be produced locally with Xcode/Gradle |

## 4. Native implementation status (2026-10-06)

Implemented and tested in this repository (server tests, typecheck, and Metro bundles for iOS and
Android that contain the native modules). **Not yet run on a device or simulator**: this
environment has no Xcode or Android SDK, so the first device run happens in an EAS development
build.

| Piece | Where | Status |
| --- | --- | --- |
| App identity | `apps/mobile/app.json`: bundle id / package `app.lilleri`, scheme `lilleri`, iOS icon without transparency, Android adaptive icon, privacy manifest, `usesNonExemptEncryption: false` | Done |
| Link domain | `apps/mobile/app.config.js` (`LILLERI_APP_DOMAIN`, default `lilleri.app`): `applinks:` and `webcredentials:` on iOS, verified App Links for `https://<domain>/app…` on Android | Done |
| Association files | `GET /.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` from `APPLE_TEAM_ID` and `ANDROID_CERT_SHA256` (`apps/api/src/app-links.ts`); not published until set | Done |
| Native sign-in | Better Auth Expo client keeps the session cookie in the Keychain / Keystore (`expo-secure-store`) and sends `expo-origin: lilleri://`; the server accepts that origin only when the browser `Origin` header is absent, so no cross-site request can use it (`identity.ts`) | Done |
| Bank connection | The bank opens in an authentication session over the app; the callback returns to `lilleri://app?bank=…` for authorisations started in the app (`returnTo: 'app'`, migration 0045) | Done |
| Store purchases | RevenueCat SDK (`react-native-purchases`): store prices, buy, restore, manage, auto-renewal disclosure with Terms and Privacy links; the RevenueCat app user id is the Lilleri profile id; Stripe buttons are hidden in the apps | Done |
| Entitlement truth | `POST /webhooks/revenuecat` (dashboard `Authorization` value, optional HMAC signature) re-reads the customer from RevenueCat's REST API v1 and stores the `plus` entitlement (`store_entitlements`, migration 0044); `POST /v1/billing/store/refresh` does the same right after a purchase; Plus = Stripe **or** store; the website refuses a second subscription | Done |
| Deletion | In-app deletion warns that an App Store / Google Play subscription keeps billing and opens the store's management page; erasure also deletes the RevenueCat customer (retried with the Stripe cancellations); public page `/legal/delete-account` for Google Play | Done |
| Passkeys in the apps | Disabled in the apps (browser WebAuthn only); password and TOTP work | Later |

## 5. What the founder sets up for the first store builds

1. **Domain and server:** `lilleri.app` on the Railway production service, then in Railway set
   `APPLE_TEAM_ID` and `ANDROID_CERT_SHA256` (Play App Signing certificate **and** upload key,
   comma-separated, from Play Console › App integrity) so the association files go live.
2. **App Store Connect** (organisation account): app with bundle id `app.lilleri`; subscription
   group "Lilleri Plus" with two auto-renewable products, e.g. `app.lilleri.plus.monthly` (€6.99)
   and `app.lilleri.plus.yearly` (€69.99) — keep `monthly` / `yearly` in the ids, the server reads
   the period from them; enrol in the Small Business Program; upload the In-App Purchase key to
   RevenueCat.
3. **Google Play Console** (organisation account): app `app.lilleri`; subscriptions
   `plus_monthly` and `plus_yearly` with one base plan each; service-account credentials and
   real-time developer notifications for RevenueCat; Data safety form and Financial features
   declaration; deletion URL `https://lilleri.app/legal/delete-account`.
4. **RevenueCat:** one project with the iOS and Android apps; entitlement **`plus`** attached to
   all four products; offering `default` with the Monthly and Annual packages; restore behaviour
   "Transfer to new App User ID" (default); webhook `https://lilleri.app/webhooks/revenuecat` with
   an `Authorization` value of at least 32 random characters (and the signing secret). In Railway:
   `REVENUECAT_SECRET_KEY` (v1 secret key `sk_…`), `REVENUECAT_WEBHOOK_AUTHORIZATION`, optionally
   `REVENUECAT_WEBHOOK_SIGNING_SECRET`. In EAS (not secrets, but per account):
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_…`) and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_…`).
   `REVENUECAT_ACCEPT_SANDBOX` stays `1`: App Review buys Plus in the sandbox.
5. **EAS:** `cd apps/mobile && npx eas-cli login && npx eas-cli init` (links the Expo project),
   then `eas build --profile development --platform ios|android` for the first device test, and
   `eas build --profile production` + `eas submit` for the stores. `eas.json` already carries the
   hosted settings for `https://lilleri.app`; change them together with `LILLERI_APP_DOMAIN` if the
   domain differs (a test checks they agree with the server).
6. **Review notes:** a demo account with imported sample data; explain that bank connections need
   a real Italian bank account and that Plus can be bought in the sandbox.

## 6. Founder's checklist

1. Buy **lilleri.app** (and optionally lilleri.eu); point it at the Railway production service
   (custom domain + TLS), add the Scaleway SPF/DKIM/DMARC records, set `PUBLIC_BASE_URL`.
2. Request the company's **D-U-N-S** number (free) as soon as the company exists.
3. Enrol in the Apple Developer Program and Google Play Console as an organisation, using the
   website on lilleri.app (the public home page is served at `/`).
4. Decide RevenueCat vs own store verification (§4.5); then the native work in §4 can start.

## Sources (seen 2026-10-05)

- Apple: App Review Guidelines (developer.apple.com/app-store/review/guidelines/); Apps in the EU
  and EU offer communication pages (developer.apple.com/support/apps-in-the-eu/); Small Business
  Program; Program enrolment and D-U-N-S help pages.
- Google: Android Developers blog "Expanded billing choice and lower fees on Google Play"; Play
  Console Help on EEA programmes, developer verification, testing requirements for new personal
  accounts, financial features declaration and Data safety (via search excerpts; direct pages were
  blocked from this environment).
- RevenueCat pricing page; Porkbun pricing API; Cloudflare registrar price tracker (third party);
  OVHcloud Italy domain prices; Aruba .it prices; nic.it registrant FAQ; HSTS preload status for
  `.app`; RDAP (Verisign for .com, Google Registry for .app) and public DNS lookups.
