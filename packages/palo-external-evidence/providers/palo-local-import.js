import { readFile, stat } from "node:fs/promises";
import { validateExternalEvidenceCollection } from "../validation.js";

export const DEFAULT_LOCAL_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export async function importLocalCollection({ inputFile, maxBytes = DEFAULT_LOCAL_IMPORT_MAX_BYTES } = {}) {
  if (typeof inputFile !== "string" || inputFile.trim().length === 0) throw new TypeError("inputFile is required for local import");
  if (!Number.isInteger(maxBytes) || maxBytes < 1024 || maxBytes > 20 * 1024 * 1024) throw new RangeError("maxBytes is outside the supported local-import boundary");
  const metadata = await stat(inputFile);
  if (!metadata.isFile()) throw new TypeError("local import input must be a regular file");
  if (metadata.size > maxBytes) throw new RangeError(`local import exceeds ${maxBytes} bytes`);
  const content = await readFile(inputFile);
  if (content.byteLength > maxBytes) throw new RangeError(`local import exceeds ${maxBytes} bytes`);
  let collection;
  try { collection = JSON.parse(content.toString("utf8")); }
  catch { throw new TypeError("local import is not valid JSON"); }
  return validateExternalEvidenceCollection(collection);
}
