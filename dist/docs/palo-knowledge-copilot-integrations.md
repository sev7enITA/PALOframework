# PALO Knowledge Copilot: integrazioni MCP Reader e Curator

Stato verificato al 27 agosto 2026. Il Reader dispone ora di un server dedicato, stateless, canonical-only e ammesso in configurazione production solo con OIDC stretto: audience canonica unica, tipo di access token, client e tenant in allowlist. Il suo stato di release è `production-candidate`. Il Curator resta un profilo separato con persistenza locale e non eredita questa qualifica. Il codice e le configurazioni sono verificati localmente; deployment, IdP e collaudi nei tenant vendor restano necessari prima di dichiarare Reader o host `PASS-LIVE`.

## Stato: cosa significa "validato"

| Livello | Significato | Stato corrente |
| --- | --- | --- |
| `PASS-PROTOCOL` | initialize, negoziazione MCP, `tools/list`, annotazioni e chiamate Reader/Curator passano contro il server PALO con il client MCP ufficiale | Pass per entrambi i profili |
| `PASS-CONFIG` | il file o la procedura segue il formato documentato dal vendor e la suite PALO ne verifica URL, profilo, allowlist e assenza di segreti | Pass o parziale, come indicato per host |
| `PASS-LIVE` | il prodotto, tenant, rete e IdP effettivi hanno scoperto il catalogo e completato le chiamate di accettazione sul server pubblico aggiornato | Pending per tutti gli host |

`PASS-PROTOCOL + PASS-CONFIG` non equivale a `PASS-LIVE`. La matrice machine-readable è in [`host-conformance.json`](../examples/agentic-interface/knowledge-copilot/host-conformance.json); il processo per promuovere un nuovo host è in [PALO MCP Host Qualification](palo-mcp-host-qualification.md).

## I due profili

| Profilo | Endpoint canonico | Alias compatibilità | Tool | Uso |
| --- | --- | --- | ---: | --- |
| Knowledge Reader | `https://governance.paloframework.org/mcp-guide` | `/mcp-guide/mcp` | 6 read-only | Q&A personale e aziendale dal bundle canonico immutabile PALO |
| Knowledge Curator | `https://governance.paloframework.org/mcp-guide-curator` | `/mcp-guide-curator/mcp` | 10 controllati | Draft immutabili, lettura draft e review terminale |

Gli alias terminanti in `/mcp` servono solo ai client che riconoscono il trasporto dal path. Audience OAuth e URL di risorsa restano gli endpoint canonici.

Reader espone:

- `palo_explain_framework`, `palo_infer_governance_route`, `palo_plan_product_integration`;
- `palo_list_knowledge_sources`, `palo_search_knowledge`, `palo_get_knowledge_record`.

Curator aggiunge:

- `palo_submit_knowledge_draft`, `palo_list_knowledge_drafts`;
- `palo_get_knowledge_draft`, `palo_review_knowledge_draft`.

Il Reader non monta alcun volume, non apre un workspace locale e verifica all'avvio i digest dei sette file canonici. Il Curator non modifica i JSON canonici, ma conserva draft, review terminali e record `curated-local` in un volume separato, con digest, provenienza e separazione autore/reviewer. Entrambi i profili escludono esecuzione operativa, risoluzione approvazioni o incidenti e amministrazione del runtime.

## Matrice host

| Host | Percorso | Auth consigliata | Config | Live | Nota decisiva |
| --- | --- | --- | --- | --- | --- |
| Copilot Studio | wizard MCP o custom connector | OAuth 2.0 manual/dynamic; API key header solo preview | Pass | Pending | Streamable HTTP ufficiale; SSE non supportato |
| Claude | remote custom connector + skill opzionale | OAuth 2.0 | Pass | Pending | Il server cloud deve essere raggiungibile da Anthropic |
| ChatGPT/Codex/OpenAI API | plugin ChatGPT, config Codex, Responses API | OAuth; bearer da env per Codex/API | Pass | Pending | ChatGPT web usa plugin, non il `config.toml` locale |
| GitHub Copilot CLI | `mcp-config.json` o `.mcp.json` | header protetto | Pass | Pending | Nessun segreto nel file condiviso |
| VS Code/Copilot Chat | `.vscode/mcp.json` o user config | input protetto oppure OAuth del client | Pass | Pending | Agent Host non inoltra input interattivi |
| Cursor | `.cursor/mcp.json` | OAuth | Pass | Pending | Cloud Agent richiede server remoto/OAuth compatibile |
| Gemini CLI | `settings.json` | OAuth dynamic discovery | Pass | Pending | `httpUrl` seleziona Streamable HTTP; `trust:false` |
| JetBrains AI Assistant | MCP settings JSON | da qualificare con IdP/proxy | Parziale | Pending | Trasporto e URL sono ufficiali; auth header/OAuth non è documentata nella stessa pagina |
| AWS AgentCore Gateway | external MCP target | OAuth 2LO/3LO/token exchange o API key | Parziale | Pending | Sincronizzare il catalogo dopo ogni sua modifica |
| n8n | MCP Client Tool v1.4+ | MCP OAuth2, bearer o header | Pass | Pending | Forzare `=httpStreamable`; controllare versione e retry |
| Dify | provider MCP nativo | OAuth o header | Parziale | Pending | Usare alias `/mcp`; Gateway resta fallback collaudato |

<a id="copilot-studio"></a>
## Microsoft Copilot Studio

1. Tools > Add a tool > New tool > Model Context Protocol.
2. Inserire nome del profilo e endpoint canonico.
3. Per l'azienda selezionare OAuth 2.0. Usare `Manual` senza DCR; `Dynamic discovery` soltanto quando authorization server, discovery e Dynamic Client Registration sono realmente disponibili.
4. Nel Reader production il bearer deve comunque essere un access token OIDC valido; l'opzione API key del wizard non trasforma una chiave statica in un'identità ammessa dal server.
5. Creare una connessione, aggiungerla all'agent e verificare esattamente 6 tool Reader o 10 Curator.

Copilot Studio documenta Streamable HTTP, autenticazione None/API key/OAuth e un wizard ufficiale; non supporta più SSE. Se si usa Power Apps, importare lo schema Reader o Curator. Le Power Platform data policies si applicano al connettore MCP.

Artifact: [`copilot-studio-reader.openapi.yaml`](../examples/agentic-interface/knowledge-copilot/copilot-studio-reader.openapi.yaml) e [`copilot-studio-curator.openapi.yaml`](../examples/agentic-interface/knowledge-copilot/copilot-studio-curator.openapi.yaml). Fonte: [Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent).

<a id="claude"></a>
## Claude, Claude Desktop e Cowork

1. Aggiungere Reader come custom connector remoto con l'URL canonico.
2. In Team/Enterprise far registrare e governare il connector dall'owner; in Pro/Max configurarlo nell'account personale.
3. Completare OAuth contro l'authorization server aziendale.
4. Installare facoltativamente [`skills/palo-knowledge-copilot`](../skills/palo-knowledge-copilot/SKILL.md) come skill/plugin dell'host.
5. Aggiungere Curator come connector separato solo per autori e reviewer autorizzati.

La skill non crea la connessione, non apre la rete e non contiene credenziali. Definisce ricerca prima della risposta, citazione, authority class, conflitti e difesa da prompt injection. Un plugin Claude può impacchettare skill e connector, ma il connector remoto e la sua autorizzazione restano necessari.

Fonti: [remote custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), [Claude plugins](https://support.claude.com/en/articles/13837440-use-plugins-in-claude), [remote e local connectors](https://support.claude.com/en/articles/11725091-when-to-use-desktop-and-web-connectors).

<a id="openai"></a>
## ChatGPT, Codex e OpenAI Responses API

### Codex CLI, IDE extension e ChatGPT desktop

Unire [`codex-reader.config.toml`](../examples/agentic-interface/knowledge-copilot/codex-reader.config.toml) a `~/.codex/config.toml` o `.codex/config.toml`. Codex condivide questa configurazione tra CLI, IDE extension e ChatGPT desktop. Per OAuth eseguire `codex mcp login palo-knowledge-reader`; per preview bearer aggiungere localmente `bearer_token_env_var = "PALO_GUIDE_TOKEN"` senza versionare il valore.

Curator usa una tabella separata e `default_tools_approval_mode = "writes"`: [`codex-curator.config.toml`](../examples/agentic-interface/knowledge-copilot/codex-curator.config.toml).

### ChatGPT web

ChatGPT web non legge il `config.toml` locale. Il percorso pubblicabile è un plugin con il server MCP remoto e, opzionalmente, la skill PALO. Pubblicazione, review e controlli workspace restano attività successive: il repository non equivale a un plugin già installabile dal catalogo.

### Responses API

Usare [`openai-reader.responses-tool.json`](../examples/agentic-interface/knowledge-copilot/openai-reader.responses-tool.json) dentro `tools`. L'applicazione deve iniettare `authorization` a runtime in ogni richiesta e gestire OAuth; il token non viene salvato dalla Responses API. Curator è separato e richiede sempre approvazione: [`openai-curator.responses-tool.json`](../examples/agentic-interface/knowledge-copilot/openai-curator.responses-tool.json).

Fonti OpenAI: [Codex MCP](https://developers.openai.com/codex/mcp), [MCP and Connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp), [plugin quickstart](https://developers.openai.com/plugins/build/app-quickstart), [skills](https://developers.openai.com/plugins/build/skills), [connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt).

<a id="github-copilot"></a>
## GitHub Copilot CLI

Il CLI usa `~/.copilot/mcp-config.json`, `.mcp.json` o `.github/mcp.json`, con `type: "http"`. Gli esempi includono l'allowlist esatta e un placeholder non funzionante. Copiare il file in una configurazione privata, sostituire il placeholder da un secret store e non committare la copia risultante.

Artifact: [`github-copilot-reader.mcp.json`](../examples/agentic-interface/knowledge-copilot/github-copilot-reader.mcp.json) e [`github-copilot-curator.mcp.json`](../examples/agentic-interface/knowledge-copilot/github-copilot-curator.mcp.json). Accettazione: `copilot mcp list`, `copilot mcp get palo-knowledge-reader --json`, catalogo esatto e una chiamata search/get.

Fonte: [GitHub Docs](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers).

<a id="vscode"></a>
## VS Code e GitHub Copilot Chat

Copiando [`vscode-reader.mcp.json`](../examples/agentic-interface/knowledge-copilot/vscode-reader.mcp.json) in `.vscode/mcp.json`, VS Code richiede il token come input protetto. È adatto alla preview locale, ma le sessioni Agent Host non inoltrano configurazioni con `${input:...}`. Per Agent Host e azienda preferire OAuth del client o `~/.copilot/mcp-config.json` amministrato.

Curator è separato in [`vscode-curator.mcp.json`](../examples/agentic-interface/knowledge-copilot/vscode-curator.mcp.json); non installarlo globalmente per la platea generale. Fonte: [VS Code MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers).

## Cursor

Unire Reader in `.cursor/mcp.json` o nella configurazione utente. L'esempio non contiene header e presuppone OIDC. I Cloud Agents accettano MCP custom HTTP/stdio ma non il vecchio SSE/`mcp-remote`; il test live deve coprire sia Cursor locale sia l'eventuale Cloud Agent aziendale.

Artifact: [`cursor-reader.mcp.json`](../examples/agentic-interface/knowledge-copilot/cursor-reader.mcp.json) e [`cursor-curator.mcp.json`](../examples/agentic-interface/knowledge-copilot/cursor-curator.mcp.json). Fonti: [Cursor MCP](https://docs.cursor.com/context/model-context-protocol), [Cloud Agents](https://cursor.com/docs/cloud-agent/capabilities), [CLI MCP](https://prod.cursor.com/docs/cli/mcp).

<a id="gemini"></a>
## Gemini CLI

Unire il file in `settings.json`. `httpUrl` seleziona Streamable HTTP; `authProviderType: dynamic_discovery` e `oauth.enabled` rendono esplicita la modalità enterprise. L'allowlist replica il catalogo PALO e `trust:false` mantiene la conferma delle chiamate.

Artifact: [`gemini-reader.settings.json`](../examples/agentic-interface/knowledge-copilot/gemini-reader.settings.json) e [`gemini-curator.settings.json`](../examples/agentic-interface/knowledge-copilot/gemini-curator.settings.json). Usare `/mcp auth palo-knowledge-reader`, poi `/mcp`. L'espansione environment documentata riguarda il blocco `env` dei processi locali, non va assunta negli header remoti.

Fonte: [Gemini CLI MCP servers](https://geminicli.com/docs/tools/mcp-server/).

<a id="jetbrains"></a>
## JetBrains AI Assistant

In Settings > Tools > AI Assistant > Model Context Protocol aggiungere la configurazione HTTP Reader o Curator. JetBrains documenta Streamable HTTP e `mcpServers.<name>.url`; la stessa pagina non documenta header o OAuth per il server remoto. `PASS-CONFIG` è quindi parziale: prima del go-live occorre dimostrare auth PALO nella versione IDE scelta o usare un identity boundary aziendale compatibile.

Artifact: [`jetbrains-reader.mcp.json`](../examples/agentic-interface/knowledge-copilot/jetbrains-reader.mcp.json) e [`jetbrains-curator.mcp.json`](../examples/agentic-interface/knowledge-copilot/jetbrains-curator.mcp.json). Fonte: [JetBrains MCP](https://www.jetbrains.com/help/ai-assistant/mcp.html).

<a id="aws-agentcore"></a>
## Amazon Bedrock AgentCore Gateway

Registrare PALO come external MCP server target. Per Reader preferire OAuth `CLIENT_CREDENTIALS` se il catalogo può essere sincronizzato con identità macchina; usare `AUTHORIZATION_CODE` o `TOKEN_EXCHANGE` quando serve identità utente e rispettare i limiti di listing mode AWS. API key è possibile per preview; `No authorization` non è raccomandato.

I worksheet non sono payload importabili perché ARN, gateway ID, Region e credential provider dipendono dall'account: [`aws-agentcore-reader-target.worksheet.json`](../examples/agentic-interface/knowledge-copilot/aws-agentcore-reader-target.worksheet.json) e [`aws-agentcore-curator-target.worksheet.json`](../examples/agentic-interface/knowledge-copilot/aws-agentcore-curator-target.worksheet.json).

Dopo Create/Update chiamare `SynchronizeGatewayTargets`, attendere il target pronto e verificare 6/10 tool. PALO e AgentCore condividono `2026-07-28`; non configurare una sessione per questa versione stateless. Fonte: [AWS AgentCore MCP targets](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-target-MCPservers.html).

## n8n

Il codice n8n corrente espone MCP Client Tool v1.4, seleziona HTTP Streamable di default da v1.2 e aggiunge il riuso sessione in v1.4. L'esempio forza comunque `serverTransport` come espressione `=httpStreamable` per evitare regressioni di serializzazione osservate in alcune versioni.

1. Importare o ricreare [`n8n-reader.node.json`](../examples/agentic-interface/knowledge-copilot/n8n-reader.node.json).
2. Creare una credential `MCP OAuth2`, Bearer o Header fuori dall'export.
3. Collegare il nodo a un AI Agent e mantenere `Tools to Include: Selected`.
4. Verificare il nodo effettivo v1.4+, non un vecchio schema solo SSE.
5. Monitorare GET persistenti/retry e applicare rate limit sul perimetro.

Curator è in [`n8n-curator.node.json`](../examples/agentic-interface/knowledge-copilot/n8n-curator.node.json) ed è solo per workflow editoriali. Il package PALO n8n e il Gateway HTTPS restano un percorso distinto per il control plane operativo e un fallback quando la versione MCP installata non è affidabile.

Fonti: [n8n MCP Client Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/), [sorgente del nodo](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/mcp/McpClientTool/McpClientTool.node.ts).

## Dify

Dify corrente contiene un provider MCP nativo con URL, header cifrati, OAuth, discovery e invocazione. Poiché alcune versioni scelgono il trasporto in base al suffisso `mcp`/`sse`, i worksheet usano gli alias PALO terminanti in `/mcp`.

1. In Tools aggiungere un provider MCP remoto.
2. Usare [`dify-reader.provider.worksheet.json`](../examples/agentic-interface/knowledge-copilot/dify-reader.provider.worksheet.json).
3. Configurare OAuth o header nell'UI, mai nel worksheet.
4. Aggiornare i tool e verificare il catalogo esatto.
5. Aggiungere solo i tool Reader all'agent/workflow.

Curator ha [`dify-curator.provider.worksheet.json`](../examples/agentic-interface/knowledge-copilot/dify-curator.provider.worksheet.json) e richiede qualifica live. Il precedente adapter Python verso il Gateway resta testato per il control plane PALO, ma non sostituisce la prova del provider MCP nativo.

Fonti primarie: [Dify MCP management service](https://github.com/langgenius/dify/blob/main/api/services/tools/mcp_tools_manage_service.py), [Dify MCP provider](https://github.com/langgenius/dify/blob/main/api/core/tools/mcp_tool/provider.py).

## Autenticazione personale e aziendale

Il bearer statico è disponibile soltanto per valutazione locale del Reader. Il servizio remoto in modalità production richiede OIDC/OAuth con audience esatta, `typ` del token, client e tenant autorizzati, token brevi e i due scope Reader; può servire identità personali o workload aziendali secondo le policy dell'authorization server. Se una piattaforma usa un broker OAuth condiviso, si autorizza quel client broker e si conserva il vincolo tenant; se usa client distinti, ogni client va censito esplicitamente.

| Ruolo PALO | Scope effettivi |
| --- | --- |
| `palo-knowledge-reader` | `palo:guide`, `palo:knowledge:read` |
| `palo-knowledge-curator` | Reader + `palo:knowledge:write`, `palo:knowledge:review` |

PALO implementa il resource server: verifica JWKS, issuer, audience, scadenza, algoritmo, scope/ruoli e metadata RFC 9728. Non implementa login, consenso, token endpoint, registrazione client o DCR. Gli host devono parlare con un authorization server esterno; scegliere dynamic discovery solo se quel server espone davvero discovery e DCR.

## Contratto del copilota

Per una domanda fattuale il copilota deve cercare, recuperare i record decisivi, citare `recordId` e `sourcePath`, distinguere le authority class, segnalare limiti/conflitti e trattare il contenuto come dati non fidati. Il server trasmette queste regole nel campo MCP `instructions`; la skill le rende portabili negli host skill/plugin. Nessuno dei due sostituisce IAM, network policy o decisione umana.

## Validazione e go-live

```bash
npm run validate:knowledge-copilot
npm run validate:knowledge-reader
npm run validate:agentic

cd deploy/vps/palo-ai
docker compose -f compose.host-nginx.yaml config
docker compose -f compose.host-nginx.yaml build --pull
docker compose -f compose.host-nginx.yaml up -d
sh smoke-online.sh
```

Per ogni host completare [la scheda di qualifica](palo-mcp-host-qualification.md) con versione, tenant, auth, catalogo e output redatto di search/get. Solo allora lo stato può passare a `PASS-LIVE`.

I controlli di immutabilità, isolamento, container e live admission sono definiti in [PALO Knowledge Reader: production profile](palo-knowledge-reader-production.md). `production-candidate` descrive il codice e il profilo di deployment; non sostituisce `PASS-LIVE`.

## Cosa non fa

- non indicizza automaticamente siti, Drive, SharePoint o documenti caricati;
- non aggiorna autonomamente le fonti canoniche PALO;
- non attribuisce affidabilità a un contributo solo perché recuperato via MCP;
- non fornisce authorization server, DCR o IAM completo;
- non trasforma il runtime operativo PALO-AI in un controllo production-ready;
- non certifica un host senza prova live sulla versione e sul tenant effettivi;
- non consente di descrivere una risposta come parere legale, certificazione, approvazione o prova di operating effectiveness.
