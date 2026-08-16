# PALO-AI State-of-the-Art Radar - agosto 2026

| Campo | Valore |
| --- | --- |
| Data dello snapshot | 14 agosto 2026, Europe/Rome |
| Scope | Algoritmi, SLM, runtime agentico, protocolli, identità, policy, evidenza, osservabilità, dipendenze e segnali di adozione |
| Repository verificato | PALO Platform 3.0.1; baseline PALO-AI 2.5 con addendum implementativo sul working tree 2.6 |
| Metodo | Ispezione del codice e dei lockfile, test locali, advisory scan, confronto con fonti primarie e ricerca esplorativa in community tecniche |
| Autorità del report | Technology radar interno e riproducibile; non è un audit di sicurezza indipendente né una certificazione |

## Addendum implementativo del 14 agosto 2026

Il primo incremento PALO-AI v2.6 successivo a questo radar è ora implementato nel working tree e copre cinque priorità:

- Action Claim 1.3 con human principal, workload identity, credential digest, agent instance, tenant e delegation chain non ampliabile; il percorso fallisce chiuso senza un `authorityVerifier` configurato;
- task SQLite durevoli per approval e verification, con stato, scadenza, retry e quattro nuovi tool MCP;
- Effect Contract 1.1 con operatori aggiuntivi, verifica differita e proposta di compensazione che richiede sempre un nuovo Action Claim;
- Evidence Envelope 2.0 opzionale con canonicalizzazione RFC 8785, Ed25519 e verifier offline;
- eventi di telemetria non autoritativi, rate/concurrency/delegation guardrail e operational snapshot.

Il secondo incremento implementato nello stesso working tree chiude altri tre gap P0/P1:

- migrazione dal pacchetto MCP monolitico 1.30 agli SDK split 2.0, con un'unica factory per protocollo stateless `2026-07-28` e fallback 2025, test pinned-modern su stdio/HTTP, test legacy e rifiuto degli header moderni incoerenti;
- resource server OIDC/JWKS con binding a issuer/audience/expiry/algoritmo, Protected Resource Metadata RFC 9728, challenge step-up per scope, ruoli least-privilege, catalogo tool filtrato per principal e reviewer identity derivata dal token;
- bridge OpenTelemetry API con span assurance, correlazione sul trace ID PALO e allowlist che esclude token, payload arbitrari e segreti.

Il percorso shared-token resta soltanto come modalità di sviluppo. La compatibilità EMA riguarda il resource server: l'authorization server e lo scambio ID-JAG non sono implementati da PALO. Restano inoltre i limiti production più importanti: task e ledger single-instance SQLite, nessun lease multi-replica, nessun KMS/HSM, nessun proof-of-possession o workload attestation, nessun exporter/sampler OpenTelemetry incluso e `authorityVerifier` fornito dall'host.

Validazione successiva al secondo incremento: **49/49 test Node**, 3/3 test Dify, 13 contratti, 26 tool MCP e test OPA passano; l'audit completo delle dipendenze root riporta **0 vulnerabilità note**.

## Verdetto esecutivo

**No: PALO non usa oggi lo stato dell'arte in modo uniforme.** È però vicino alla frontiera su una parte importante del problema: separa l'autorizzazione dell'azione dalla verifica dell'effetto realmente prodotto. Action Claim immutabile, Effect Contract, capability monouso, receipt firmata, verifica su post-stato autorevole e incident hold formano una catena più rigorosa del semplice `allow/deny` prima di un tool call.

La maturità non è uniforme:

| Area | Valutazione al 14 agosto 2026 | Evidenza sintetica |
| --- | --- | --- |
| Modello concettuale di full-cycle assurance | **All'avanguardia / differenziante** | L'esito `allowed` resta distinto da `verified`; mismatch e stato inconcludente aprono review e hold |
| Policy deterministica | **Solida e aggiornata** | OPA/Rego fail-closed; OPA 1.18.2 pin-nato per piattaforma e checksum |
| Effect Contract | **Innovativo ma ancora ristretto** | DSL chiusa e sicura; nove operatori e verifica differita, ma nessuna semantica aggregata o cross-resource |
| Guide/routing algorithm | **Non state of the art per relevance** | Scoring lessicale euristico; niente BM25, embedding, reranking o benchmark di retrieval |
| SLM | **Non presente** | PALO non carica o serve alcun modello; la core assurance è model-agnostic |
| MCP | **Allineato sul trasporto, parziale sulle extension** | SDK split 2.0 e wire dual-era 2026/2025; i task PALO non usano ancora MCP Tasks/MRTR |
| Identità e autorizzazione enterprise | **Parziale avanzato** | OIDC/JWKS, audience binding, scope/ruoli e RFC 9728 sul MCP remoto; mancano AS/EMA ID-JAG, PoP, attestation e isolamento tenant production |
| Evidenza crittografica | **Buon prototipo interoperabile v2** | RFC 8785/Ed25519 e verifica offline opzionali; restano HMAC interni, niente KMS/COSE/DSSE o transparency service |
| Durabilità e scala | **Developer preview** | SQLite/WAL e recovery single-instance; niente Postgres, queue/outbox distribuita, lease o multi-replica |
| Osservabilità | **Bridge implementato, piattaforma incompleta** | Span assurance OpenTelemetry allowlisted; exporter, metriche, sampling e tracing downstream restano responsabilità dell'host |
| Dipendenze applicative | **Generalmente sane, non tutte correnti** | Runtime root senza advisory noti; toolchain n8n con advisory high; Vite e alcune librerie sono indietro di major/minor |
| Validazione esterna/community | **Insufficiente** | Buona disciplina interna e test, ma pochi design partner, nessun benchmark pubblico comparativo e nessun audit indipendente |

La formula corretta oggi è quindi:

> **PALO-AI è un reference runtime sperimentale con alcune primitive di assurance alla frontiera, non uno stack 2026 complessivamente state-of-the-art o production-ready.**

## 1. Cosa usa davvero PALO

### 1.1 Nessun SLM nel runtime attuale

Il nome `PaloGuideAgent` non indica un language model. Il codice in [`packages/palo-mcp-server/guide-agent.js`](../packages/palo-mcp-server/guide-agent.js) implementa:

- normalizzazione Unicode e tokenizzazione;
- rimozione di una breve lista di stop-word inglesi;
- pesi lessicali scritti a mano su label, intenti, azioni, output, proprietà, stakeholder, fase e tipo;
- regole deterministiche signal-to-phase per il routing;
- attivazione deterministica del profilo OWASP GenAI 2026.

Questo è spiegabile, riproducibile e appropriato per un percorso di governance. Non è però ricerca semantica moderna: non gestisce bene sinonimi, parafrasi, multilinguismo profondo o query fuori vocabolario e non è misurato su un relevance set.

### 1.2 Algoritmi di assurance implementati

Il runtime in [`packages/palo-mcp-server/core.js`](../packages/palo-mcp-server/core.js) contiene:

- canonical Action Claim e digest SHA-256;
- JSON Schema 2020-12 con AJV;
- policy decision fail-closed via OPA o provider sostituibile;
- binding dell'approvazione al digest esatto del claim;
- nonce, idempotency key e sequence number monotona;
- capability firmata, a breve durata e consumabile una volta;
- executor e verifier registrati separatamente;
- Effect Contract con precondizioni, effetti attesi ed effetti vietati;
- receipt, outcome attestation, incident e resource hold;
- ledger append-only SQLite con hash chain;
- recovery single-instance delle esecuzioni rimaste pending.

Questa sequenza è tecnicamente significativa. Il suo limite principale non è l'idea, ma il trust boundary: executor e verifier sono handler in-process, chiavi e HMAC vivono nello stesso perimetro operativo, e un host privilegiato può controllare codice, database e materiale di firma.

### 1.3 Stack e dipendenze osservate

| Componente | Versione osservata | Giudizio |
| --- | --- | --- |
| Node.js engine dichiarato | `>=22 <25` | Node 20 rimosso; produzione dovrebbe fissare Node 24 LTS e mantenere CI su 22/24 |
| OPA | 1.18.2, binary + SHA-256 pin | Aggiornato; non sostituire solo per novità |
| MCP SDK | `@modelcontextprotocol/server`, `client`, `hono` 2.0.0 | Major corrente, con conformance test dual-era e modern pin |
| AJV / formats | 8.20.0 / 3.0.1 | Adeguati e correnti |
| Zod | 4.4.3 | Corrente |
| better-sqlite3 | 12.11.1; latest osservato 13.0.3 | Adeguato al preview; non è la soluzione di scala target |
| React | 19.2.0; latest osservato 19.2.8 | Major corrente; applicare patch |
| Vite | 6.4.3; latest osservato 8.2.1 | Due major indietro; migrazione controllata, non emergenza runtime |
| Playwright | 1.61.1; latest osservato 1.62.1 | Quasi corrente |
| n8n node CLI | 0.39.3; latest osservato 0.43.3 | Da riallineare e rigenerare il lockfile |

Il confronto `latest` non è di per sé un criterio di qualità. Per una piattaforma di governance contano supporto, security patch, compatibilità testata, lock riproducibile e piano di migrazione.

## 2. Delta rispetto alla frontiera 2026

### 2.1 MCP 2026-07-28 è il gap più immediato

La release MCP 2026-07-28 ha introdotto core stateless, richieste self-describing, routing tramite `Mcp-Method`/`Mcp-Name`, Multi Round-Trip Requests, response caching, Tasks come extension, hardening OAuth ed Enterprise-Managed Authorization. Gli SDK TypeScript 2.0 sono ora pacchetti separati client/server/core/runtime. Fonti: [MCP 2026-07-28 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/), [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), [Enterprise-Managed Authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization).

Alla baseline 2.5 PALO usava `initialize`, importazioni SDK v1 e un bearer condiviso. La scelta `sessionIdGenerator: undefined` non rendeva il server conforme alla nuova era modern e motivava una migrazione esplicita con test legacy/modern.

**Stato addendum:** SDK split, dual-era, modern pin, header validation e resource-server OAuth/OIDC sono implementati. Rimangono MRTR per approval/elicitation, MCP Tasks standard e il flusso EMA lato authorization server.

### 2.2 Identity-first authorization sta superando il bearer condiviso

L'IETF WIMSE sta convergendo su workload identifier, credenziali brevi, mTLS/HTTP signatures e token di workload; le bozze 2026 trattano le static API key come anti-pattern per l'identità degli agenti. Sono ancora Internet-Draft, quindi vanno seguite e sperimentate, non dichiarate standard finali. Fonti: [WIMSE working group](https://datatracker.ietf.org/group/wimse/), [AI Agent Authentication and Authorization draft](https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/02/).

Il progetto cinese [Alibaba Open Agent Auth](https://github.com/alibaba/open-agent-auth) è il confronto sperimentale più direttamente pertinente a PALO: combina OAuth/OIDC, WIMSE, chiavi temporanee per request, binding user-workload-token, W3C Verifiable Credentials, policy dinamica e MCP. È in public beta e non va assunto come production-ready, ma mostra che identity binding e authorization evidence stanno diventando primitive di prima classe.

**Stato addendum:** il trasporto MCP OIDC separa i permessi agent, reviewer, auditor, observer e admin e lega audience e subject. Credenziali brevi dipendono dall'issuer; proof-of-possession, workload attestation e scambio EMA ID-JAG restano P1.

### 2.3 Policy lifecycle: PALO copre bene `pre_tool`, non l'intero loop

L'Agent Control Specification di Microsoft AGT 5.0 modella otto intervention point: startup, input, pre/post model, pre/post tool, output e shutdown. Supporta Rego, Cedar, annotator deterministici o ML, approval ed eventi strutturati. Fonte: [Microsoft Agent Governance Toolkit - ACS](https://github.com/microsoft/agent-governance-toolkit/blob/main/policy-engine/README.md).

L'adapter PALO è pin-nato a `agent-control-specification@0.3.1-beta.0` e mappa soltanto `pre_tool_call`. La scelta di rifiutare un `transform` e richiedere un nuovo claim digest-bound è corretta. Mancano però conformance test contro l'attuale AGT 5.0, pre/post model, post-tool DLP, startup/shutdown e una strategia per comporre verdict multipli senza rendere un annotator probabilistico fonte di permesso.

**Decisione:** P0 per riconfermare la compatibilità; P1 per estendere l'EnforcementProvider a intervention point tipizzati. Un classificatore può aumentare rischio, negare o richiedere review; non deve mai allargare l'autorità deterministica.

### 2.4 Osservabilità standard: bridge iniziale implementato

OpenTelemetry sta definendo span per `invoke_agent`, `plan`, workflow ed `execute_tool`, con attributi per agent, modello, tool, datasource e valutazioni. Lo stato di parte delle convenzioni è ancora Development, ma il direction of travel è chiaro. Fonti: [OpenTelemetry GenAI agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md), [GenAI observability](https://opentelemetry.io/blog/2026/genai-observability/).

PALO traduce ora gli eventi del ciclo assurance in span OpenTelemetry con correlazione e redazione allowlist. Non è ancora una piattaforma osservabile completa. Mancano almeno:

- propagazione W3C completa dal client MCP a policy engine, executor, verifier e incident downstream;
- latency p50/p95/p99 e decision outcome;
- queue/recovery/hold metrics;
- revisione della redaction policy organizzativa al confine dell'exporter;
- cost, action budget e loop detection.

**Stato addendum:** bridge span completato; exporter, sampler, metriche e integrazione SIEM restano P1. OTel non sostituisce il ledger PALO.

### 2.5 Canonicalizzazione, firma ed evidenza portabile

La funzione `canonicalize()` ordina ricorsivamente le chiavi ma è un formato proprietario e non dichiara conformità a [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/info/rfc8785/). Le firme HMAC provano integrità soltanto dentro il perimetro che condivide la chiave; non forniscono identità pubblicamente verificabile o non-ripudio.

Nel 2026 le opzioni interoperabili rilevanti includono:

- JCS RFC 8785 per JSON canonicale;
- COSE/DSSE e [in-toto Attestation v1.2](https://github.com/in-toto/attestation) per envelope e predicate verificabili;
- [SCITT RFC 9943](https://www.rfc-editor.org/info/rfc9943/) per statement e transparency receipt;
- [HTTP Message Signatures RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html) per integrità end-to-end di componenti HTTP;
- draft emergenti su authorization receipt ed evidence record, da trattare come ricerca e non come standard consolidato.

**Stato addendum:** Evidence Envelope 2.0 implementa JCS RFC 8785, Ed25519, key ID, verification method e verifier offline. KMS/HSM, COSE/DSSE e anchor SCITT/in-toto restano P1/P2; HMAC rimane un profilo locale di compatibilità.

### 2.6 Durabilità, isolamento e unavoidable enforcement

SQLite WAL con transazioni e trigger append-only è una buona scelta per il preview. Non risolve coordinamento multi-replica, failover, backup verificato, lease, distributed outbox o exactly-once con servizi esterni.

Due progetti asiatici mostrano direzioni utili da valutare:

- [Alibaba OpenSandbox](https://github.com/alibaba/OpenSandbox): control/data plane separati, OpenAPI, runtime Docker/Kubernetes, egress policy e secure runtime;
- [Tencent AI-Infra-Guard](https://github.com/tencent/AI-Infra-Guard): scanning di agent, skill, MCP e infrastruttura AI.

Sono candidati di laboratorio, non dipendenze da introdurre automaticamente. Per PALO il passo corretto è prima definire un connector isolation contract e benchmarkare Docker/Kubernetes sandbox, egress, cold start, observability e failure semantics.

## 3. SLM: cosa conviene davvero fare

### 3.1 Non mettere un SLM nella decisione autorizzativa

OPA/Rego, schema, scope, digest, nonce, approval e Effect Contract devono restare deterministici. Un SLM può sbagliare per distribuzione linguistica, quantizzazione, template, prompt injection o drift. Le community LocalLLaMA riportano ancora nel 2026 failure di tool-call dovuti a template/parser e differenze tra quantizzazioni; sono segnali aneddotici ma sufficienti per escludere un modello dal ruolo di root of trust. Esempi: [Qwen 3.5 tool-calling fixes](https://www.reddit.com/r/LocalLLaMA/comments/1sdhvc5/qwen_35_tool_calling_fixes_for_agentic_use_whats/), [Qwen tool-call failures](https://www.reddit.com/r/LocalLLaMA/comments/1r72ul0/qwen35_397b_a17b_tool_calling_issues_in_llamacpp/).

Regola architetturale proposta:

> Un modello probabilistico può segnalare, restringere, negare o richiedere review. Non può concedere scope, saltare una verifica, modificare in-place un claim approvato o trasformare `denied` in `allowed`.

### 3.2 Dove uno SLM crea valore

**A. Discovery semantica del Guide Agent.** Per il corpus PALO, usare un retrieval ibrido:

1. baseline FTS5/BM25 o altro indice lessicale riproducibile;
2. embedding locale per recall semantico;
3. reranker soltanto sui primi 20-30 candidati;
4. risposta sempre costruita da record PALO rilasciati, con ID e authority boundary;
5. fallback deterministico se il modello non è disponibile.

La famiglia cinese [Qwen3-Embedding/Reranker](https://github.com/QwenLM/Qwen3-Embedding) offre taglie 0.6B, 4B e 8B, supporto italiano e oltre 100 lingue, 32K context e Matryoshka embeddings. `Qwen3-Embedding-0.6B` + `Qwen3-Reranker-0.6B` è il candidato edge più pertinente. [BGE-M3](https://github.com/FlagOpen/FlagEmbedding/blob/master/docs/source/bge/bge_m3.rst) è una baseline asiatica matura per dense+sparse+multi-vector. Un benchmark italiano indipendente segnala che multilingual-e5 può restare competitivo a latenza molto più bassa: perciò la selezione va misurata, non decisa dal leaderboard globale.

**B. Advisory risk detector.** [Qwen3Guard](https://github.com/QwenLM/Qwen3Guard) include varianti 0.6B/4B/8B, generative e streaming, su 119 lingue. Può essere valutato in shadow mode per prompt injection, jailbreak e contenuto rischioso. Non copre da solo business authorization, scope, data lineage o outcome correctness.

**C. Synthetic evaluation e red-team generation.** SLM locali possono produrre parafrasi multilingui, casi avversariali e mutate tool call per ampliare i test, purché fixture e risultati restino revisionati e versionati.

### 3.3 Progetti orientali ed edge esaminati

| Progetto | Regione | Segnale utile per PALO | Decisione |
| --- | --- | --- | --- |
| Alibaba Open Agent Auth | Cina | Identity binding, WIMSE, VC audit, MCP auth | **Spike P1**; public beta, non produzione |
| Qwen3.6 / Qwen3.5 small | Cina | Modelli 0.8B-9B e agentic/tool capability | Benchmark, non dipendenza core |
| Qwen3 Embedding/Reranker | Cina | Retrieval multilingue locale incluso italiano | **PoC consigliato** per Guide |
| Qwen3Guard | Cina | Guard 0.6B multilingue e streaming | Shadow-mode security signal |
| OpenBMB AgentCPM | Cina | Agent 4B long-horizon, AgentRL e sandbox scheduling | Research watch; non serve al core |
| InclusionAI AWorld-RL / FunReason-MT | Cina | Training multi-turn tool use e environment tuning | Research watch per benchmark/fixture |
| Tencent AI-Infra-Guard | Cina | Scanner agent/skill/MCP | **Evaluation candidate** per CI/security |
| Alibaba OpenSandbox | Cina | Sandbox API, egress e Kubernetes | **Evaluation candidate** per connector isolation |
| EXAONE 4.0 1.2B | Corea del Sud | SLM reasoning/tool-use con benchmark pubblicati | Baseline regionale, priorità sotto Qwen/mE5 per l'italiano |
| LLM-jp / PLaMo ecosystem | Giappone | Ricerca local/lingua-specifica e modelli piccoli | Osservato; nessun fit diretto sufficiente oggi |

Altri progetti sperimentali occidentali esaminati includono ActPlane per enforcement OS-level, agent governance proxy in Rust e receipt/transparency draft. Sono segnali di convergenza sulla necessità di enforcement sotto il livello del prompt, ma non hanno ancora stabilità o adozione sufficienti per diventare dipendenze PALO.

### 3.4 Gate sperimentale per qualsiasi SLM

Prima di integrare un modello, creare un dataset PALO bilingue italiano/inglese con almeno:

- 250 query di retrieval, incluse parafrasi, typo, negazioni e query fuori scope;
- 200 prompt/tool call avversariali;
- label di almeno due reviewer per relevance e rischio;
- split congelato, hash e licenza/provenienza documentati.

Metriche minime:

| Funzione | Metriche |
| --- | --- |
| Retrieval | Recall@5, nDCG@5, MRR, zero-result rate, citation correctness |
| Guard | Precision/recall/F1 per lingua e categoria; false-negative rate separato |
| Operatività | p50/p95/p99, cold start, RAM/VRAM, dimensione modello, throughput |
| Governance | unsupported-route rate, authority-boundary violations, determinism of fallback |
| Robustezza | quantizzazione, template/version drift, prompt injection, model unavailable |

Promuovere il modello da shadow ad advisory solo se supera baseline e soglie definite. Non esiste una promozione prevista verso authority provider.

## 4. Reddit, HN ed early adopter: cosa dicono davvero

La ricerca ha incluso Reddit, Hacker News e repository/discussion di sviluppatori. Queste fonti sono state usate come **qualitative signal**, non come prova di performance o sicurezza.

Segnali ricorrenti:

- i team che portano agenti in produzione chiedono ancora come vincolare refund, email, write e approval senza costruire tutto internamente ([discussion July 2026](https://www.reddit.com/r/AI_Agents/comments/1uks0vs/people_running_agents_in_production_how_do_you/));
- le approval rischiano timeout, stuck workflow e rubber-stamping ([discussion August 2026](https://www.reddit.com/r/AI_Agents/comments/1ve23m9/agents_in_production/));
- OpenTelemetry sta emergendo come denominatore comune, mentre le convenzioni tra framework restano frammentate ([OTel community discussion](https://www.reddit.com/r/OpenTelemetry/comments/1rvu4x2/agent_telemetry_semantic_conventions_atsc_draft/));
- proxy/gateway MCP con credential injection last-mile, policy e audit compaiono ripetutamente nei progetti early-stage ([Bulwark Show HN](https://news.ycombinator.com/item?id=47042470));
- tool calling dei modelli locali può essere molto sensibile a chat template, parser, quantizzazione e runtime, quindi i benchmark vendor non bastano.

Il segnale di mercato conferma il problema affrontato da PALO. Non dimostra che l'implementazione PALO lo risolva meglio: per questo servono benchmark comparativi, utenti esterni e incident simulation.

## 5. Advisory e test riproducibili del repository

Comandi eseguiti il 14 agosto 2026:

```bash
npm outdated --json
npm audit --json
npm audit --json --omit=dev
npm audit --json --prefix governance-hub
npm audit --json --prefix packages/n8n-nodes-palo-ai
npm run validate:agentic
npm run validate
npm test --prefix packages/n8n-nodes-palo-ai
```

Risultati:

- `validate:agentic` dopo i due incrementi: **49/49 test Node pass**, 3/3 Dify test pass, 13 contratti, 26 MCP tool e policy OPA validati;
- semantic validation: 163 triple ontologiche, 231 SHACL triple, 14 invarianti e 19 item digest-bound validati;
- root `npm audit --omit=dev`: **0 vulnerabilità note**;
- root audit completo dopo aggiornamento di `@hono/node-server` e `nanoid`: **0 vulnerabilità note**;
- Governance Hub: **0 vulnerability note**;
- install tree n8n `--omit=dev`: **3 high** sulla catena `n8n-workflow` -> `@n8n/utils` -> `nanoid`;
- audit completo n8n: 18 finding complessivi tra moderate/high nella toolchain, inclusi `undici`, `brace-expansion`, `js-yaml`, `uuid` e `release-it`.

Il pacchetto community node pubblicato non include `node_modules` e dichiara `n8n-workflow` come peer. Questi finding non provano che il tarball PALO contenga quelle librerie, ma rendono il lock di build/test non accettabile come evidenza di release pulita. Va rigenerato con una versione n8n CLI compatibile e rivalidato su host n8n supportati.

## 6. Roadmap raccomandata

### Completate nel working tree il 14 agosto 2026

- SDK MCP split 2.0, protocollo dual-era, modern pin e header/body mismatch test;
- OIDC/JWKS audience-bound, RFC 9728, scope/ruoli e reviewer subject autenticato sul trasporto MCP;
- Action Claim 1.3, Effect Contract 1.1, task durevoli single-instance e guardrail runtime;
- Evidence Envelope 2.0 RFC 8785/Ed25519 e verifier offline;
- bridge span OpenTelemetry con correlazione e redazione allowlist.

### P0 - 0-14 giorni

1. **Pulire la toolchain n8n**, aggiornare node-cli/lock, risolvere o documentare ogni advisory e testare package install su versioni n8n supportate.
2. **Completare la baseline Node 22/24**, aggiungendo la matrice CI e fissando Node 24 LTS per il deployment production target.
3. **Rieseguire il contract suite su Microsoft AGT 5.0/current ACS** e aggiornare pin, metadata e limiti dichiarati.
4. **Aggiungere un benchmark baseline**: policy latency, end-to-end latency, 1/10/100 concurrent claims, crash/recovery, replay, approval timeout e mismatch.

### P1 - 15-45 giorni

1. OpenAPI 3.1 come contratto gateway, generazione client TypeScript/Python e test schema-route.
2. Completare OpenTelemetry con exporter/sampler, metriche, context propagation downstream e dashboard/SIEM.
3. Portare Evidence Envelope 2.0 su KMS/HSM e definire rotazione/revoca delle chiavi.
4. Completare l'identity model con PoP, workload attestation, isolamento tenant e integrazione EMA lato authorization server.
5. Policy lifecycle tipizzato oltre `pre_tool_call`; budget, rate, time window, path history e circuit breaker.
6. SBOM, provenance/attestation di release, dependency review automatizzata e policy di aggiornamento.

### P2 - 45-90 giorni

1. PostgreSQL + durable queue/outbox + multi-replica lease e backup/restore testato.
2. Connector isolation contract e spike comparativo su OpenSandbox/Kubernetes sandbox o alternativa equivalente.
3. SLM PoC solo per Guide/shadow guard con il benchmark bilingue definito sopra.
4. Export in-toto/SCITT sperimentale e confronto con authorization receipt emergenti.
5. A2A 0.3 solo dopo identity/delegation/task model; non aggiungerlo come integrazione nominale.
6. Design-partner pilot con dati sintetici/reversibili e pubblicazione di latency, false-positive, recovery e reviewer-effort.

## 7. Cosa non fare

- Non sostituire OPA con un LLM judge.
- Non aggiungere un vector database per 46 nodi semantici prima di provare che FTS5/BM25 + piccolo reranker non bastano.
- Non riscrivere il runtime in Rust soltanto perché molti progetti early-stage lo usano; prima misurare il collo di bottiglia.
- Non integrare contemporaneamente Qwen, Gemma, EXAONE e AgentCPM: scegliere una funzione, una baseline e un gate.
- Non dichiarare WIMSE, authorization receipt o altri Internet-Draft come standard finali.
- Non confondere tool-call correctness con authorization correctness o outcome correctness.
- Non pubblicare claim "state of the art" senza data, scope, baseline, metriche e fonte.

## 8. Decisione finale

PALO non deve inseguire ogni nuovo modello. Il suo valore è essere **la parte deterministica e verificabile attorno a modelli sostituibili**. La priorità non è inserire uno SLM nel trust path, ma aggiornare il protocollo MCP, rendere l'identità una primitive reale, standardizzare l'evidenza, aggiungere osservabilità e provare la durabilità.

Lo SLM ha senso come esperimento confinato per rendere il Guide Agent semanticamente migliore e per aggiungere segnali security in shadow mode. La coppia più razionale da misurare è Qwen3-Embedding/Reranker 0.6B contro una baseline BM25/FTS5 e multilingual-e5; Qwen3Guard 0.6B può essere un secondo esperimento distinto. Nessuno dei due deve acquisire autorità.

**Prossima review radar:** 30 settembre 2026, oppure immediatamente in caso di nuova MCP spec, AGT GA, advisory high/critical, modifica dei claim/effect contract, introduzione di un modello o primo design-partner pilot.
