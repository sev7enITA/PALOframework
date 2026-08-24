import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { evaluateProductionAdmission, validateProductionProfile } from "../packages/palo-mcp-server/production-admission.js";

const args = process.argv.slice(2);
const schemaOnly = args.includes("--schema-only");
const profileArgument = args.find((argument) => !argument.startsWith("--"));

if (!profileArgument) {
  console.error("Usage: npm run production:admission -- <profile.json> [--schema-only]");
  process.exitCode = 2;
} else {
  try {
    const profilePath = path.resolve(profileArgument);
    const profile = JSON.parse(await readFile(profilePath, "utf8"));
    const validated = validateProductionProfile(profile);
    if (schemaOnly) {
      console.log(JSON.stringify({ status: "schema-valid", profileId: validated.profileId, deploymentId: validated.deploymentId, environment: validated.environment }, null, 2));
    } else {
      const result = evaluateProductionAdmission(validated);
      console.log(JSON.stringify({ status: result.status, profileId: validated.profileId, deploymentId: validated.deploymentId, reasons: result.reasons, authorityBoundary: result.authorityBoundary }, null, 2));
      if (result.status === "denied") process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Production profile validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
