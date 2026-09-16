# PALO x ANS: assessment revisionato e criteri di qualificazione

Nota di archivio: questo documento descrive lo snapshot precedente al commit di integrazione. Percorsi locali e punteggiatura sono stati adattati per il repository; i report originari restano archiviati localmente. Nessun aggiornamento del sito è implicato da questa copia.
Revisione R1, 16 settembre 2026. Oggetto: bridge sperimentale ANS e modifiche correlate al runtime PALO.

**Valutazione:** le evidenze disponibili sostengono il funzionamento del profilo offline negli scenari testati e la separazione fra identità esterna, appartenenza aziendale, delega e decisione di policy. Il progetto può proseguire con la preparazione di un collaudo esterno controllato. La qualifica produttiva rimane aperta per il deployment da definire.

Questo documento revisiona il report fornito dall'utente (allegato originario conservato localmente). Corregge le conclusioni e aggiunge criteri di accettazione; non modifica l'implementazione e non costituisce un audit di sicurezza indipendente. La revisione è svolta nello stesso contesto che ha prodotto l'integrazione.

## 1. Perimetro e tracciabilità

| Elemento | Riferimento |
|---|---|
| Copia di lavoro | `repository` |
| Branch | `feat/ans-governance-bridge` |
| Commit di base | `a9b258d01b3c169c142f44b4c6fc175cecb681f6` |
| Modifiche rispetto alla base | 18 file, 884 righe aggiunte, 3 eliminate; modifiche non ancora in un commit |
| SDK ANS | `v0.1.18-0.20260915151333-1b9f6ec5588b` |
| Revisione SDK | `1b9f6ec5588b3b38918ba7b99b9f30fe65535695` |
| Patch esaminata, SHA-256 | `5fe9cd759f252810652e11e35d576e19f91f506dd7172a254bfe3da044a71b33` |
| Ambito della demo | Credenziali e target sintetici, SDK reale, esecuzione offline, Action Claim 1.3 |

Il commit di base da solo non identifica l'integrazione: occorrono anche la patch e gli hash dei sorgenti. La copia isolata era stata utilizzata perché alcuni file e metadati Git del workspace originale risultavano illeggibili.

Riferimenti locali:

- [Analisi strategica dei 24 scenari](analisi-palo-ans.md).
- [Resoconto dell'implementazione e dei controlli originari](stato-integrazione.md).
- [Manifest originario](verification-manifest.json), patch originale conservata nell'archivio locale, [controlli eseguiti per questa revisione](assessment-review-checks.json).

I documenti e il manifest originari restano conservati come evidenza della precedente esecuzione. Questo assessment prevale sulle loro eventuali formulazioni generiche riguardo a freschezza, indipendenza o maturità.

## 2. Che cosa è verificato e con quale evidenza

| Evidenza | Risultato disponibile | Forza e limite |
|---|---|---|
| Controlli di questa revisione | 18 hash dei sorgenti e 5 hash degli artefatti corrispondono al manifest; `git diff --check` passa | Conferma coerenza con lo snapshot registrato; gli hash locali non sono una certificazione di provenienza |
| Validazione originaria del runtime | 118 test JavaScript passati, zero saltati, più 3 test Python | Risultati registrati nel log; i 21 test ANS sono inclusi nei 118 |
| Suite ANS dedicata originaria | 21 test passati, zero saltati | Copre i casi esplicitamente implementati nella suite |
| Demo originaria | 8 scenari con esito atteso | Dimostrazione selezionata del ciclo operativo; distinta dalla suite completa |
| Build, analisi Go e policy | Il resoconto originario registra build, verifica moduli, `go vet`, compilazione e test OPA | Non rieseguiti per questa revisione documentale |
| Riesecuzione descritta nel report allegato | L'autore dichiara gli stessi conteggi e lettura del codice | Nell'allegato mancano i log della nuova esecuzione e la prova di una ricompilazione pulita dei verifier |
| Workflow GitHub | Configurazione presente nel codice | Una configurazione letta non equivale a una CI eseguita |

Fonti: [log originario](validation-agentic.txt), [risultati demo](demo-result.json), [suite ANS](../../packages/palo-mcp-server/ans-bridge.test.js), [workflow](../../.github/workflows/ans-bridge-ci.yml).

Non viene attribuita a questa revisione una nuova esecuzione della suite. Per una riproduzione esterna occorre registrare snapshot, ambiente, build dei binari, comandi, codici di uscita e log. La ripetizione dei test esistenti aumenta la fiducia nella riproducibilità; una valutazione indipendente della sicurezza richiede anche ipotesi d'attacco e prove nuove.

## 3. Valutazione tecnica proporzionata al perimetro

### Verifica dell'identità ANS

Il verifier usa una revisione precisa dell'SDK ufficiale, con root e audience configurate dall'operatore. Verifica la ricevuta firmata, lo status ACTIVE, il legame con il certificato e la prova DPoP associata a metodo, URL e contenuto della richiesta. Lo status con `iat` futuro viene rifiutato.

La freschezza dello status è **300 secondi per impostazione predefinita**, configurabile nell'intervallo **1-3.600 secondi**. La validità effettiva può essere più breve: è limitata anche da scadenza dello status, prova e certificato. Il bridge aggiunge i limiti di binding, delega e claim; il runtime applica anche il TTL della capability. I 300 secondi non sono uno SLA misurato di propagazione delle revoche. [Verifier](../../packages/palo-ans-verifier/cmd/palo-ans-verify/main.go#L32).

La risposta dichiara `checkpointVerified:false`. La firma della ricevuta non dimostra da sola l'inclusione rispetto a un checkpoint autenticato indipendentemente. Questo limite è esplicito anche nel [codice SDK della ricevuta](https://github.com/agentnameservice/ans-sdk-go/blob/1b9f6ec5588b3b38918ba7b99b9f30fe65535695/verify/scitt/receipt.go). Non risultano prove sufficienti per attribuire a questo bridge un profilo Gold o una verifica completa della trasparenza.

### Binding aziendale e delega

Il bridge associa l'identità provata a tenant, agente e istanza tramite un binding fornito dall'operatore. Richiede un verificatore separato della delega; nella demo questo verifica un grant aziendale sintetico firmato. I permessi non derivano automaticamente dall'identità ANS. È una distinzione coerente con il [contratto di autenticazione dell'SDK](https://github.com/agentnameservice/ans-sdk-go/blob/1b9f6ec5588b3b38918ba7b99b9f30fe65535695/pop/caller.go).

La cache conserva il risultato crittografico relativo a claim e presentazione esatti. Ogni successiva verifica ricontrolla binding e delega; confronta nuovamente il binding dopo le operazioni asincrone. Con cache valida, il processo Go non viene richiamato. Anche un suo nuovo richiamo verificherebbe i token forniti offline: da solo non acquisirebbe una revoca remota. [Bridge](../../packages/palo-mcp-server/ans-bridge.js#L55).

### Autorizzazione ed esecuzione

Le modifiche al runtime legano la verifica al digest del claim, ne registrano la validità e limitano la capability. Dopo la lettura asincrona dello stato precedente, viene verificata nuovamente l'autorità. Il test dimostra che una revoca del binding locale intervenuta durante quella lettura blocca l'invocazione dell'executor.

Questo riduce la finestra osservata fra controllo e uso dell'autorizzazione. Rimangono da qualificare propagazione remota, concorrenza, cambi dello stato del target e distanza temporale fra controllo ed effetto esterno. La prova non stabilisce l'eliminazione generale delle condizioni TOCTOU. [Percorso di esecuzione](../../packages/palo-mcp-server/core.js#L1135).

Il requisito `identityPolicy.requireIdentityBoundClaims` è abilitato nella demo e impedisce il downgrade legacy testato. Deve diventare un vincolo verificato del deployment ANS: configurare soltanto l'adapter non basta a imporlo in tutti i percorsi di ingresso.

### Test e distribuzione

La suite comprende esecuzione consentita, diniego di policy, prove alterate, identità copiata, status non ammessi, replay, mismatch di tenant/versione, delega falsa, revoche locali ed esiti errati o non osservabili. La copertura riguarda questi casi; non dimostra che ogni aggiramento sia escluso.

Il pin delle dipendenze e i checksum favoriscono la riproducibilità. Restano distinti sicurezza delle dipendenze, provenienza dei binari, protezione della configurazione e distribuzione. Il workflow usa anche tag di GitHub Actions e `ubuntu-latest`: non è una definizione integralmente immutabile dell'ambiente.

## 4. Riesame delle quattro osservazioni aggiuntive

| Osservazione | Giudizio rivisto | Conseguenza operativa |
|---|---|---|
| Replay dopo timeout o riavvio | La cache Go è volatile. Il timeout chiude il processo e il client corrente rimane chiuso; non esiste un riavvio automatico nel bridge. Un nuovo processo perde i nonce memorizzati | Verificare il replay dopo ricostruzione e su più repliche. Distinguere riaccettazione della prova e doppio effetto: intervengono anche stato persistito e idempotenza |
| Errori poco osservabili | Il `catch` generalizza le eccezioni; diversi dinieghi espliciti conservano già un motivo. Lo stderr del processo è ignorato | Introdurre categorie stabili, correlazione e metriche; evitare proof, grant e chiavi nei log |
| Integrità del binario | Il path assoluto limita la scelta dell'eseguibile, ma non ne dimostra provenienza o integrità | Proteggere insieme binario, bridge, configurazione e manifest di rilascio. Un hash modificabile dallo stesso attaccante offre una garanzia limitata |
| Verifica con cache calda | Binding e delega sono ricontrollati; non viene acquisito un nuovo stato ANS remoto | Dichiarare la politica di freschezza e integrare eventi o riconciliazione autenticati. Testare invalidazione e indisponibilità |

Non è giustificato raccomandare in generale di lasciare vivo il verifier dopo un timeout: l'arresto può contenere un processo bloccato. Occorre progettare insieme timeout, cancellazione, recupero e persistenza del replay. Il costo dipende dalla topologia, in particolare da atomicità e guasti del deposito condiviso; non è stimato in questa revisione.

## 5. Registro dei gap con responsabilità e prove di accettazione

Tutti i gap elencati sono **aperti rispetto alla qualifica indicata**, anche quando esiste una mitigazione nella demo. Le responsabilità sono proposte per ruolo; non costituiscono assegnazioni a persone o impegni di terzi.

Le soglie sono: **Q1**, collaudo esterno su ambiente autorizzato e sintetico; **Q2**, pilota aziendale circoscritto su un target reale; **Q3**, produzione per un deployment dichiarato. **P0** indica una condizione bloccante per la soglia specificata; **P1** indica lavoro prioritario con eventuale esclusione motivata nel perimetro. Non sono scadenze di calendario.

### Collaudo esterno

| ID / priorità / soglia | Gap e impatto | Responsabile proposto | Prova di accettazione e documento richiesto |
|---|---|---|---|
| G01 / P0 / Q1 | Profilo ospitato non collaudato: interoperabilità GoDaddy ancora non dimostrata | Responsabile integrazione ANS | Concordare endpoint autorizzato, revisione, root e profilo; eseguire casi positivi e negativi applicabili con artefatti reali e modifiche controllate. Registrare differenze rispetto al profilo offline, esiti e limiti del servizio |
| G02 / P0 / Q1 | Mancanza di un pacchetto completo della nuova riproduzione dichiarata | Responsabile build e QA | Ricompilare dallo snapshot esatto in ambiente pulito; registrare toolchain, dipendenze, hash sorgenti/binari, comandi, exit code e log. Suite ANS obbligatoria senza skip; suite runtime e demo con esiti verificati |
| G03 / P1 / Q1 | Diagnostica insufficiente per distinguere diniego e guasto | Responsabile runtime | Iniettare prova invalida, status scaduto, binding assente, timeout e errore di delega. Ogni caso produce categoria e correlazione; nessun dato segreto compare nei log. Allegare schema eventi ed esempi sanitizzati |

### Pilota aziendale

| ID / priorità / soglia | Gap e impatto | Responsabile proposto | Prova di accettazione e documento richiesto |
|---|---|---|---|
| G04 / P0 / Q2 | Replay non condiviso o persistente: nuove ammissioni dopo riavvio o su altre repliche | Responsabile runtime/storage | Presentare contemporaneamente la stessa proof sul confine di ingresso a due repliche: una sola nuova ammissione. Ripetere dopo riavvio entro validità e dopo guasto del deposito. Le rivalidazioni interne del claim restano distinte dalle nuove richieste. Verificare separatamente l'assenza di doppio effetto |
| G05 / P0 / Q2 | Revoche remote e cache: decisioni potenzialmente obsolete | Responsabile integrazione ANS | Definire prima della prova le soglie di propagazione e massima obsolescenza. Provare revoca, eventi duplicati/fuori ordine, perdita del canale, riavvio del consumer e riconciliazione. Nessuna nuova esecuzione oltre le soglie dichiarate; report con tempi misurati |
| G06 / P0 / Q2 | Rotazione di root e certificati: fiducia obsoleta o interruzioni non gestite | Responsabile sicurezza identità | Provare rollover, scadenza e rimozione di una root, certificato sostituito e replay di prove vecchie con cache calda. La nuova politica di fiducia deve invalidare le ammissioni interessate; conservare procedura e log |
| G07 / P0 / Q2 | Binding e deleghe della demo: persistenza, isolamento e permessi reali da qualificare | Responsabile IAM e tenant | Provare aggiornamenti concorrenti, revoca del grant, tenant errato, scope e audience errati, riavvio e tentativi di modifica non autorizzati. Provare il downgrade legacy su ogni ingresso abilitato. Registro persistente e tracciabile delle modifiche |
| G08 / P0 / Q2 | Target aggirabile: il controllo PALO può essere saltato | Responsabile connettore e piattaforma target | Con le credenziali disponibili all'agente, tentare la chiamata diretta al target: deve essere negata. Il percorso governato deve riuscire con privilegi minimi e senza trasferire credenziali del target all'agente. Allegare configurazione e tracce |
| G09 / P0 / Q2 | Concorrenza e distanza fra controllo ed effetto | Responsabile executor e target | Provare modifica concorrente della risorsa, ritardo dopo il controllo, revoca durante l'invocazione e timeout con esito incerto. Definire il punto oltre il quale l'azione non è più arrestabile, usare precondizioni/idempotenza dove supportate e provare riconciliazione senza doppio effetto |
| G10 / P1 / Q2 | Recupero del processo e limiti sotto carico non qualificati | Responsabile runtime/SRE | Iniettare hang, crash, output malformato/eccessivo e saturazione. Le richieste pendenti terminano entro limiti dichiarati; risorse e riavvii sono limitati; il recupero non aggira G04. Allegare risultati e procedura operativa |
| G11 / P0 condizionale / Q2 | Checkpoint indipendente assente | Responsabile sicurezza e profilo ANS | Se il profilo richiede inclusione nel log, confrontare la radice con un checkpoint autenticato; rifiutare firma non attendibile, mismatch e obsolescenza oltre la politica scelta. In alternativa, formalizzare un profilo limitato alla ricevuta firmata, accettarne il rischio e mantenere `checkpointVerified:false`; nessuna qualifica Gold |
| G12 / P0 / Q2 | Confine HTTP/MCP e autenticazione aziendale non collegati al bridge | Responsabile gateway/IAM | Collegare presentazioni a metodo, URL e corpo realmente ricevuti, con tenant e audience determinati dal confine fidato. Se si adotta OAuth DPoP, verificare anche access token, `ath` e `cnf.jkt`. Provare contenuto/token sostituiti, audience errata e instradamenti alternativi |

### Produzione e ampliamenti del profilo

| ID / priorità / soglia | Gap e impatto | Responsabile proposto | Prova di accettazione e documento richiesto |
|---|---|---|---|
| G13 / P0 / Q3 | Distribuzione, custodia chiavi e integrità della configurazione | Responsabile release e sicurezza | Rilasciare artefatti tracciabili da una fonte fidata; impedire la sostituzione non autorizzata di binario, bridge e configurazione. Provare manomissione, rotazione delle chiavi, rollback e indisponibilità del servizio di firma. Il test deve coprire l'intera catena, non solo un hash locale |
| G14 / P0 / Q3 | Disponibilità, persistenza, isolamento e recovery non qualificati | Responsabile SRE e dati | Definire topologia, carico, SLO e obiettivi di ripristino prima delle prove. Eseguire restore, riavvio, perdita del deposito, saturazione e verifiche d'isolamento. Dimostrare coerenza fra esecuzioni, replay, ledger e hold. HA va richiesta secondo il deployment, non presunta universale |
| G15 / P0 / Q3 | Valutazione di sicurezza indipendente mancante | Responsabile sicurezza con revisore distinto dall'implementatore | Threat model del deployment, prove nuove su superfici reali, rilievi tracciati e riesame delle correzioni. I gate produttivi devono valutare evidenze effettive; nessuna semplice rimozione del blocco di admission |
| G16 / P1 / P0 se dichiarato nel prodotto / Q2-Q3 | Data Assurance 1.4 ed export verso Trust Index/partner non collaudati nel bridge | Responsabili Data Assurance e interoperabilità | Per 1.4, provare fitness/disclosure e isolamento sul connettore reale. Per export, ottenere consumo verificato da un'altra implementazione con schema, provenienza, scadenza e revoca. In assenza di prove, queste capacità restano escluse dal profilo qualificato |

Le prove di G04, G05 e G09 misurano oggetti diversi: unicità della presentazione, freschezza dell'autorità e unicità dell'effetto. Superarne una non sostituisce le altre.

## 6. Sequenza decisionale

1. **Preparare Q1:** fissare il profilo supportato e il pacchetto di riproduzione; predisporre la diagnostica. Individuare un endpoint esterno autorizzato e la fonte attendibile delle root. L'esecuzione live non è stata svolta in questa revisione.
2. **Chiudere Q1:** allegare risultati del servizio reale, differenze di compatibilità e limiti residui. Un esito positivo abilita la valutazione del pilota circoscritto.
3. **Preparare Q2:** scegliere un caso d'uso e un target, definire confine d'ingresso e credenziali, chiudere i P0 del pilota. Il profilo del checkpoint deve avere una decisione esplicita, non un'assunzione.
4. **Valutare Q3:** qualificare distribuzione e operazioni per il deployment concreto, con revisione di sicurezza distinta dall'implementazione. Riesaminare i controlli di admission solo dopo che le evidenze richieste sono disponibili.

Il passaggio di soglia va riferito a una revisione, una configurazione e un deployment. Il successo di un endpoint non promuove automaticamente l'intero runtime PALO né tutte le integrazioni. Non si assegna una data di produzione o una stima di costo prima di avere topologia, target e vincoli definiti.

## 7. Correzioni rispetto al report ricevuto

| Formulazione originaria | Revisione adottata |
|---|---|
| Qualità migliore mai raggiunta dal runtime | Rimossa: manca un confronto sistematico con le altre versioni |
| Tutte le dichiarazioni riprodotte indipendentemente | Separati controlli di questa revisione, risultati originari e riesecuzione dichiarata nell'allegato |
| Correttezza crittografica e sicurezza alte | Sostituite con proprietà osservate e limiti delle prove |
| Ogni via di aggiramento coperta | Circoscritta ai casi della suite, senza promessa di esaustività |
| Chiusura della finestra TOCTOU | Riduzione della specifica finestra dimostrata; residui assegnati a G05 e G09 |
| Massimo di freschezza sempre 300 secondi | Default 300, intervallo configurabile 1-3.600; validità effettiva ulteriormente limitata |
| Otto scenari come sottostima dei test | Distinti gli otto scenari dimostrativi dai 21 test ANS inclusi nei 118 JavaScript |
| Ogni errore collassato nel catch | Distinti dinieghi espliciti ed eccezioni generalizzate |
| Meglio non arrestare il verifier al timeout | Decisione subordinata a isolamento, recupero e protezione replay |
| Hash del binario sufficiente per l'integrità | Esteso il requisito a provenienza e protezione dell'intera distribuzione |
| Replay persistente a basso costo | Stima rimossa; atomicità, guasti e numero di repliche sono vincoli da progettare |
| Tutti i gap come blocco indistinto | Associati alla soglia di qualifica e al profilo effettivamente dichiarato |

La proposta strategica resta un adapter interoperabile che collega identità, mandato, decisione ed effetto, con eventuali evidenze consumabili da terzi. La domanda commerciale, l'accettazione da parte dell'ecosistema e il beneficio economico restano ipotesi da validare attraverso il pilota.
