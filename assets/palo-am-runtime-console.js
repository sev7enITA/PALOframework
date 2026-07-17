(function () {
  "use strict";
  var state = { profile: null, decisions: [], selectedApproval: null };
  var status = document.getElementById("am-runtime-status");
  if (!status) return;

  function show(value, error) {
    status.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    status.setAttribute("data-state", error ? "error" : "ready");
    if (error) status.setAttribute("role", "alert"); else status.removeAttribute("role");
  }

  function readFiles(input, handler) {
    Array.prototype.forEach.call(input.files || [], function (file) {
      var reader = new FileReader();
      reader.onload = function () { try { handler(JSON.parse(reader.result)); } catch (error) { show("Import rejected: " + error.message, true); } };
      reader.onerror = function () { show("Import failed: the selected file could not be read.", true); };
      reader.readAsText(file);
    });
  }

  function profile(value) {
    if (!value || value.format !== "palo-agentic-interface" || value.schemaVersion !== "1.1.0" || !value.agentId || !value.authority) throw new Error("not a PALO Agent Profile 1.1.0");
    state.profile = value; show({ imported: "profile", agentId: value.agentId, profileVersion: value.profileVersion, allowedTools: value.authority.allowedTools });
  }

  function decision(value) {
    if (!value || value.format !== "palo-agentic-policy-decision" || !value.claimDigest || !value.decisionId) throw new Error("not a PALO policy decision");
    if (state.profile && value.agentId !== state.profile.agentId) throw new Error("decision agent does not match the imported profile");
    state.decisions = state.decisions.filter(function (item) { return item.decisionId !== value.decisionId; }).concat([value]);
    show({ imported: "policy-decision", count: state.decisions.length, latest: value });
  }

  function approval(value) {
    if (!value || value.format !== "palo-agentic-approval" || !value.approvalId || !value.claimDigest) throw new Error("not a PALO approval packet");
    state.selectedApproval = value; show({ review: "exact Action Claim approval", approval: value, profile: state.profile ? { agentId: state.profile.agentId, profileVersion: state.profile.profileVersion } : null });
  }

  function gateway(route, method, payload) {
    var base = document.getElementById("am-gateway-url").value.replace(/\/$/, "");
    var token = document.getElementById("am-gateway-token").value;
    if (!/^https:\/\//.test(base) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) return Promise.reject(new Error("Use HTTPS, except for localhost development"));
    if (token.length < 24) return Promise.reject(new Error("A bearer token of at least 24 characters is required"));
    return fetch(base + route, { method: method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined })
      .then(function (response) { return response.json().then(function (body) { if (!response.ok) throw new Error(body.message || body.error || "Gateway rejected the request"); return body; }); });
  }

  function resolve(nextStatus) {
    if (!state.selectedApproval) return show("Select or import an exact approval packet first.", true);
    var resolver = document.getElementById("am-resolver").value.trim(); var rationale = document.getElementById("am-rationale").value.trim();
    if (!resolver || !rationale) return show("Resolver identity and rationale are required.", true);
    gateway("/v1/approvals/resolve", "POST", { approvalId: state.selectedApproval.approvalId, status: nextStatus, resolvedBy: resolver, rationale: rationale })
      .then(function (value) { state.selectedApproval = value; show(value); }).catch(function (error) { show("Resolution failed closed: " + error.message, true); });
  }

  document.getElementById("am-profile-import").addEventListener("change", function () { readFiles(this, profile); });
  document.getElementById("am-decision-import").addEventListener("change", function () { readFiles(this, decision); });
  document.getElementById("am-approval-import").addEventListener("change", function () { readFiles(this, approval); });
  document.getElementById("am-load-approvals").addEventListener("click", function () { gateway("/v1/approvals?status=pending", "GET").then(function (items) { state.selectedApproval = items[0] || null; show({ count: items.length, selected: state.selectedApproval, approvals: items }); }).catch(function (error) { show("Approval queue failed closed: " + error.message, true); }); });
  document.getElementById("am-approve").addEventListener("click", function () { resolve("approved"); });
  document.getElementById("am-deny").addEventListener("click", function () { resolve("denied"); });
  document.getElementById("am-export-contracts").addEventListener("click", function () {
    var packet = { format: "palo-am-runtime-exchange", schemaVersion: "1.0.0", exportedAt: new Date().toISOString(), profile: state.profile, policyDecisions: state.decisions, approval: state.selectedApproval };
    window.paloDownload("palo-am-runtime-exchange.json", JSON.stringify(packet, null, 2) + "\n", "application/json;charset=utf-8");
  });
  window.PALOAMContracts = { snapshot: function () { return { profile: state.profile, policyDecisions: state.decisions.slice(), approval: state.selectedApproval }; } };
}());
