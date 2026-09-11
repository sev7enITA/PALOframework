import test from "node:test";
import assert from "node:assert/strict";
import { ClientCredentialsTokenProvider } from "./token-provider.js";

test("Reader client-credentials token is cached before its expiry window", async () => {
  let calls = 0; let now = 1_000_000;
  const provider = new ClientCredentialsTokenProvider({ tokenEndpoint: "https://login.example.test/token", clientId: "client", clientSecret: "secret", scope: "reader/.default" }, {
    now: () => now,
    fetchImpl: async (_url, init) => {
      calls += 1;
      assert.match(String(init.body), /grant_type=client_credentials/);
      return new Response(JSON.stringify({ access_token: "access-token-at-least-twenty-four-bytes", token_type: "Bearer", expires_in: 3600 }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  assert.equal(await provider.getToken(), "access-token-at-least-twenty-four-bytes");
  now += 1000;
  assert.equal(await provider.getToken(), "access-token-at-least-twenty-four-bytes");
  assert.equal(calls, 1);
});
