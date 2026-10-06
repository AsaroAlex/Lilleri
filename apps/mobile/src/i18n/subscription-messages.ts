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
  'founders.title': ['Plus Fondatori', 'Plus Founders'],
  'founders.offer': [
    'Attiviamo il collegamento con le banche un gruppo di persone alla volta. Ti scriviamo una sola email quando Plus è pronto per te.',
    'We are opening bank connections to a group of people at a time. We will send you a single email when Plus is ready for you.',
  ],
  'founders.promise': [
    'Chi entra dalla lista mantiene il prezzo con cui attiva Plus finché resta abbonato.',
    'People who join from the list keep the price they start Plus with for as long as they stay subscribed.',
  ],
  'founders.join': ['Avvisami quando è disponibile', 'Notify me when it is available'],
  'founders.joined': ['Sei nella lista Fondatori.', 'You are on the Founders list.'],
  'founders.position': [
    'Sei al posto numero {position, number}.',
    'You are number {position, number}.',
  ],
  'founders.waiting': [
    'Ti scriveremo una sola email, all’indirizzo del tuo account, quando Plus sarà disponibile per te.',
    'We will send a single email to your account address when Plus is available for you.',
  ],
  'founders.notified': [
    'Ti abbiamo scritto che Plus era disponibile. Se ora non riesci ad attivarlo, i posti di questo gruppo sono esauriti: riprova tra qualche giorno.',
    'We emailed you that Plus was available. If you cannot start it now, this group’s places are taken: try again in a few days.',
  ],
  'founders.leave': ['Esci dalla lista', 'Leave the list'],
  'founders.saving': ['Aggiorno la lista…', 'Updating the list…'],
  'founders.failed': [
    'Non riesco ad aggiornare la lista. Riprova tra poco.',
    'I cannot update the list. Try again shortly.',
  ],
  'subscription.storeMonthly': ['Plus mensile · {price}', 'Plus monthly · {price}'],
  'subscription.storeYearly': ['Plus annuale · {price}', 'Plus yearly · {price}'],
  'subscription.storeLoading': ['Carico i prezzi dello store…', 'Loading store prices…'],
  'subscription.storeOffersFailed': [
    'Non riesco a leggere i prezzi dello store. Riprova tra poco.',
    'I cannot read the store prices. Try again shortly.',
  ],
  'subscription.storeUnavailableHere': [
    'In questa versione dell’app Plus non si può ancora acquistare.',
    'Plus cannot be bought in this version of the app yet.',
  ],
  'subscription.storeDisclosure': [
    'L’abbonamento si rinnova automaticamente al prezzo indicato, salvo disdetta almeno 24 ore prima della fine del periodo in corso. Il pagamento è addebitato sul tuo account {store}; puoi gestire o disdire l’abbonamento dalle impostazioni di {store}.',
    'The subscription renews automatically at the price shown unless cancelled at least 24 hours before the end of the current period. Payment is charged to your {store} account; you can manage or cancel it in your {store} settings.',
  ],
  'subscription.storeRestore': ['Ripristina acquisti', 'Restore purchases'],
  'subscription.storeRestored': [
    'Abbiamo ripristinato il tuo abbonamento Plus.',
    'Your Plus subscription has been restored.',
  ],
  'subscription.storeNothingToRestore': [
    'Non abbiamo trovato un abbonamento Plus da ripristinare per questo account {store}.',
    'We found no Plus subscription to restore for this {store} account.',
  ],
  'subscription.storePending': [
    'Il pagamento è in attesa di conferma da {store}. Plus si attiverà appena arriva la conferma.',
    'The payment is waiting for confirmation from {store}. Plus starts as soon as it arrives.',
  ],
  'subscription.storeFailed': [
    'L’acquisto non è stato completato. Riprova tra poco.',
    'The purchase was not completed. Try again shortly.',
  ],
  'subscription.storeBusy': ['Apro {store}…', 'Opening {store}…'],
  'subscription.termsLink': ['Termini di servizio', 'Terms of service'],
  'subscription.privacyLink': ['Informativa sulla privacy', 'Privacy notice'],
  'subscription.manageStore': ['Gestisci su {store}', 'Manage in {store}'],
  'subscription.manageInStore': [
    'Hai attivato Plus tramite {store}: lo gestisci o lo disdici dalle impostazioni dello store.',
    'You started Plus through {store}: manage or cancel it in the store settings.',
  ],
  'subscription.manageOnWeb': [
    'Hai attivato Plus sul sito di Lilleri: lo gestisci o lo disdici dal sito.',
    'You started Plus on the Lilleri website: manage or cancel it there.',
  ],
  'subscription.promotional': [
    'Plus ti è stato assegnato direttamente da Lilleri.',
    'Plus was granted to you directly by Lilleri.',
  ],
  'subscription.deleteStoreWarning': [
    'Hai Plus tramite {store}: {store} continua ad addebitarlo anche dopo l’eliminazione del profilo. Prima disdici l’abbonamento dalle impostazioni di {store}.',
    'You have Plus through {store}: {store} keeps charging it even after the profile is deleted. Cancel the subscription in your {store} settings first.',
  ],
} as const satisfies Readonly<Record<string, readonly [string, string]>>
