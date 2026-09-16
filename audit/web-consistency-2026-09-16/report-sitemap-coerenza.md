# PALO: verifica Git, pubblicazione, sitemap e coerenza

Nota di archivio: questo documento descrive lo snapshot precedente al commit di integrazione. Percorsi locali e punteggiatura sono stati adattati per il repository; i report originari restano archiviati localmente. Nessun aggiornamento del sito è implicato da questa copia.
Audit del 16 settembre 2026 sul sito pubblico e sulla copia di lavoro ANS.

**Esito:** il sito risponde correttamente e i percorsi verificati si caricano. La pubblicazione non comprende ancora il lavoro ANS; la sitemap omette 62 pagine indicizzabili; i dati PolicyWatcher e il relativo bundle Hub sono diversi fra Hostinger e GitHub Pages. È necessario un aggiornamento coordinato per dichiarare allineati repository, sito e risorse online.

Questo controllo ha prodotto file di audit locali. Non ha modificato sorgenti, creato commit, eseguito push, aggiornato DNS o pubblicato il sito.

## 1. Stato Git e online

| Elemento | Stato verificato |
|---|---|
| Copia ANS | `repository`, branch `feat/ans-governance-bridge` |
| HEAD e `origin/main` dopo fetch | Entrambi `a9b258d01b3c169c142f44b4c6fc175cecb681f6`; nessun commit locale avanti rispetto a main |
| Modifiche ANS | 18 file, 884 inserimenti, 3 eliminazioni; ancora nella working tree |
| Branch ANS remoto | Nessun ref `feat/ans-governance-bridge` restituito dal remoto |
| Report e assessment revisionato | File locali in `Desktop/PALO/deliverables/ans-analysis-2026-09-16`; non aggiunti alla pubblicazione |
| Sito canonico | [paloframework.org](https://paloframework.org/), servito tramite Hostinger CDN; HTML coerente con il `dist` locale della base pubblicata |
| GitHub Pages | [Sito del repository](https://sev7enita.github.io/PALOframework/), pubblicato da workflow; nessun custom domain configurato nel record Pages consultato |
| Release pubblica più recente restituita | `v3.1.0`, pubblicata il 24 agosto 2026; distinta dal successivo aggiornamento dei sorgenti web |
| ANS nel sito | Nessun riferimento testuale ANS nelle 108 pagine HTML esaminate; manifest privo del modulo ANS; i percorsi README ANS non sono pubblicati |

Il workspace originale `Desktop/PALO` continua a non essere riconosciuto come repository Git funzionante. La verifica Git è stata quindi eseguita nella copia isolata. I deploy automatici consultati sono riusciti sulla stessa base `a9b258d`; il loro successo non include le modifiche ANS locali. [Stato Git acquisito](git-status.json), [workflow consultati](github-workflow-status.json).

## 2. Copertura effettiva

| Controllo | Copertura ed esito |
|---|---|
| Sitemap XML | Tutti i 37 URL, senza duplicati, errori HTTP, redirect verso un'altra destinazione o discrepanze canonical rilevate |
| Inventario HTML pubblico | 108 pagine, incluse le 68 viste HTML generate dai Markdown e il Governance Hub |
| Risorse interne | 462 destinazioni uniche, tutte con risposta HTTP 200; GET per HTML e documenti di controllo, HEAD per le altre risorse con fallback limitato |
| Collegamenti e risorse nell'HTML | 5.779 riferimenti interni controllati; nessun target irraggiungibile o frammento statico mancante rilevato |
| Navigabilità della sitemap | Tutte le 37 pagine risultano raggiungibili dalla homepage nel grafo dei link statici |
| Titoli, descrizioni e canonical | Nessun titolo o description mancante, nessun duplicato tra pagine rilevato, nessun JSON-LD sintatticamente invalido nei documenti analizzati |
| Rendering browser | 37 URL sitemap su desktop e 7 pagine rappresentative su mobile: 44 navigazioni riuscite, zero errori JavaScript, immagini rotte o overflow orizzontale rilevati |
| Collegamenti esterni | 197 URL con varianti di frammento, 191 destinazioni HTTP distinte: 182 risposte 200, un 404 confermato, 8 risultati non conclusivi |
| Coerenza con build locale | Le 108 risposte HTML di Hostinger coincidono byte per byte con il `dist` locale confrontato |
| Validazione sorgenti | `npm run validate` passato: 24 test nei tre gruppi eseguiti, controlli semantici, contratti, link e metadata previsti dal validatore |
| Validazione build disponibile | `node scripts/validate.mjs --root dist --built` passato su 108 HTML; non è stata eseguita una nuova build |

Le sette pagine mobile sono homepage, Documentation Library, Platform Map, Capability Matrix, Governance Hub, guida Full-Cycle Assurance e onboarding Theory-to-Practice. I test browser riguardano caricamento e stato iniziale: non sono collaudi completi di form, autenticazione, export o operazioni del runtime. Le risposte esterne 403, 999, 202 e il timeout sono mantenuti distinti dai link certamente interrotti.

## 3. Problemi confermati e correzioni richieste

### P1: PolicyWatcher non è sincronizzato sul dominio canonico

| Campo al momento del controllo | Hostinger / paloframework.org | GitHub Pages |
|---|---|---|
| Stato trasporto | `not-synchronized` | `healthy` |
| Data interna del registro | 26 agosto 2026 | 16 settembre 2026, 06:06:22 UTC |
| Ultima sincronizzazione riuscita | Assente | 16 settembre 2026, 06:06:22 UTC |
| Segnali attivi | 0 | 53 |
| Pagine della raccolta attraversate | 0 | 3 |
| Bundle JavaScript del Hub | `index-CIK1n5iz.js` | `index-CUam7Stf.js` |

Il confronto di homepage, sitemap e manifest non rivela questo problema: quei tre oggetti coincidono. Il workflow di sincronizzazione pubblica su GitHub Pages; nel workflow esaminato non è presente una distribuzione su Hostinger. Inoltre il Hub importa il registro durante la build: copiare soltanto il JSON non assicura l'aggiornamento dell'interfaccia già compilata.

**Correzione:** produrre un unico artefatto validato, comprendente registro e bundle Hub, e distribuirlo sulle origini che devono essere equivalenti; oppure dichiarare un'unica origine autorevole e gestire esplicitamente l'altra. La verifica dopo la pubblicazione deve confrontare digest, stato del trasporto e bundle del Hub, oltre alla homepage. Non occorre cambiare il dominio durante questo audit.

**Criterio di chiusura:** registro e bundle atteso presenti sul dominio canonico, stessa raccolta validata per la release considerata, sincronizzazioni successive propagate secondo un intervallo dichiarato. Il dato osservato resta un segnale da sottoporre a revisione umana, non una decisione PALO.

Evidenza: [confronto delle due origini](origin-comparison.json); [registro canonico](https://paloframework.org/data/integrations/policywatcher-signal-registry.json); [registro GitHub Pages](https://sev7enita.github.io/PALOframework/data/integrations/policywatcher-signal-registry.json); [workflow di sincronizzazione](../../.github/workflows/sync-policywatcher-signals.yml).

### P1 di completamento: ANS non è ancora una risorsa pubblicata

Il lavoro ANS verificato e il report revisionato non sono presenti in un commit del remoto né nel sito. L'assenza non è un link rotto della sitemap attuale: il nuovo materiale non è ancora collegato. È però un gap rispetto all'aspettativa di avere aggiornato le risorse online.

**Correzione:** preparare una guida pubblica ANS con perimetro sperimentale esplicito, separando i documenti pubblicabili dai log locali e dai percorsi della macchina. Collegarla da Documentation Library, percorso di integrazione PALO-AI, changelog e sitemap; aggiornare gli eventuali metadata del modulo senza alterare la qualifica produttiva del runtime. Applicare l'allowlist di pubblicazione anche ai nuovi file.

**Criterio di chiusura:** commit identificabile, CI completata sulla revisione corretta, guida raggiungibile sul dominio canonico e riferimenti online coerenti con SDK, test e gap dichiarati. Un push su un branch e un deploy su GitHub Pages, da soli, non provano l'aggiornamento Hostinger.

### P2: la sitemap copre solo 37 delle 99 pagine indicizzabili

Le 108 pagine controllate si dividono in 99 pagine indicizzabili con canonical verso se stesse e 9 pagine escluse dall'indice o canonicalizzate altrove. Delle 99, solo 37 sono nella sitemap; **62 mancano**.

Esempi rilevanti: guida Full-Cycle Assurance, Data Assurance, profilo Knowledge Reader, integrazioni Knowledge Copilot, procedura MCP Host Qualification, stato Governance Hub, changelog e runbook della release. Sono collegate dal sito: l'omissione non dimostra che i motori non le indicizzino, ma rende incompleto l'inventario dichiarato.

**Correzione:** generare la sitemap dall'inventario pubblico e dalla politica di indicizzazione; includere le pagine correnti con canonical proprio, mantenendo fuori gli esclusi intenzionali. Per documenti che non si vogliono indicizzare, rendere esplicita la scelta nei metadata. Utilizzare date di modifica attendibili.

**Criterio di chiusura:** nessuna pagina intenzionalmente indicizzabile priva di voce nella sitemap; nessun `noindex`, alias, duplicato o percorso non pubblicato incluso. Sul perimetro attuale, includere tutte le pagine indicizzabili porterebbe le voci a 99; il numero va ricalcolato se si pubblicano nuovi documenti ANS.

Evidenza: [elenco completo dei 62 URL](missing-sitemap-urls.txt), [inventario delle 108 pagine](page-inventory.csv).

### P2: il validatore non intercetta la sitemap incompleta

Le validazioni sorgente e `dist` passano anche in presenza delle 62 omissioni. Il codice verifica che ogni voce della sitemap punti a una risorsa pubblicata e abbia canonical coerente, ma non impone il controllo inverso sulle pagine indicizzabili assenti. [Controllo attuale](../../scripts/validate.mjs#L609).

**Correzione:** confrontare l'insieme atteso delle pagine indicizzabili con l'insieme sitemap e documentare le eccezioni. Tenere distinti i controlli dell'artefatto locale dai controlli sulle origini effettivamente pubblicate.

**Criterio di chiusura:** il validatore deve fallire se una pagina corrente viene accidentalmente esclusa, se viene aggiunto un `noindex`, oppure se un canonical si allontana dall'URL atteso. Il confronto fra origini deve rilevare anche registri e bundle obsoleti.

### P2: un collegamento n8n restituisce 404

La [guida n8n PALO](https://paloframework.org/docs/palo-ai-n8n-governance-control-plane.html) contiene il vecchio collegamento `https://docs.n8n.io/sustainable-use-license/`, che ha restituito 404 sia nella verifica iniziale sia con GET di controllo.

L'[indice ufficiale n8n](https://docs.n8n.io/llms.txt) indica ora [Sustainable Use License](https://docs.n8n.io/n8n-community-license/sustainable-use-license.md). Il nuovo URL Markdown ha restituito 200; il corrispondente percorso HTML ha reindirizzato alla sezione Community License con risposta 200. Il presente audit riguarda il collegamento, non un'interpretazione delle condizioni di licenza.

**Correzione:** aggiornare il riferimento nel Markdown sorgente e ricostruire la vista HTML. **Criterio di chiusura:** dalla guida pubblicata il link porta alla fonte ufficiale corretta e accessibile. [Riga sorgente](../../docs/palo-ai-n8n-governance-control-plane.md#L241).

### P2: quattro guide italiane hanno lingua HTML inglese

Il renderer emette `lang="en"` anche per contenuti in italiano, senza una dichiarazione di lingua sull'articolo. Confermati:

- [State-of-the-Art Radar](https://paloframework.org/docs/palo-ai-state-of-the-art-radar-2026-08.html).
- [Integrazioni Knowledge Copilot](https://paloframework.org/docs/palo-knowledge-copilot-integrations.html).
- [MCP Host Qualification](https://paloframework.org/docs/palo-mcp-host-qualification.html).
- [Esempi Knowledge Copilot](https://paloframework.org/examples/agentic-interface/knowledge-copilot/README.html).

**Correzione:** introdurre la lingua del documento nei metadata e applicarla all'articolo; se l'intera pagina è italiana, usare anche la lingua corretta sulla radice HTML. Mantenere marcati gli eventuali elementi dell'interfaccia in un'altra lingua. Non dedurre definitivamente la lingua con una semplice euristica lessicale.

**Criterio di chiusura:** la lingua dichiarata corrisponde al contenuto reso e viene verificata nell'output generato. L'audit non attribuisce una certificazione o una valutazione WCAG complessiva.

## 4. Segnalazioni automatiche ridimensionate dal controllo browser

Il crawler statico ha segnalato 70 anomalie nel conteggio degli H1: 68 documenti generati con due H1, la pagina di onboarding con due H1 e il Hub senza H1 nell'HTML iniziale.

La verifica successiva ha mostrato che il template nasconde gli H1 del corpo Markdown tramite `.palo-doc-content h1 { display: none; }`; l'onboarding mostra una sola vista alla volta; il Hub crea il titolo tramite JavaScript. **Tutte le 44 navigazioni browser controllate mostrano esattamente un H1 visibile.** Non è confermata una duplicazione visiva del titolo né un guasto del Hub. L'eventuale eliminazione degli H1 nascosti è una pulizia del markup da valutare preservando gli anchor, non un blocco di pubblicazione dimostrato.

Anche i valori iniziali pari a zero della Capability Matrix sono placeholder: nel browser vengono caricati correttamente 5 capability implementate, 28 prototipi, 7 specificate e 0 pronte per la produzione, su desktop e mobile.

## 5. Coerenza dei contenuti e dei limiti di maturità

Le pagine principali, Platform Map, Capability Matrix, Production Readiness e manifest mantengono distinti PALO Web 3.1, PALO-AM 2.0 e PALO-AI 2.7 developer preview. Il Knowledge Reader ha un profilo production-candidate separato: questa distinzione è presente e non deve essere cancellata per uniformare superficialmente le etichette.

La pagina Release Verification dichiara un baseline del 25 agosto 2026. Non va presentata come attestazione della futura integrazione ANS del 16 settembre: serve un record separato o una nuova sezione legata alla revisione realmente pubblicata. I metadati possono restare su una versione di piattaforma invariata purché le date e lo stato del componente ANS siano espliciti.

Le pagine storiche o sostituite sono marcate `noindex` e sono correttamente escluse dalla sitemap controllata. Il sito rimane coerente nel non attribuire al runtime operativo una qualifica produttiva ottenuta tramite la sola documentazione.

Questo è un controllo trasversale della pubblicazione, della navigazione e delle dichiarazioni di versione/maturità. Non è una nuova verifica giuridica di ogni frase, una revisione scientifica delle fonti esterne o un collaudo autenticato dei servizi operativi.

## 6. Risultati esterni non conclusivi

| Esito | Destinazioni | Interpretazione |
|---|---|---|
| 202 | Tre URL EUR-Lex | Il server ha risposto, ma HEAD non dimostra che la pagina finale sia fruibile; mantenere verifica separata |
| 403 | BCG, ISO 42001, ISO 42005 | Accesso automatizzato rifiutato; non sufficiente per dichiarare il link interrotto |
| 999 | Profilo LinkedIn del creatore | Risposta di blocco; non classificata come link rotto |
| Timeout | Pagina McKinsey sui trend tecnologici | Disponibilità non verificata in questa esecuzione |

Il report conserva tutti gli URL e gli esiti nel [registro dei collegamenti esterni](external-links-audit.json).

## 7. Ordine di correzione e chiusura dell'aggiornamento

1. Preparare il commit dell'integrazione e una versione pubblicabile della documentazione ANS, con revisione delle sole modifiche previste.
2. Correggere sitemap, controllo di completezza, collegamento n8n e metadata di lingua; ricostruire l'artefatto pubblico.
3. Allineare la distribuzione di registro PolicyWatcher e Hub fra le origini previste, mantenendo le verifiche della raccolta.
4. Eseguire le validazioni della release e registrare commit, hash del pacchetto e risultati. Il verde della CI su una base precedente non vale per quella nuova.
5. Dopo il deploy, ricontrollare sitemap completa, guida ANS, manifest, bundle Hub e registro sul dominio canonico; conservare il confronto con l'artefatto pubblicato.

## 8. Evidenze riproducibili

- [Audit HTTP e HTML completo](sitemap-audit.json).
- [Inventario navigabile come CSV](page-inventory.csv).
- [Riferimenti interni e frammenti](internal-references.json).
- [Risultati delle 44 navigazioni browser](browser-audit.json).
- [Confronto Hostinger/GitHub Pages](origin-comparison.json).
- [Validazione sorgenti](validation-source.txt) e [validazione dist](validation-dist.txt).
- Script del controllo HTTP: [audit_site.py](audit_site.py); [collegamenti esterni](audit_external.py); [script browser](browser-audit-script.js).

I risultati rappresentano il momento del controllo. Le raccolte e le risorse esterne possono cambiare indipendentemente dal commit della piattaforma.
