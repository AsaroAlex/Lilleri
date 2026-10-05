/** Gratis and Plus plans. Prices come from the server and include VAT. */
export const SUBSCRIPTION_MESSAGE_PAIRS = {
  'subscription.title': ['Abbonamento', 'Subscription'],
  'subscription.settingsHelp': ['Piano Gratis o Plus', 'Free or Plus plan'],
  'subscription.loading': ['Carico il tuo abbonamento…', 'Loading your subscription…'],
  'subscription.loadFailed': [
    'Non riesco a leggere il tuo abbonamento. Riprova tra poco.',
    'I cannot read your subscription. Try again shortly.',
  ],
  'subscription.retry': ['Riprova', 'Try again'],
  'subscription.currentHeading': ['Il tuo piano', 'Your plan'],
  'subscription.currentGratis': ['Stai usando Gratis.', 'You are on the Free plan.'],
  'subscription.currentPlus': ['Stai usando Plus.', 'You are on Plus.'],
  'subscription.currentPlusMonthly': [
    'Stai usando Plus con pagamento mensile.',
    'You are on Plus, paid monthly.',
  ],
  'subscription.currentPlusYearly': [
    'Stai usando Plus con pagamento annuale.',
    'You are on Plus, paid yearly.',
  ],
  'subscription.renews': ['Si rinnova il {date, date, long}.', 'Renews on {date, date, long}.'],
  'subscription.endsAt': [
    'Hai annullato il rinnovo: Plus resta attivo fino al {date, date, long}, poi il profilo torna a Gratis. I tuoi dati restano dove sono.',
    'You have cancelled renewal: Plus stays active until {date, date, long}, then your profile returns to Free. Your data stays where it is.',
  ],
  'subscription.endsAtPeriodEnd': [
    'Hai annullato il rinnovo: alla fine del periodo pagato il profilo torna a Gratis. I tuoi dati restano dove sono.',
    'You have cancelled renewal: at the end of the paid period your profile returns to Free. Your data stays where it is.',
  ],
  'subscription.paymentAttention': [
    'Il pagamento richiede attenzione. Puoi aggiornarlo da Gestisci abbonamento.',
    'Your payment needs attention. You can update it from Manage subscription.',
  ],
  'subscription.gratisTitle': ['Gratis', 'Free'],
  'subscription.gratisSummary': ['Gratis, senza scadenza', 'Free, with no expiry'],
  'subscription.gratisManual': ['Conti manuali', 'Manual accounts'],
  'subscription.gratisImport': ['Importazione di file CSV e XLSX', 'CSV and XLSX file import'],
  'subscription.gratisRules': [
    'Regole per classificare i movimenti',
    'Rules to categorise transactions',
  ],
  'subscription.gratisExport': ['Esportazione dei tuoi dati', 'Export of your data'],
  'subscription.gratisDeletion': [
    'Eliminazione del profilo e dei dati',
    'Deletion of your profile and data',
  ],
  'subscription.plusTitle': ['Plus', 'Plus'],
  'subscription.plusBanks': [
    'Collegamento automatico con le banche supportate',
    'Automatic connection with supported banks',
  ],
  'subscription.plusEverything': [
    'Tutto ciò che è incluso in Gratis',
    'Everything included in Free',
  ],
  'subscription.currentBadge': ['Il tuo piano attuale', 'Your current plan'],
  'subscription.pricePerMonth': ['{amount} al mese', '{amount} a month'],
  'subscription.pricePerYear': ['{amount} all’anno', '{amount} a year'],
  'subscription.vatIncluded': ['IVA inclusa', 'VAT included'],
  'subscription.priceUnavailable': ['Prezzo non disponibile', 'Price unavailable'],
  'subscription.chooseMonthly': ['Scegli Plus mensile', 'Choose Plus monthly'],
  'subscription.chooseYearly': ['Scegli Plus annuale', 'Choose Plus yearly'],
  'subscription.choosePriced': ['{plan}, {price}', '{plan}, {price}'],
  'subscription.checkoutHelp': [
    'Il pagamento avviene su una pagina sicura di Stripe. Puoi annullare il rinnovo quando vuoi.',
    'Payment takes place on a secure Stripe page. You can cancel renewal whenever you like.',
  ],
  'subscription.manage': ['Gestisci abbonamento', 'Manage subscription'],
  'subscription.manageHelp': [
    'Sulla pagina sicura di Stripe puoi cambiare il metodo di pagamento, scaricare le ricevute o annullare il rinnovo.',
    'On Stripe’s secure page you can change your payment method, download receipts or cancel renewal.',
  ],
  'subscription.notAvailable': [
    'Gli abbonamenti non sono ancora disponibili. Tutto ciò che è incluso in Gratis resta disponibile, senza scadenza.',
    'Subscriptions are not available yet. Everything included in Free remains available, with no expiry.',
  ],
  'subscription.ownerOnly': [
    'Solo il titolare del profilo può gestire l’abbonamento.',
    'Only the profile owner can manage the subscription.',
  ],
  'subscription.redirecting': [
    'Ti porto alla pagina di pagamento…',
    'Taking you to the payment page…',
  ],
  'subscription.portalRedirecting': [
    'Ti porto alla gestione dell’abbonamento…',
    'Taking you to subscription management…',
  ],
  'subscription.alreadySubscribed': [
    'Il profilo ha già un abbonamento attivo. Ho aggiornato lo stato.',
    'This profile already has an active subscription. I have refreshed its status.',
  ],
  'subscription.noBillingAccount': [
    'Non trovo un abbonamento da gestire per questo profilo.',
    'I cannot find a subscription to manage for this profile.',
  ],
  'subscription.unsafeRedirect': [
    'Non riesco ad aprire la pagina di pagamento in modo sicuro. Riprova tra poco.',
    'I cannot open the payment page securely. Try again shortly.',
  ],
  'subscription.confirming': [
    'Stiamo confermando il tuo abbonamento…',
    'We are confirming your subscription…',
  ],
  'subscription.confirmed': ['Plus è attivo sul tuo profilo.', 'Plus is active on your profile.'],
  'subscription.confirmSlow': [
    'La conferma richiede più tempo del previsto. Aggiorna tra qualche minuto: non serve pagare di nuovo.',
    'Confirmation is taking longer than expected. Refresh in a few minutes: there is no need to pay again.',
  ],
  'subscription.refresh': ['Aggiorna lo stato', 'Refresh status'],
  'billingReturn.success': [
    'Grazie. Stiamo ricevendo la conferma del pagamento da Stripe.',
    'Thank you. We are receiving the payment confirmation from Stripe.',
  ],
  'billingReturn.cancelled': [
    'Hai chiuso il pagamento senza completarlo. Il tuo piano non è cambiato.',
    'You closed the payment without completing it. Your plan has not changed.',
  ],
  'billingReturn.portal': [
    'Sei tornato dalla gestione dell’abbonamento. Le modifiche possono richiedere qualche istante.',
    'You are back from subscription management. Changes may take a moment to appear.',
  ],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
