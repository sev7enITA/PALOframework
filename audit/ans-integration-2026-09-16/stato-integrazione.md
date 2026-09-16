# PALO + ANS: integrazione e demo verificata

Nota di archivio: questo documento descrive lo snapshot precedente al commit di integrazione. Percorsi locali e punteggiatura sono stati adattati per il repository; i report originari restano archiviati localmente. Nessun aggiornamento del sito è implicato da questa copia.
16 settembre 2026. Perimetro scelto: prima integrazione ANS e demo verificata, poi produzione.

**Esito:** implementato un bridge sperimentale fra il runtime PALO e l'SDK ufficiale ANS. La demo esegue verifiche crittografiche reali su identità, ricevute, status e prove sintetiche locali. Tutti gli otto scenari dimostrativi hanno prodotto l'esito atteso. Non è ancora un'integrazione collaudata contro il servizio GoDaddy ospitato.

## Materiali

- [Analisi completa: 24 scenari, impatti, canali, benefici, malus e gap](analisi-palo-ans.md).
- [Codice e istruzioni della demo](../../examples/agentic-interface/integrations/ans/README.md).
- [Risultati degli otto scenari](demo-result.json).
- [Log della validazione completa](validation-agentic.txt).
- Patch originale dei sorgenti conservata nell'archivio locale; il codice è incluso nel commit che contiene questo documento.
- [Manifest con hash dei file modificati](verification-manifest.json).

Il codice è nella copia isolata `repository`, branch `feat/ans-governance-bridge`, sul commit pubblico PALO `a9b258d01b3c169c142f44b4c6fc175cecb681f6`. Alcuni file e metadati Git del workspace Desktop/PALO restituivano errori di disponibilità/autenticazione o timeout: non è stato possibile considerarli una base Git affidabile. Le modifiche sono quindi nella copia isolata; questa cartella contiene analisi ed export applicabile alla base dichiarata. Nessun commit, push, deploy, cambio DNS o registrazione pubblica è stato eseguito.

## Cosa cambia concretamente

| Componente | Modifica | Risultato verificato |
|---|---|---|
| Verifier Go | SDK ANS bloccato alla revisione `1b9f6ec5588b3b38918ba7b99b9f30fe65535695`; trust root configurata dall'operatore | Ricevuta firmata, status ACTIVE e fresco, certificato, nome/versione, DPoP legato a metodo, URL e contenuto |
| Bridge Node | Mapping fra identità ANS, tenant, agente e istanza PALO | L'identità esterna non eredita automaticamente permessi aziendali |
| Delega | Verifier aziendale distinto; JWT ES256 sintetico nella demo | Una prova ANS valida non basta senza mandato valido |
| Runtime | Nuova verifica dopo la lettura asincrona dello stato precedente | La revoca locale intervenuta durante la preparazione impedisce l'esecuzione |
| Capability | Scadenza limitata da claim e autorità verificata; controllo prima del consumo | Non può prolungare la durata dell'autorizzazione verificata |
| Admission | `identityPolicy.requireIdentityBoundClaims: true` nella demo | Il downgrade a un claim legacy non salta il controllo d'identità |
| Outcome | Esecuzione sintetica e verifica autorevole dello stato risultante | Effetto errato o non osservabile apre revisione e blocco della risorsa |
| CI | Workflow dedicato con build e test obbligatori | Configurato nel codice; non eseguito su GitHub, dato che non è stato effettuato push |

Le credenziali grezze restano fuori dall'Action Claim persistito; il bridge conserva digest delle prove. I fixture generano chiavi effimere e sono separati dal comando verifier. Il processo verifier non contatta la rete durante la verifica.

## Validazione eseguita

Ambiente locale: macOS ARM64, Node 22.22.3, Go 1.27.1, OPA 1.18.2. Il toolchain Go e OPA sono stati verificati contro gli hash della distribuzione ufficiale.

| Controllo | Esito |
|---|---|
| Build Go con moduli bloccati e `go mod verify` | Passato |
| `go vet ./...` nel package verifier | Passato |
| `npm run validate:ans` | 21 test passati, zero saltati |
| `npm run validate:agentic` | 118 test JavaScript passati, zero saltati; includono i 21 ANS |
| Controlli eseguiti dallo stesso comando | 21 contratti, 45 strumenti MCP, compilazione e test policy OPA, validazione integrazioni Knowledge Copilot |
| Test Python Dify inclusi nella validazione | 3 passati |
| Demo offline | 8 scenari passati |
| `npm run validate:text-style` | Passato dopo normalizzazione della punteggiatura della documentazione |
| `git diff --check` | Passato |

I conteggi non vanno sommati: i 21 test ANS sono compresi nei 118 JavaScript. Questi controlli non costituiscono una review indipendente né una misura delle prestazioni in produzione.

## Gap chiusi e residui

| Gap | Stato dopo il lavoro |
|---|---|
| Mancanza di un adapter ANS verificabile nel runtime | Chiuso nel profilo sperimentale offline, con SDK reale |
| Identità, mandato e tenant confusi in una sola decisione | Separati e verificati nella demo |
| Revoca dopo l'approvazione e prima dell'effetto | Testata la revoca del binding locale durante la lettura pre-esecuzione |
| Durata eccessiva della capability | Limitata alla validità delle prove e del claim |
| Ritorno al formato legacy per evitare ANS | Bloccato nei runtime che abilitano il requisito d'identità; demo configurata |
| Connessione con GoDaddy, endpoint registrato, dominio e profilo ospitato | Aperto: necessari artefatti reali e collaudo sul servizio autorizzato |
| Verifica dell'inclusione nel log contro un checkpoint autenticato indipendentemente | Aperto: risposta esplicita `checkpointVerified:false`; non chiamare questo profilo Gold |
| Revoche remote e cambi di stato ANS | Aperto: nessun feed live; status locale limitato a 300 secondi di freschezza, salvo scadenza anteriore |
| Rotazione delle root, replay fra repliche, binding persistenti | Aperto: demo con stato locale e cache di processo |
| HTTP/MCP pubblico, OAuth DPoP access token, credenziali del target | Aperto: bridge non collegato automaticamente ai trasporti; flusso OAuth con `ath`/`cnf.jkt` da qualificare |
| Impedire accessi diretti al sistema target | Aperto: executor sintetico; manca la prova di non aggirabilità su un target reale |
| Isolamento, storage, gestione chiavi, HA, recovery e SLO | Aperti; i gate di produzione restano operativi |
| Export di evidenze accettate dal Trust Index o da un partner | Aperto: non pubblicato né validato da un'altra implementazione |

La verifica finale riduce la finestra dimostrata di uso di un'autorizzazione obsoleta. Una revoca remota non può arrestare retroattivamente un effetto esterno già iniziato; una prova ancora fresca può restare accettabile fino alla scadenza se il binding locale non riceve aggiornamenti.

## Riprodurre la demo già compilata

```sh
cd /path/to/PALOframework
npm run validate:ans
npm run demo:ans
```

Per ricompilare sulla macchina attuale, Go è disponibile in `/path/to/go`; è un percorso temporaneo. Su una nuova macchina installare Go 1.27.1 e seguire il README della demo. Il report JSON è una prova di esecuzione locale, non un'attestazione firmata da GoDaddy.

Il passo successivo verso la produzione è qualificare lo stesso profilo con un endpoint autorizzato, prove reali, fonti di revoca e un connettore che impedisca le chiamate dirette al target. L'etichetta developer preview resta coerente con i gap residui del runtime operativo.
