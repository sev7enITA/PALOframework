import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALO_KNOWLEDGE_CANONICAL_FILES } from "./knowledge-catalog.js";

const defaultRepositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const releaseManifestPath = "data/knowledge-reader-release.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function assertReleasePath(relativePath, repositoryRoot) {
  if (!relativePath || path.isAbsolute(relativePath)) throw new Error("Knowledge release contains an invalid file path");
  const resolved = path.resolve(repositoryRoot, relativePath);
  if (!resolved.startsWith(`${path.resolve(repositoryRoot)}${path.sep}`)) throw new Error("Knowledge release file escapes the repository root");
  return resolved;
}

export function verifyKnowledgeReaderRelease({ repositoryRoot = defaultRepositoryRoot, manifestPath = releaseManifestPath } = {}) {
  const root = path.resolve(repositoryRoot);
  const manifestFile = assertReleasePath(manifestPath, root);
  const release = JSON.parse(readFileSync(manifestFile, "utf8"));
  if (release.format !== "palo-knowledge-reader-release" || release.schemaVersion !== "1.0.0") {
    throw new Error("Unsupported PALO Knowledge Reader release manifest");
  }
  if (release.status !== "production-candidate" || release.contentPolicy !== "canonical-immutable-only") {
    throw new Error("Knowledge Reader release is not admitted for immutable canonical serving");
  }
  if (release.serviceVersion !== "1.0.0" || release.frameworkRelease !== "3.1.0") {
    throw new Error("Knowledge Reader release version does not match this runtime");
  }
  const expectedPaths = PALO_KNOWLEDGE_CANONICAL_FILES.map((entry) => entry.path);
  const actualPaths = Array.isArray(release.files) ? release.files.map((entry) => entry.path) : [];
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error("Knowledge Reader release file set does not match the canonical catalog");
  }
  const verifiedFiles = release.files.map((entry) => {
    if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 || ""))) throw new Error(`Invalid digest for ${entry.path}`);
    const actualSha256 = sha256(readFileSync(assertReleasePath(entry.path, root)));
    if (actualSha256 !== entry.sha256) throw new Error(`Knowledge Reader integrity check failed for ${entry.path}`);
    return { path: entry.path, sha256: actualSha256 };
  });
  const bundleSha256 = sha256(JSON.stringify(verifiedFiles));
  if (bundleSha256 !== release.bundleSha256) throw new Error("Knowledge Reader bundle digest does not match its release manifest");
  return Object.freeze({
    verified: true,
    serviceVersion: release.serviceVersion,
    frameworkRelease: release.frameworkRelease,
    status: release.status,
    contentPolicy: release.contentPolicy,
    bundleSha256,
    files: verifiedFiles
  });
}

export const PALO_KNOWLEDGE_READER_RELEASE_MANIFEST = releaseManifestPath;
