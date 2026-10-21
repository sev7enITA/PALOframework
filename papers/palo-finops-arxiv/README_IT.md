# Paper PALO FinOps

Manoscritto tecnico in inglese, versione 1.0 del 21 ottobre 2026. Riprende l'impaginazione A4 a due colonne del precedente PALO conservato in `papers/palo-agentic-incident-arxiv/main.tex`, mantenendo autore e affiliazione PALO. Non è stato caricato su arXiv, sottoposto a peer review o pubblicato.

Titolo: **PALO FinOps: Evidence-Gated Cost Accounting and Budget Admission for Multi-Model AI Workflows**.

Il contributo è il contratto eseguibile fra autorizzazione, impegni operativi, billing versionato e risultati accettati. Il paper non rivendica l'invenzione del costo per risultato, una superiorità rispetto ad Apptio o risparmi misurati su un provider reale. Include tre proprietà condizionate, quattordici riferimenti, un'architettura, un esempio numerico generato dal codice, un'analisi di sensibilità dichiaratamente costruita e il protocollo per una futura sperimentazione reale.

## File e riproduzione

- `main.tex`: manoscritto completo con bibliografia incorporata.
- `generated/sensitivity.tex`: figura prodotta dai risultati numerici.
- `reproducibility/experiments.mjs`: enumerazione di allocazione e sequenza contabile sintetica, senza accesso alla rete.
- `reproducibility/prepare_figure.py`: rigenera la figura PGFPlots dai risultati eseguiti.
- `reproducibility/results.json`: risultati eseguiti e hash delle sorgenti.
- `CLAIM_EVIDENCE_MAP.md`: corrispondenza fra affermazioni e prove.
- `sources.json`: registro dei riferimenti e dei limiti della loro interpretazione.
- `submission-metadata.json`: metadati proposti, senza identificativo arXiv o DOI inventato.
- `QA.json`: controlli della consegna finale.

Il PDF finale e i pacchetti ZIP sono in `output/pdf/palo-finops-arxiv/`. Il pacchetto LaTeX contiene solo gli input necessari alla compilazione; il pacchetto di riproducibilità contiene un sottoinsieme autonomo delle sorgenti per gli esperimenti del paper.

Dal repository o dal pacchetto di riproducibilità estratto:

```sh
node papers/palo-finops-arxiv/reproducibility/experiments.mjs
python3 papers/palo-finops-arxiv/reproducibility/prepare_figure.py
```

Il run registrato usa Node.js v22.22.3. Le 12.864 configurazioni sono un'enumerazione finita, non osservazioni indipendenti di affidabilità. La ricevuta dei 63 test del modulo proviene dal ciclo di implementazione dello stesso giorno ed è associata agli hash delle sorgenti. I 20 controlli UI non costituiscono uno studio di usabilità.

La compilazione locale è stata eseguita con Tectonic 0.17.0. Nel pacchetto LaTeX estratto, `tectonic -X compile main.tex` ricompila il documento. I pacchetti usati sono standard; non è stata eseguita una compilazione sui server arXiv né su una distribuzione TeX Live locale.

## Preparazione per arXiv

La preparazione segue le [istruzioni ufficiali per LaTeX](https://info.arxiv.org/help/submit_tex.html) e la [guida alla submission](https://info.arxiv.org/help/submit/index.html), consultate il 21 ottobre 2026: sorgenti portabili, data fissa, figure incluse, riferimenti risolti e nessun output o file temporaneo superfluo nel pacchetto sorgente. La bibliografia è nel documento e non richiede BibTeX o Biber. Non serve shell escape.

La compilazione locale non equivale all'accettazione del servizio arXiv. Prima dell'invio l'autore deve leggere il manoscritto, confermare dati anagrafici e affiliazione, scegliere categoria e licenza, valutare l'eventuale endorsement richiesto dall'account e controllare il PDF ricompilato da arXiv. Le categorie indicate nei metadati sono proposte editoriali. Non è stata selezionata o accettata una licenza per conto dell'autore.

Il testo dichiara l'assistenza di Codex e distingue la revisione GLM del codice dalla revisione del paper. La nuova revisione GLM del manoscritto non è stata eseguita: l'accesso nativo risultava bloccato dal blocco del Mac. Nessuna approvazione scientifica è attribuita a GLM.

## Edizione per il rilascio web

Il rilascio FinOps include il PDF e i due archivi in `assets/`, raggiungibili dal modulo pubblico. La sezione di disponibilità del manoscritto è stata aggiornata per indicare questi materiali. La validazione scientifica resta locale e sintetica; non è stata effettuata una submission ad arXiv. Le ricevute originali descrivono la preparazione del 21 ottobre, prima della pubblicazione.
