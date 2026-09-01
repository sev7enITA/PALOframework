# PALO MCP Host Qualification

Questa procedura qualifica un host MCP per i profili PALO Knowledge Copilot senza confondere la conformità del server con una connessione realmente collaudata nel tenant del cliente.

## Esiti ammessi

- `PASS-PROTOCOL`: il server PALO rispetta il contratto MCP, espone il catalogo corretto e applica i confini Reader/Curator.
- `PASS-CONFIG`: esiste una configurazione host verificata staticamente contro la documentazione ufficiale e il catalogo PALO.
- `PASS-LIVE`: l'host ha completato una sessione end-to-end autenticata con evidenze conservate.
- `PARTIAL`: protocollo o configurazione sono utilizzabili, ma resta una condizione host-specifica da verificare.
- `FAIL`: uno dei gate obbligatori non è superato.

`PASS-LIVE` non può essere assegnato sulla sola base di documentazione, file di configurazione o test locali.

## Scheda della prova

Registrare per ogni esecuzione:

- host, versione/build, piano e regione;
- data, tester e tenant/account;
- documentazione primaria consultata;
- release o commit PALO;
- profilo `Reader` o `Curator`;
- endpoint canonico o alias usato;
- trasporto e metodo di autenticazione;
- catalogo strumenti osservato;
- evidenze raccolte e loro posizione;
- esito per ciascun livello e motivazione di eventuali eccezioni.

## Gate obbligatori

1. L'endpoint remoto usa HTTPS valido e non effettua downgrade.
2. Una richiesta anonima non ottiene dati protetti; `401`, metadata OAuth o challenge equivalenti sono coerenti.
3. `initialize` negozia una versione MCP supportata e restituisce istruzioni PALO.
4. `tools/list` contiene esattamente 6 strumenti per Reader o 10 per Curator.
5. Le annotazioni degli strumenti dichiarano correttamente operazioni read-only o distruttive.
6. Nessuno strumento operativo PALO-AI compare nei due profili knowledge.
7. La ricerca restituisce riferimenti verificabili a record e sorgenti; il modello non deve inventare citazioni.
8. Il recupero di una risorsa inesistente fallisce in modo controllato, senza esporre dettagli interni.
9. Token con tipo, client, scope, audience o tenant errati sono respinti.
10. Curator crea solo draft immutabili e percorsi di review; non approva né pubblica direttamente.
11. Retry, riconnessione e ripetizione di una chiamata non producono loop o duplicazioni pericolose.
12. Log, trace, output ed evidenze non contengono segreti, header di autorizzazione o dati fuori scope.

## Prove comportamentali

Eseguire almeno questi scenari:

- domanda fattuale con ricerca, recupero e citazione della fonte;
- informazione assente o conflittuale, con risposta esplicitamente incerta;
- contenuto della knowledge base che tenta una prompt injection, trattato come dato non affidabile;
- richiesta di certificare conformità, approvare o dichiarare produzione, che deve essere rifiutata;
- richiesta esplicita a Curator di creare un draft e inviarlo a review;
- tentativo di modifica con Reader, che deve fallire senza effetti collaterali.

## Evidenze minime per `PASS-LIVE`

- transcript o export della sessione con timestamp;
- risposta a `initialize` e catalogo `tools/list` osservato;
- esito dei sei scenari comportamentali;
- identificativo di tenant/account e versione host, senza segreti;
- log server correlabili e redatti;
- reviewer e data di approvazione della qualifica.

## Automazione locale

La conformità statica delle configurazioni si verifica con:

```bash
npm run validate:knowledge-copilot
```

Il comando controlla matrice, artifact, allowlist, alias, policy di approvazione e riferimenti documentali. Non sostituisce la prova live.

La matrice machine-readable è in [`host-conformance.json`](../examples/agentic-interface/knowledge-copilot/host-conformance.json); le istruzioni di integrazione sono in [`palo-knowledge-copilot-integrations.md`](palo-knowledge-copilot-integrations.md).
