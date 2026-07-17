(function () {
  "use strict";
  var form = document.getElementById("vibe-tool-gate"); var output = document.getElementById("vibe-gate-result");
  if (!form || !output) return;
  function hash(text) {
    if (!window.crypto || !window.crypto.subtle) return Promise.reject(new Error("Web Crypto is required to create gate evidence"));
    return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (bytes) { return "sha256:" + Array.prototype.map.call(new Uint8Array(bytes), function (value) { return value.toString(16).padStart(2, "0"); }).join(""); });
  }
  form.addEventListener("submit", function (event) {
    event.preventDefault(); var data = new FormData(form); var checks = ["intent", "environment", "secrets", "tests", "review"];
    var missing = checks.filter(function (name) { return !data.get(name); });
    if (missing.length) { output.textContent = "DENIED — incomplete gate: " + missing.join(", "); output.setAttribute("role", "alert"); return; }
    var evidence = String(data.get("evidence") || "").trim(); var gateId = "vibe-gate-" + (window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now());
    var record = { gateId: gateId, evaluatedAt: new Date().toISOString(), evidenceReference: evidence, checks: checks };
    hash(JSON.stringify(record)).then(function (digest) {
      var claimMetadata = { vibeGate: { status: "passed", gateId: gateId, evidenceDigest: digest } };
      output.textContent = "DEVELOPER PREVIEW — self-attested metadata, not trusted authorization evidence.\n" + JSON.stringify({ gateRecord: record, actionClaimMetadata: claimMetadata }, null, 2); output.removeAttribute("role");
      document.documentElement.setAttribute("data-vibe-gate", "passed");
    }).catch(function (error) { output.textContent = "DENIED — " + error.message; output.setAttribute("role", "alert"); });
  });
  form.addEventListener("reset", function () { output.textContent = "Preview metadata not generated. This demonstration does not control any coding tool."; document.documentElement.setAttribute("data-vibe-gate", "denied"); });
}());
