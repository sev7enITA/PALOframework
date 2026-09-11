export async function boundedJson(response, maximumBytes = 256 * 1024, label = "Upstream") {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json") || !response.body) throw new Error(`${label} did not return JSON`);
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) { await reader.cancel(); throw new Error(`${label} response exceeds its maximum size`); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error(`${label} returned malformed JSON`); }
}

export function createBoundedFetch(fetchImpl = fetch, maximumBytes = 1024 * 1024, label = "Upstream") {
  return async (...arguments_) => {
    const response = await fetchImpl(...arguments_);
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maximumBytes) throw statusError(`${label} response exceeds its maximum size`, 502, "upstream_response_too_large");
    if (!response.body) return response;
    const reader = response.body.getReader(); const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw statusError(`${label} response exceeds its maximum size`, 502, "upstream_response_too_large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}

export function statusError(message, status, code = "request_rejected") {
  return Object.assign(new Error(message), { status, code });
}
