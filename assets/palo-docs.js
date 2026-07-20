(() => {
  const status = document.querySelector("[data-doc-action-status]");
  const say = (message) => { if (status) status.textContent = message; };
  const showManualCopy = (value) => {
    let dialog = document.querySelector("[data-copy-fallback]");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "palo-copy-dialog";
      dialog.dataset.copyFallback = "";
      dialog.innerHTML = '<form method="dialog"><h2>Copy manually</h2><p>Automatic copy is unavailable in this browser. Select the text below and copy it manually.</p><textarea readonly data-copy-fallback-text></textarea><div class="palo-actions"><button class="palo-btn" value="close">Close</button></div></form>';
      document.body.append(dialog);
    }
    const textarea = dialog.querySelector("[data-copy-fallback-text]");
    textarea.value = value;
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    textarea.focus(); textarea.select();
  };
  const copy = async (value) => {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(value); return true; }
      catch { /* Permission denied: continue to the explicit fallback. */ }
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    let copied = false;
    try { copied = Boolean(document.execCommand("copy")); } catch { copied = false; }
    textarea.remove();
    if (!copied) showManualCopy(value);
    return copied;
  };
  document.querySelector("[data-doc-copy-link]")?.addEventListener("click", async () => {
    const copied = await copy(location.href); say(copied ? "Link copied to clipboard." : "Copy unavailable—select and copy the link manually in the open dialog.");
  });
  document.querySelector("[data-doc-share]")?.addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share({ title: document.title, url: location.href }); say("Share dialog opened."); return; }
      catch (error) { if (error?.name === "AbortError") { say("Share cancelled. Nothing was sent."); return; } }
    }
    const copied = await copy(location.href); say(copied ? "Sharing is unavailable here, so the link was copied." : "Share and automatic copy are unavailable—copy the link manually in the open dialog.");
  });
  document.querySelector("[data-doc-print]")?.addEventListener("click", () => window.print());

  const matrixRows = [...document.querySelectorAll("[data-status]")];
  if (matrixRows.length) {
    const search = document.querySelector("[data-matrix-search]");
    const filters = [...document.querySelectorAll("[data-matrix-filter]")];
    const result = document.querySelector("[data-matrix-result]");
    const empty = document.querySelector("[data-matrix-empty]");
    let active = "all";
    for (const statusName of ["implemented", "prototype", "specified", "production-ready"]) {
      const count = matrixRows.filter((row) => row.dataset.status === statusName).length;
      const target = document.querySelector(`[data-matrix-count="${statusName}"]`);
      if (target) target.textContent = String(count);
    }
    const update = () => {
      const query = String(search?.value || "").trim().toLowerCase();
      let visible = 0;
      for (const row of matrixRows) {
        const show = (active === "all" || row.dataset.status === active) && (!query || row.textContent.toLowerCase().includes(query));
        row.hidden = !show;
        if (show) visible += 1;
      }
      if (result) result.textContent = `${visible} of ${matrixRows.length} capabilities shown.`;
      empty?.classList.toggle("is-visible", visible === 0);
    };
    search?.addEventListener("input", update);
    for (const button of filters) button.addEventListener("click", () => {
      active = button.dataset.matrixFilter;
      for (const item of filters) { const selected = item === button; item.classList.toggle("is-active", selected); item.setAttribute("aria-pressed", String(selected)); }
      update();
    });
    update();
  }

  const libraryCards = [...document.querySelectorAll("[data-library-card]")];
  if (libraryCards.length) {
    const search = document.querySelector("[data-library-search]");
    const category = document.querySelector("[data-library-category]");
    const audience = document.querySelector("[data-library-audience]");
    const task = document.querySelector("[data-library-task]");
    const depthButtons = [...document.querySelectorAll("[data-library-depth]")];
    let depth = depthButtons.find((button) => button.classList.contains("is-active"))?.dataset.libraryDepth || "start";
    const result = document.querySelector("[data-library-result]");
    const empty = document.querySelector("[data-library-empty]");
    const mobileLibrary = matchMedia("(max-width: 680px)");
    const syncMetadata = () => document.querySelectorAll("[data-library-meta-details]").forEach((details) => { details.open = !mobileLibrary.matches; });
    mobileLibrary.addEventListener?.("change", syncMetadata); syncMetadata();
    for (const button of document.querySelectorAll("[data-library-toggle]")) button.addEventListener("click", () => {
      const group = button.closest("[data-library-group]");
      const collapsed = group.classList.toggle("is-mobile-collapsed");
      button.setAttribute("aria-expanded", String(!collapsed));
    });
    const update = () => {
      const query = String(search?.value || "").trim().toLowerCase();
      const chosen = String(category?.value || "all");
      const chosenAudience = String(audience?.value || "all");
      const chosenTask = String(task?.value || "all");
      let visible = 0;
      for (const card of libraryCards) {
        const show = (depth === "all" || card.dataset.level === depth) && (chosen === "all" || card.dataset.category === chosen) && (chosenAudience === "all" || card.dataset.audience.split(" ").includes(chosenAudience)) && (chosenTask === "all" || card.dataset.task.split(" ").includes(chosenTask)) && (!query || card.dataset.search.includes(query));
        card.hidden = !show;
        if (show) visible += 1;
      }
      for (const group of document.querySelectorAll("[data-library-group]")) {
        const hasMatches = Boolean(group.querySelector("[data-library-card]:not([hidden])"));
        group.hidden = !hasMatches;
        if (hasMatches && (query || chosen !== "all" || chosenAudience !== "all" || chosenTask !== "all" || depth !== "start")) {
          group.classList.remove("is-mobile-collapsed");
          group.querySelector("[data-library-toggle]")?.setAttribute("aria-expanded", "true");
        }
      }
      if (result) result.textContent = `${visible} of ${libraryCards.length} public documents shown · ${depth === "all" ? "all depths" : depth + " depth"}.`;
      empty?.classList.toggle("is-visible", visible === 0);
    };
    for (const button of depthButtons) button.addEventListener("click", () => { depth = button.dataset.libraryDepth; for (const item of depthButtons) { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-pressed", String(active)); } update(); });
    search?.addEventListener("input", update); category?.addEventListener("change", update); audience?.addEventListener("change", update); task?.addEventListener("change", update); update();
  }

  const gates = [...document.querySelectorAll("[data-gate-id]")];
  if (gates.length) {
    const readinessStatus = document.querySelector("[data-readiness-status]");
    const storageKey = "palo-readiness-local-checklist-v2.5";
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { saved = {}; }
    for (const gate of gates) {
      const checkbox = gate.querySelector("[data-gate-check]");
      checkbox.checked = Boolean(saved[gate.dataset.gateId]);
      checkbox.addEventListener("change", () => {
        saved[gate.dataset.gateId] = checkbox.checked;
        localStorage.setItem(storageKey, JSON.stringify(saved));
        if (readinessStatus) readinessStatus.textContent = "Local planning state updated on this browser only.";
      });
    }
    const filters = [...document.querySelectorAll("[data-readiness-filter]")];
    const update = () => {
      const values = Object.fromEntries(filters.map((filter) => [filter.dataset.readinessFilter, filter.value]));
      let visible = 0;
      for (const gate of gates) {
        const show = (values.wave === "all" || gate.dataset.wave === values.wave) && (values.status === "all" || gate.dataset.gateStatus === values.status) && (values.owner === "all" || gate.dataset.owner === values.owner);
        gate.hidden = !show; if (show) visible += 1;
      }
      document.querySelector("[data-readiness-empty]")?.classList.toggle("is-visible", visible === 0);
      if (readinessStatus) readinessStatus.textContent = `${visible} of 9 gates shown. Checklist state remains local and non-authoritative.`;
    };
    filters.forEach((filter) => filter.addEventListener("change", update)); update();
    const snapshot = () => ({ release: "PALO-AI v2.5 developer preview", authoritative: false, generatedAt: new Date().toISOString(), note: "Browser-local planning snapshot; not implementation evidence or approval.", gates: gates.map((gate) => ({ id: gate.dataset.gateId, title: gate.querySelector("h3").textContent, wave: Number(gate.dataset.wave), status: gate.dataset.gateStatus, owner: gate.dataset.owner, locallyChecked: gate.querySelector("[data-gate-check]").checked })) });
    const download = (content, type, name) => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = name; link.click(); URL.revokeObjectURL(link.href); };
    const markdown = (value) => `# PALO-AI production-readiness snapshot\n\n> ${value.note}\n\n${value.gates.map((gate) => `- [${gate.locallyChecked ? "x" : " "}] **${gate.id} — ${gate.title}** · Wave ${gate.wave} · ${gate.status} · ${gate.owner}`).join("\n")}`;
    document.querySelector('[data-readiness-export="json"]')?.addEventListener("click", () => { download(JSON.stringify(snapshot(), null, 2), "application/json", "palo-ai-readiness-snapshot.json"); if (readinessStatus) readinessStatus.textContent = "Local JSON snapshot downloaded. Nothing was submitted."; });
    document.querySelector('[data-readiness-export="markdown"]')?.addEventListener("click", () => { download(markdown(snapshot()), "text/markdown", "palo-ai-readiness-snapshot.md"); if (readinessStatus) readinessStatus.textContent = "Local Markdown snapshot downloaded. Nothing was submitted."; });
    document.querySelector("[data-readiness-copy]")?.addEventListener("click", async () => { const copied = await copy(markdown(snapshot())); if (readinessStatus) readinessStatus.textContent = copied ? "Sanitized planning summary copied. No credentials or form data are included." : "Copy unavailable—select the sanitized summary manually in the open dialog."; });
  }

  const form = document.querySelector("[data-doc-feedback]");
  if (!form) return;
  const feedbackStatus = form.querySelector("[data-feedback-status]") || document.querySelector("[data-feedback-status]");
  const feedback = () => {
    const data = new FormData(form);
    return { document: document.body.dataset.docSource || location.pathname, role: data.get("role"), category: data.get("category"), message: String(data.get("message") || "").trim(), createdAt: new Date().toISOString(), privacy: "Prepared locally; not submitted by the website." };
  };
  const validate = (value) => {
    if (!value.message) { form.querySelector("textarea")?.focus(); if (feedbackStatus) feedbackStatus.textContent = "Add a non-sensitive message first."; return false; }
    return true;
  };
  const asText = (value) => `PALO documentation feedback\nDocument: ${value.document}\nRole: ${value.role}\nCategory: ${value.category}\n\n${value.message}\n\n${value.privacy}`;
  form.querySelector("[data-feedback-copy]")?.addEventListener("click", async () => { const value = feedback(); if (!validate(value)) return; const copied = await copy(asText(value)); if (feedbackStatus) feedbackStatus.textContent = copied ? "Feedback copied. Nothing was sent." : "Copy unavailable—select the feedback manually in the open dialog. Nothing was sent."; });
  form.querySelector("[data-feedback-download]")?.addEventListener("click", () => { const value = feedback(); if (!validate(value)) return; const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); link.download = "palo-documentation-feedback.json"; link.click(); URL.revokeObjectURL(link.href); if (feedbackStatus) feedbackStatus.textContent = "Local JSON downloaded. Nothing was sent."; });
  form.querySelector("[data-feedback-email]")?.addEventListener("click", () => { const value = feedback(); if (!validate(value)) return; location.href = `mailto:contact@paloframework.org?subject=${encodeURIComponent(`PALO documentation feedback: ${value.category}`)}&body=${encodeURIComponent(asText(value))}`; if (feedbackStatus) feedbackStatus.textContent = "Email draft opened. You decide whether to send it."; });
})();
