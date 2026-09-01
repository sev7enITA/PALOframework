# PALO Knowledge Copilot client examples

Questa directory raccoglie configurazioni e worksheet per collegare host MCP ai due profili PALO dedicati alla knowledge base.

| Profilo | Endpoint canonico | Alias compatibile | Catalogo |
|---|---|---|---:|
| Reader | `/mcp-guide` | `/mcp-guide/mcp` | 6 strumenti read-only |
| Curator | `/mcp-guide-curator` | `/mcp-guide-curator/mcp` | 10 strumenti, inclusi draft e review controllati |

Il Reader remoto è un servizio dedicato `production-candidate`: stateless, OIDC-only in production, senza volume e limitato al bundle canonico verificato. Diventa `production-qualified` solo dopo i [gate live](../../../docs/palo-knowledge-reader-production.md). Il Curator conserva un diverso boundary e non eredita automaticamente questo stato.

## Artifact disponibili

| Host | Reader | Curator | Nota |
|---|---|---|---|
| Copilot Studio | `copilot-studio-reader.openapi.yaml` | `copilot-studio-curator.openapi.yaml` | OpenAPI per il wizard Streamable HTTP |
| Claude | skill condivisa in `skills/palo-knowledge-copilot` | stessa skill | Il remote connector si configura nell'interfaccia Claude |
| ChatGPT/Codex | `codex-reader.config.toml`, `openai-reader.responses-tool.json` | `codex-curator.config.toml`, `openai-curator.responses-tool.json` | Codex e Responses API sono percorsi distinti |
| GitHub Copilot | `github-copilot-reader.mcp.json` | `github-copilot-curator.mcp.json` | Sostituire il placeholder usando un secret store locale |
| VS Code | `vscode-reader.mcp.json` | `vscode-curator.mcp.json` | Token acquisito tramite input protetto |
| Cursor | `cursor-reader.mcp.json` | `cursor-curator.mcp.json` | Configurazione HTTP con OAuth |
| Gemini CLI | `gemini-reader.settings.json` | `gemini-curator.settings.json` | OAuth dynamic discovery e allowlist esatta |
| JetBrains | `jetbrains-reader.mcp.json` | `jetbrains-curator.mcp.json` | URL verificato; autenticazione da collaudare nella build target |
| AWS AgentCore | `aws-agentcore-reader-target.worksheet.json` | `aws-agentcore-curator-target.worksheet.json` | Worksheet, non import diretto |
| n8n | `n8n-reader.node.json` | `n8n-curator.node.json` | MCP Client Tool v1.4+, Streamable HTTP forzato |
| Dify | `dify-reader.provider.worksheet.json` | `dify-curator.provider.worksheet.json` | Worksheet, non import diretto; usare l'alias che termina in `/mcp` |

`host-conformance.json` è la fonte machine-readable per stato, fonti ufficiali, trasporto, autenticazione e artifact. I worksheet dichiarati `importable: false` devono essere tradotti nel wizard o nell'API della versione effettivamente installata.

Non inserire token nei file. Le stringhe `REPLACE_*` sono placeholder intenzionali; i valori reali devono arrivare da secret store, variabili d'ambiente protette o dal wizard OAuth dell'host.

## Verifica

```bash
npm run validate:knowledge-copilot
npm run validate:knowledge-reader
```

La guida completa è [`docs/palo-knowledge-copilot-integrations.md`](../../../docs/palo-knowledge-copilot-integrations.md); la prova live segue [`docs/palo-mcp-host-qualification.md`](../../../docs/palo-mcp-host-qualification.md).
