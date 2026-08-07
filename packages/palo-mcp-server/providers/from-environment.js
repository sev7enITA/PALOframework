import path from "node:path";
import { createMicrosoftAgtAcsProvider } from "./microsoft-agt-acs.js";

export async function loadEnforcementProviderFromEnvironment(environment = process.env) {
  const selected = String(environment.PALO_ENFORCEMENT_PROVIDER || "opa").trim().toLowerCase();
  if (!selected || selected === "opa" || selected === "palo-opa") return undefined;
  if (selected !== "microsoft-agt-acs" && selected !== "agt-acs") throw new Error(`Unsupported PALO_ENFORCEMENT_PROVIDER: ${selected}`);
  const manifestPath = environment.PALO_AGT_ACS_MANIFEST;
  if (!manifestPath) throw new Error("PALO_AGT_ACS_MANIFEST is required when Microsoft AGT ACS is selected");
  let sdk;
  try { sdk = await import("agent-control-specification"); }
  catch (error) { throw new Error(`Install agent-control-specification@0.3.1-beta.0 to use the AGT provider: ${error.message}`); }
  if (!sdk.AgentControl?.fromPath) throw new Error("Installed agent-control-specification package does not expose AgentControl.fromPath");
  const resolvedManifestPath = path.resolve(manifestPath);
  const agentControl = sdk.AgentControl.fromPath(resolvedManifestPath);
  return createMicrosoftAgtAcsProvider({
    agentControl,
    acsVersion: environment.PALO_AGT_ACS_VERSION || "0.3.1-beta.0",
    policyReference: environment.PALO_AGT_POLICY_REFERENCE || `microsoft-agt-acs/${environment.PALO_AGT_ACS_VERSION || "0.3.1-beta.0"}`,
    evaluationMode: environment.PALO_AGT_EVALUATION_MODE || "enforce"
  });
}
