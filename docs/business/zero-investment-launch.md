# Lilleri: lancio senza investimento iniziale

Decisione del fondatore applicata il 2026-10-03. Questo documento prevale sulle precedenti ipotesi di lancio in `business-model.md` e `pricing-analysis.md`. Distingue le scelte di prodotto dai servizi effettivamente disponibili: oggi Lilleri resta un prototipo locale con dati sintetici, senza checkout o collegamenti bancari reali.

## La scelta

**Gratis permanente per entrare e restare; automazione bancaria finanziata da ricavi già incassati.** Non acquistiamo una licenza AISP, un canone di aggregazione o servizi di arricchimento per acquisire utenti gratuiti. Il motore finanziario, le regole e l'API restano di Lilleri.

La leva iniziale è utilizzare l'esportazione che la banca mette già a disposizione del cliente: file scelto dall'utente, anteprima, mapping salvato, controlli sulle ripetizioni, riconciliazione e analisi interne. I flussi locali già implementati permettono di provare questa esperienza con dati inventati. Un mapping generico non certifica il supporto di una banca o di qualsiasi formato. La sperimentazione di file reali e il lancio commerciale richiedono completamento e verifica dei requisiti ancora aperti.

| Fase | Gratis | Plus e finanziamento | Impegno di cassa |
| --- | --- | --- | --- |
| Oggi | Prototipo locale interamente gratuito, senza scadenza; conti manuali e import nei formati implementati | Nessuna vendita, nessun collegamento reale | Nessun nuovo contratto di servizio; dispositivo, energia e lavoro già disponibili |
| Prima offerta commerciale | Base gratuita permanente, correzioni/regole, privacy, storico conservato ed export/cancellazione | Un solo piano per comodità effettivamente consegnate; acquisto esplicito dopo billing e sicurezza pronti | Solo spese quantificate e coperte; nessun incasso per promettere banche non consegnate |
| Banche reali | Base manuale/import gratuita; nessuna promessa di AIS gratuito a tutti | Collegamenti supportati nel piano finanziato, attivati dopo contratto, consenso, implementazione e riserva | Incassi disponibili coprono avviamento e l'intero impegno contrattuale; niente previsioni di vendita usate come cassa |
| Crescita | Eventuale quota AIS gratuita finanziata e misurata, senza cambiare retroattivamente promesse | Provider negoziato sulla fattura effettiva; secondo provider solo per lacune specifiche | Ulteriori servizi soltanto con contributo positivo e copertura degli obblighi |

Gratis non è una prova che scade e non richiede una carta. La chiusura della beta non diventa un addebito. L'accesso ai dati, la correttezza, le correzioni, la sicurezza e i diritti non vengono utilizzati per forzare l'acquisto. Nessun piano Lifetime con connettività bancaria viene promesso: un incasso unico non elimina le spese degli anni successivi.

## Applicazione concreta

- `tools/bootstrap/policy.json`: investimento iniziale e budget dei servizi esterni a zero; nessuna scadenza Gratis; checkout, banche reali e inferenza esterna disattivati nel workflow bootstrap.
- `pnpm dev:zero`: build locale e due processi, API e Expo web, su porte separate; PGlite locale, provider sintetico, ambiente senza chiavi ereditate, Expo offline. Nessuna nuova dipendenza o servizio acquistato. Il sito Next e le altre sessioni rimangono separati.
- `pnpm economics:zero`: prezzi futuri testabili, ricavo riconosciuto, commissioni/IVA, costi noti e sconosciuti, riserva di cassa e condizioni per l'espansione bancaria. Non attiva servizi.
- Pagina `/piani` nel sito Next: spiega Gratis senza scadenza e automazione futura; nessun pulsante di acquisto o collegamento bancario disponibile.
- Le precedenti analisi restano consultabili come sensibilità storiche, con riferimenti alla decisione attuale.

Queste impostazioni governano gli strumenti bootstrap, non sostituiscono il sistema globale di entitlements/runtime dell'API. L'applicazione mantiene il confine locale sintetico e i flussi esistenti. Non costituiscono un rilascio pubblico, una licenza o una verifica di affidabilità su banche reali.

## Ricavi e prezzi

Ipotesi da testare per Plus dopo aver consegnato i benefici: **€6,99/mese oppure €69,99/anno**, IVA inclusa nello scenario italiano. Pagamento annuale anticipato di dodici mesi, termini chiari e nessun Lifetime. Non è un'offerta attualmente acquistabile. Il prezzo dell'automazione dovrà essere verificato insieme al costo di servirla e alla domanda reale; il piano gratuito non scade.

Il canale iniziale candidato è web/browser per evitare il costo iniziale dei programmi store e ulteriori integrazioni. Prima del checkout servono merchant operativo, fiscalità, condizioni, ricevute, accesso derivato da pagamenti verificati e gestione di errori, rimborsi e cancellazione. Nessun pagamento reale viene aperto da questa modifica.

Con carte standard SEE, la pagina Stripe Italia dichiara **1,5% + €0,25** per pagamento. Stripe Billing a consumo aggiunge **0,7%** del volume Billing. Il modello li include entrambi: circa **€5,33** netti per pagamento mensile o **€55,58** per pagamento annuale, dopo IVA 22% e tali commissioni, prima degli altri costi. L'annuale riconosce circa **€4,63/mese** e incassa una sola commissione fissa; l'incasso anticipato resta soggetto agli obblighi di servizio. Altre carte, contestazioni, conversioni, tax tooling e servizi possono costare diversamente.

Un pass di dodici mesi senza rinnovo automatico potrebbe evitare Stripe Billing se effettivamente venduto come pagamento una tantum: risparmierebbe circa €0,49 per acquisto annuale alle ipotesi indicate. È una scelta da confrontare con il lavoro di rinnovo e la retention, non una ragione per costruire un motore di billing proprietario. Il modello iniziale conserva lo 0,7% per evitare di sovrastimare il margine.

Nessuna conversione, rinnovo o fattura inesistente viene trattata come ricavo provato. Un'eventuale vendita futura deve riguardare un beneficio disponibile, non finanziare una promessa indefinita di collegamento.

## Dove evitare spese

| Voce | Scelta iniziale | Quando rivalutarla |
| --- | --- | --- |
| Aggregazione bancaria | Nessun contratto nel bootstrap; import scelto dall'utente | Preventivo italiano completo, produzione pronta e cassa raccolta sufficiente |
| Licenza AISP propria | Non avviarla | Risparmio totale dimostrato dopo governance, assicurazione, certificati e manutenzione |
| Categorie/ricorrenze acquistate | Motori e correzioni interne | Qualità aggiuntiva misurata che ripaga il servizio |
| LLM/OCR per movimento | Nessuna chiamata esterna | Caso d'uso specifico e finanziato; costi e privacy verificati |
| Microservizi e nuovi database/cache | Backend modulare e database esistente | Misurazioni di carico che giustificano la complessità |
| App store e build cloud | Prima browser e build locali | Domanda nativa e ricavi che coprono costi verificati |
| Pubblicità a pagamento/referral remunerati | Budget zero; ricerca e diffusione organica | CAC e contribuzione misurati, finanziamento disponibile |
| Lifetime e AIS gratuito universale | Nessuna promessa | Solo dopo costo e riserva di servizio dimostrati |

Ridurre le chiamate aiuta carico e limiti, ma non elimina una fattura mensile per utente o conto. Creare il profilo bancario soltanto al primo collegamento reale, usare un'identità per la persona e non mantenere doppie connessioni indiscriminate. Le sospensioni tecniche non equivalgono alla cessazione della fatturazione. Anche un contratto senza utenti può avere un minimo mensile.

## Il riferimento Wallet

Wallet by BudgetBakers offre una base gratuita manuale e sincronizzazione bancaria Premium. BudgetBakers dichiara licenza AISP della banca centrale ceca, con passaporto SEE; nei termini AIS utilizza collegamenti propri o fornitori tecnici, tra cui Salt Edge. Offre inoltre API B2B. I suoi costi, condizioni all'ingrosso e margini non sono pubblici.

È un modello da cui imparare: gratuità utile, comodità a pagamento, controllo del motore. Il suo Lifetime non prova che la connettività abbia costo zero o che sia sostenibile per Lilleri. Aggiungiamo BudgetBakers alla futura richiesta di preventivi, senza contattarlo né assumere la sua API gratuita.

## Hosting e costi ancora aperti

Il prototipo attuale non è un backend pubblico pronto al deployment. **Zero nuovo canone per validarlo in locale** è realizzabile con dispositivo e connessione già disponibili; zero costo totale per un'impresa commerciale non è dimostrato. Fiscalità, amministrazione, supporto, lavoro, sicurezza operativa e infrastruttura di produzione devono restare visibili.

Cloudflare offre hosting statico e quote gratuite: candidati per una pagina pubblica o una futura architettura compatibile, non un sostituto immediato del Fastify/PostgreSQL attuale. Workers Free dichiara 100.000 richieste/giorno e 10 ms CPU per richiesta; i limiti richiedono una valutazione. Non riscriviamo l'app per inseguire un piano gratis. Vercel Hobby è limitato all'uso personale non commerciale e non viene scelto come hosting gratuito dell'impresa. Crediti e trial a scadenza non diventano costi zero permanenti.

## Criterio di espansione

La riserva minima del modello è di dodici mesi, estesa all'intero impegno se il contratto dura più a lungo. Considera setup, fatture realmente da pagare, costi ricorrenti e una riserva rimborsi ipotetica del 10%. Richiede contributo mensile positivo, costi sconosciuti risolti e cassa effettiva sufficiente, dopo le altre obbligazioni. La fattura deve comprendere tutti gli utenti fatturabili, minimi, licenza e add-on, non soltanto gli utenti paganti.

Anche uno scenario idoneo produce soltanto una valutazione locale. Non autentica il preventivo, le evidenze, il conto corrente o la conformità; non apre banche o checkout. Con cassa zero, il risultato attuale è correttamente bloccato per i servizi a pagamento.

## Fonti primarie consultate il 2026-10-03

- [finAPI, listino cumulativo e condizioni di fatturazione](https://www.finapi.io/en/prices/).
- [finAPI, copertura europea attraverso partner](https://documentation.finapi.io/access/european-coverage-together-with-partner).
- [Enable Banking, prezzi per conti acceduti e contratto](https://enablebanking.com/docs/faq).
- [Banca d'Italia, FAQ AIS, quarta parte e requisiti](https://www.bancaditalia.it/compiti/vigilanza/accesso-mercato/istituti-pagamento/faq-istituti-pagamento/index.html).
- [Stripe Italia, Payments](https://stripe.com/it/pricing) e [Billing](https://stripe.com/it/billing/pricing).
- [Cloudflare, Developer Platform](https://www.cloudflare.com/plans/developer-platform/).
- [Vercel, limitazioni Hobby](https://vercel.com/docs/plans/hobby).
- [Wallet, Gratis e Premium](https://budgetbakers.com/en/products/wallet/), [termini AIS del 2026-04-01](https://budgetbakers.com/legal/pdfs/ais-terms.pdf), [Bank Sync Premium](https://support.budgetbakers.com/hc/en-us/articles/7150530312722-I-cannot-connect-my-bank-account) e [API per sviluppatori](https://budgetbakers.com/en/solutions/developers/).
