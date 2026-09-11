import test from "node:test";
import assert from "node:assert/strict";
import { loadCopilotConfig } from "./config.js";
import { safeReturnTarget } from "./oidc.js";

const token = "reader-development-token-at-least-32-bytes";
const development = (extra = {}) => ({
  PALO_COPILOT_MODE: "development",
  PALO_COPILOT_PUBLIC_URL: "http://127.0.0.1:8792",
  PALO_COPILOT_ALLOWED_ORIGINS: "http://127.0.0.1:4173",
  PALO_COPILOT_READER_URL: "http://127.0.0.1:8789/mcp",
  PALO_COPILOT_READER_AUTH: "shared-token",
  PALO_COPILOT_READER_TOKEN: token,
  ...extra
});

test("development configuration admits loopback, shared Reader token and extractive mode", () => {
  const config = loadCopilotConfig(development());
  assert.equal(config.mode, "development");
  assert.equal(config.reader.authMode, "shared-token");
  assert.equal(config.model.provider, "extractive");
  assert.equal(config.allowedOrigins[0], "http://127.0.0.1:4173");
});

test("production configuration fails closed without durable sessions, OIDC, Reader identity and a model", () => {
  assert.throws(() => loadCopilotConfig(development({
    PALO_COPILOT_MODE: "production",
    PALO_COPILOT_PUBLIC_URL: "https://copilot-api.example.test",
    PALO_COPILOT_ALLOWED_ORIGINS: "https://example.test",
    PALO_COPILOT_READER_URL: "https://reader.example.test/mcp-guide"
  })), /Production Copilot configuration is incomplete/);
});

test("production configuration admits only the complete durable identity and model profile", () => {
  const config = loadCopilotConfig({
    PALO_COPILOT_MODE: "production",
    PALO_COPILOT_PUBLIC_URL: "https://copilot-api.example.test",
    PALO_COPILOT_ALLOWED_ORIGINS: "https://example.test",
    PALO_COPILOT_DATABASE_URL: "postgresql://copilot:secret@database.example.test/copilot",
    PALO_COPILOT_OIDC_ISSUER: "https://login.example.test/tenant/v2.0",
    PALO_COPILOT_OIDC_AUTHORIZATION_ENDPOINT: "https://login.example.test/tenant/oauth2/v2.0/authorize",
    PALO_COPILOT_OIDC_TOKEN_ENDPOINT: "https://login.example.test/tenant/oauth2/v2.0/token",
    PALO_COPILOT_OIDC_JWKS_URI: "https://login.example.test/tenant/discovery/v2.0/keys",
    PALO_COPILOT_OIDC_CLIENT_ID: "web-client",
    PALO_COPILOT_OIDC_CLIENT_SECRET: "web-client-secret",
    PALO_COPILOT_OIDC_AUDIENCE: "web-client",
    PALO_COPILOT_OIDC_ID_TOKEN_TYPE: "JWT",
    PALO_COPILOT_OIDC_ALLOWED_TENANTS: "tenant",
    PALO_COPILOT_READER_URL: "https://reader.example.test/mcp-guide",
    PALO_COPILOT_READER_AUTH: "client-credentials",
    PALO_COPILOT_READER_TOKEN_ENDPOINT: "https://login.example.test/tenant/oauth2/v2.0/token",
    PALO_COPILOT_READER_CLIENT_ID: "reader-client",
    PALO_COPILOT_READER_CLIENT_SECRET: "reader-client-secret",
    PALO_COPILOT_READER_SCOPE: "api://reader/.default",
    PALO_COPILOT_MODEL_PROVIDER: "openai",
    PALO_COPILOT_OPENAI_API_KEY: "project-model-key",
    PALO_COPILOT_OPENAI_MODEL: "approved-model",
    PALO_COPILOT_TRUST_PROXY: "true"
  });
  assert.equal(config.mode, "production");
  assert.equal(config.oidc.idTokenType, "JWT");
  assert.equal(config.reader.authMode, "client-credentials");
  assert.equal(config.model.provider, "openai");
  assert.equal(config.databaseSsl, true);
});

test("return targets remain within the exact frontend origin allowlist", () => {
  const config = loadCopilotConfig(development());
  assert.equal(safeReturnTarget("/governance-hub/?view=ask", config), "http://127.0.0.1:4173/governance-hub/?view=ask");
  assert.equal(safeReturnTarget("/governance-hub/?view=ask&question=private#fragment", config), "http://127.0.0.1:4173/governance-hub/?view=ask");
  assert.equal(safeReturnTarget("https://attacker.example/phish", config), "http://127.0.0.1:4173/governance-hub/?view=ask");
  assert.equal(safeReturnTarget("//attacker.example/phish", config), "http://127.0.0.1:4173/governance-hub/?view=ask");
});
