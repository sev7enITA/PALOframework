import { timingSafeEqual } from "node:crypto";
import {
  OAuthError,
  OAuthErrorCode,
  bearerAuthChallengeResponse,
  getOAuthProtectedResourceMetadataUrl,
  requireBearerAuth
} from "@modelcontextprotocol/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const PALO_SCOPES = Object.freeze([
  "palo:guide",
  "palo:read",
  "palo:execute",
  "palo:review",
  "palo:audit",
  "palo:admin"
]);

export const TOOL_SCOPE_REQUIREMENTS = Object.freeze({
  palo_explain_framework: "palo:guide",
  palo_infer_governance_route: "palo:guide",
  palo_plan_product_integration: "palo:guide",
  palo_register_agent: "palo:admin",
  palo_register_policy: "palo:admin",
  palo_get_registry: "palo:read",
  palo_import_context_evidence: "palo:admin",
  palo_list_context_evidence: "palo:read",
  palo_register_data_fitness_policy: "palo:admin",
  palo_evaluate_data_fitness: "palo:execute",
  palo_get_data_fitness_decision: "palo:read",
  palo_register_disclosure_contract: "palo:admin",
  palo_get_disclosure_contract: "palo:read",
  palo_register_ai_system: "palo:admin",
  palo_get_ai_system: "palo:read",
  palo_list_ai_systems: "palo:read",
  palo_ingest_assurance_signal: "palo:admin",
  palo_list_assurance_signals: "palo:audit",
  palo_register_executor: "palo:admin",
  palo_register_verifier: "palo:admin",
  palo_verify_action_authority: "palo:execute",
  palo_execute_governed_action: "palo:execute",
  palo_get_execution_status: "palo:read",
  palo_verify_outcome: "palo:execute",
  palo_request_approval: "palo:execute",
  palo_get_approval_status: "palo:read",
  palo_list_approvals: "palo:read",
  palo_resolve_approval: "palo:review",
  palo_get_assurance_task: "palo:read",
  palo_list_assurance_tasks: "palo:read",
  palo_process_due_tasks: "palo:admin",
  palo_get_operational_snapshot: "palo:read",
  palo_submit_evidence: "palo:admin",
  palo_verify_evidence: "palo:audit",
  palo_verify_ledger: "palo:audit",
  palo_list_incidents: "palo:audit",
  palo_get_incident: "palo:audit",
  palo_resolve_incident: "palo:review"
});

const ROLE_SCOPES = Object.freeze({
  "palo-admin": ["palo:*"],
  "palo-agent": ["palo:guide", "palo:read", "palo:execute"],
  "palo-reviewer": ["palo:guide", "palo:read", "palo:review"],
  "palo-auditor": ["palo:guide", "palo:read", "palo:audit"],
  "palo-observer": ["palo:guide", "palo:read"]
});

const values = (value) => {
  if (Array.isArray(value)) return value.flatMap(values);
  if (typeof value === "string") return value.split(/[\s,]+/).map((entry) => entry.trim()).filter(Boolean);
  return [];
};

const unique = (items) => [...new Set(items)];

function secureConfigurationUrl(value, label) {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) throw new Error(`${label} must use HTTPS outside loopback development`);
  if (url.hash) throw new Error(`${label} must not contain a fragment`);
  return url;
}

export function hasScope(scopes, requiredScope) {
  const granted = new Set(values(scopes));
  return granted.has("palo:*") || granted.has(requiredScope);
}

export function authorizedToolNames(authInfo, exposedTools) {
  const candidates = exposedTools || Object.keys(TOOL_SCOPE_REQUIREMENTS);
  return candidates.filter((name) => {
    const required = TOOL_SCOPE_REQUIREMENTS[name];
    return required && hasScope(authInfo?.scopes || [], required);
  });
}

function rolesFromPayload(payload, roleClaim) {
  const direct = values(payload[roleClaim]);
  const realm = values(payload.realm_access?.roles);
  return unique([...direct, ...realm]);
}

export function createOidcTokenVerifier(configuration) {
  const { issuer, audience, jwksUri, resourceUrl } = configuration;
  if (!issuer || !audience || !jwksUri || !resourceUrl) throw new Error("OIDC requires issuer, audience, jwksUri and resourceUrl");
  secureConfigurationUrl(issuer, "OIDC issuer");
  secureConfigurationUrl(resourceUrl, "MCP resource URL");
  if (!values(audience).includes(resourceUrl)) throw new Error("OIDC audience must include the canonical MCP resource URL");
  const jwks = createRemoteJWKSet(secureConfigurationUrl(jwksUri, "OIDC JWKS URI"), {
    cooldownDuration: configuration.jwksCooldownMs ?? 30_000,
    cacheMaxAge: configuration.jwksCacheMaxAgeMs ?? 600_000,
    timeoutDuration: configuration.jwksTimeoutMs ?? 5_000
  });
  const algorithms = configuration.algorithms || ["RS256", "PS256", "ES256", "EdDSA"];
  const scopeClaim = configuration.scopeClaim || "scope";
  const roleClaim = configuration.roleClaim || "roles";
  const clientIdClaim = configuration.clientIdClaim || "azp";
  const tenantClaim = configuration.tenantClaim || "tid";
  return {
    async verifyAccessToken(token) {
      try {
        const { payload, protectedHeader } = await jwtVerify(token, jwks, {
          issuer,
          audience,
          algorithms,
          clockTolerance: configuration.clockToleranceSeconds ?? 5
        });
        if (!payload.exp) throw new Error("Token expiry is required");
        const roles = rolesFromPayload(payload, roleClaim);
        const scopes = unique([
          ...values(payload[scopeClaim]),
          ...values(payload.scp),
          ...roles.flatMap((role) => ROLE_SCOPES[role] || [])
        ]);
        const clientId = String(payload[clientIdClaim] || payload.client_id || payload.sub || "");
        if (!clientId) throw new Error("Token client identity is required");
        return {
          token,
          clientId,
          scopes,
          expiresAt: payload.exp,
          resource: new URL(resourceUrl),
          extra: {
            authMode: "oidc",
            subject: typeof payload.sub === "string" ? payload.sub : undefined,
            issuer: payload.iss,
            roles,
            tenantId: typeof payload[tenantClaim] === "string" ? payload[tenantClaim] : undefined,
            keyId: protectedHeader.kid
          }
        };
      } catch (error) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, "Access token validation failed");
      }
    }
  };
}

function sharedTokenAuthInfo(token) {
  return {
    token,
    clientId: "palo-shared-token",
    scopes: ["palo:*"],
    expiresAt: Math.floor(Date.now() / 1000) + 300,
    extra: { authMode: "shared-token" }
  };
}

function constantTimeBearer(header, token) {
  const actual = Buffer.from(header || "");
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createPaloAuth({ token, oidc } = {}) {
  if (oidc) {
    const verifier = createOidcTokenVerifier(oidc);
    const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(new URL(oidc.resourceUrl));
    const gate = requireBearerAuth({ verifier, resourceMetadataUrl });
    return {
      mode: "oidc",
      resourceMetadataUrl,
      metadata: {
        resource: oidc.resourceUrl,
        authorization_servers: [oidc.issuer],
        scopes_supported: PALO_SCOPES,
        bearer_methods_supported: ["header"],
        resource_name: "PALO governance MCP"
      },
      authenticate: gate
    };
  }
  if (!token || Buffer.byteLength(token) < 24) throw new Error("PALO_MCP_HTTP_TOKEN must contain at least 24 bytes");
  return {
    mode: "shared-token",
    authenticate: async (request) => constantTimeBearer(request.headers.get("authorization"), token)
      ? sharedTokenAuthInfo(token)
      : new Response(JSON.stringify({ error: "invalid_token", error_description: "Bearer token required" }), {
        status: 401,
        headers: { "content-type": "application/json", "WWW-Authenticate": "Bearer" }
      })
  };
}

export function insufficientScopeResponse(requiredScope, resourceMetadataUrl) {
  return bearerAuthChallengeResponse(
    new OAuthError(OAuthErrorCode.InsufficientScope, "The access token does not grant this PALO operation"),
    { requiredScopes: [requiredScope], resourceMetadataUrl }
  );
}

export function toolNameFromRequest(request, parsedBody) {
  return request.headers.get("mcp-name") || (parsedBody?.method === "tools/call" ? parsedBody.params?.name : undefined);
}

export function oidcConfigurationFromEnvironment(environment = process.env) {
  const mode = String(environment.PALO_AUTH_MODE || "").toLowerCase();
  if (mode && !["oidc", "shared-token"].includes(mode)) throw new Error("PALO_AUTH_MODE must be oidc or shared-token");
  if (mode === "shared-token" || (mode !== "oidc" && !environment.PALO_OIDC_ISSUER)) return undefined;
  return {
    issuer: environment.PALO_OIDC_ISSUER,
    audience: environment.PALO_OIDC_AUDIENCE,
    jwksUri: environment.PALO_OIDC_JWKS_URI,
    resourceUrl: environment.PALO_MCP_PUBLIC_URL,
    roleClaim: environment.PALO_OIDC_ROLE_CLAIM || "roles",
    scopeClaim: environment.PALO_OIDC_SCOPE_CLAIM || "scope",
    clientIdClaim: environment.PALO_OIDC_CLIENT_ID_CLAIM || "azp",
    tenantClaim: environment.PALO_OIDC_TENANT_CLAIM || "tid",
    algorithms: values(environment.PALO_OIDC_ALGORITHMS || "RS256 PS256 ES256 EdDSA")
  };
}
