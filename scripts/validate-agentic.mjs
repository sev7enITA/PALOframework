import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const names = ["palo-agentic-interface", "palo-agentic-action-claim", "palo-agentic-policy", "palo-agentic-policy-input", "palo-agentic-policy-decision", "palo-agentic-approval", "palo-agentic-evidence-envelope"];
const errors = [];
const loaded = {};
for (const name of names) {
  loaded[name] = JSON.parse(await readFile(`schemas/${name}.schema.json`, "utf8"));
  ajv.addSchema(loaded[name]);
}
for (const name of names) {
  const fixture = name === "palo-agentic-policy-input"
    ? { claim: JSON.parse(await readFile("schemas/fixtures/palo-agentic-action-claim.valid.json", "utf8")), claim_digest: `sha256:${"a".repeat(64)}`, profile: JSON.parse(await readFile("schemas/fixtures/palo-agentic-interface.valid.json", "utf8")), policy: JSON.parse(await readFile("schemas/fixtures/palo-agentic-policy.valid.json", "utf8")), approval: null, now: "2026-07-17T10:00:00Z" }
    : JSON.parse(await readFile(`schemas/fixtures/${name}.valid.json`, "utf8"));
  const validate = ajv.getSchema(loaded[name].$id);
  if (!validate(fixture)) errors.push(`${name} valid fixture: ${ajv.errorsText(validate.errors)}`);
  const invalid = structuredClone(fixture);
  invalid.schemaVersion = "0.0.0";
  if (validate(invalid)) errors.push(`${name} accepted an invalid schemaVersion`);
}

const expectedTools = [
  "palo_get_approval_status", "palo_get_registry", "palo_list_approvals", "palo_register_agent", "palo_register_policy",
  "palo_request_approval", "palo_resolve_approval", "palo_submit_evidence", "palo_verify_action_authority", "palo_verify_evidence", "palo_verify_ledger"
].sort();
const spec = JSON.parse(await readFile("examples/agentic-interface/mcp-server-spec.json", "utf8"));
const documentedTools = (spec.tools || []).map((tool) => tool.name).sort();
if (JSON.stringify(documentedTools) !== JSON.stringify(expectedTools)) errors.push("MCP server specification is out of sync with executable tools");

let opa = process.env.PALO_OPA_BIN || path.resolve(".tools/opa/opa");
try { await access(opa); }
catch { opa = "opa"; }
const opaCheck = spawnSync(opa, ["check", "examples/policy-as-code"], { encoding: "utf8" });
if (opaCheck.error?.code === "ENOENT") errors.push("OPA is required; run npm run opa:install or set PALO_OPA_BIN");
else if (opaCheck.status !== 0) errors.push(`OPA check failed: ${opaCheck.stderr || opaCheck.stdout}`);
const opaTest = spawnSync(opa, ["test", "examples/policy-as-code"], { encoding: "utf8" });
if (!opaTest.error && opaTest.status !== 0) errors.push(`OPA tests failed: ${opaTest.stderr || opaTest.stdout}`);

if (errors.length) {
  console.error(`Agentic validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Agentic validation passed: ${names.length} contracts, ${expectedTools.length} MCP tools, OPA compile and policy tests.`);
}
