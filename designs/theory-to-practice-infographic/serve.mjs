import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const explorerRoot = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(explorerRoot, "../..");
const explorerPath = "designs/theory-to-practice-infographic/index.html";
const requestedPort = Number(process.argv[2] || 4173);
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

const server = createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = pathname === "/" ? explorerPath : pathname.replace(/^\/+/, "");
    const target = resolve(root, relative);
    if (target !== root && !target.startsWith(root + sep)) throw new Error("Path outside explorer root");
    const stats = statSync(target);
    if (!stats.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Type": mime[extname(target).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Cross-Origin-Resource-Policy": "same-origin"
    });
    createReadStream(target).pipe(response);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
  }
});

server.listen(requestedPort, "127.0.0.1", () => {
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}/designs/theory-to-practice-infographic/index.html`;
  console.log(`PALO explorer: ${base}`);
  console.log(`Self-test:     ${base}?selfTest=1`);
});
