# Domain and native apps (iOS, Android): plan

**Date:** 2026-10-05. **Status:** DECISION for the domain and the order of the work; the native apps
are not built yet. Facts were checked on 2026-10-05 against first-party pages where reachable
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

## 4. Engineering still required (not in this release)

The Expo app runs natively, but the hosted service is web-only today. Before a store upload:

1. **Native sign-in.** `identity.ts` rejects state-changing auth requests without an `Origin`
   header, which native `fetch` does not send. Add the Better Auth Expo integration (server plugin
   with the app scheme as a trusted origin; session cookie kept in the Keychain/Keystore through
   `expo-secure-store`). Security-sensitive: review with the identity tests.
2. **App configuration.** `app.json`: `ios.bundleIdentifier` and `android.package` = `app.lilleri`,
   `scheme`, version/build numbers, splash, privacy manifest; an `eas.json` with production
   profiles.
3. **Links back into the app.** Serve `/.well-known/apple-app-site-association` and
   `/.well-known/assetlinks.json` from the hosted server (the static handler refuses dot-segments
   today) so that `/app?…` links open the app: email verification, password recovery, the bank
   callback return (`/app?bank=…`) and the Plus notice (`/app?fondatori=1`).
4. **Bank authorisation on a phone.** Open the bank page in an authentication session
   (`expo-web-browser`) and return through the universal link.
5. **Store purchases.** StoreKit 2 and Play Billing for Plus (directly, or through RevenueCat),
   server-side verification (App Store Server Notifications V2, Play real-time developer
   notifications), one Plus entitlement whatever the channel, "restore purchases", and a guard
   against a second subscription in another channel. `billing.ts` plan resolution is extended to
   these sources.
6. **Store compliance.** In-app account deletion (exists); a public, no-login deletion page for
   Google; privacy nutrition labels and Data safety answers (bank data read-only, no tracking, no
   advertising); review notes with a demo account and the provider sandbox bank.

ASSUMPTION: 2–4 weeks of engineering plus 1–2 weeks of store review for the first release.

## 5. Founder's checklist

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
