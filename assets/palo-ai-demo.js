(function () {
  "use strict";

  const scenarios = {
    without: {
      title: "The tool executes before governance can intervene.",
      badge: "Direct execution",
      risk: true,
      narrative:
        "The agent reaches a privileged tool directly. There is no explicit authority profile, immutable approval, trusted receipt or post-execution verification.",
      steps: [
        "Agent proposes catalog update",
        "Direct credential reaches tool",
        "Tool reports success",
        "No authoritative outcome check",
      ],
      evidence: [
        { label: "Tool response", state: "Caller-reported only" },
        { label: "Trusted evidence", state: "None" },
        { label: "Outcome status", state: "Unknown" },
      ],
    },
    with: {
      title: "Authority becomes an enforceable, reviewable path.",
      badge: "Verified outcome",
      risk: false,
      narrative:
        "The proposal becomes an Action Claim, passes policy and oversight, receives a one-time capability, executes through the protected connector and is checked against authoritative post-state.",
      steps: [
        "Normalize Action Claim",
        "Evaluate policy and approval",
        "Issue one-time capability",
        "Execute and sign receipt",
        "Observe authoritative state",
        "Verify declared effect",
      ],
      evidence: [
        { label: "Action Claim + approval digest", state: "Bound" },
        { label: "One-time capability", state: "Consumed" },
        { label: "Signed receipt", state: "Recorded" },
        { label: "Outcome Attestation", state: "Verified" },
      ],
    },
    wrong: {
      title: "Authorized does not mean correct.",
      badge: "Mismatch held",
      risk: true,
      narrative:
        "The action is permitted and executes, but the observed effect differs from the Effect Contract. PALO records the mismatch, places the resource on hold and opens an Assurance Incident for review.",
      steps: [
        "Action is authorized",
        "Protected execution completes",
        "Trusted receipt is recorded",
        "Verifier observes unexpected state",
        "Mismatch creates resource hold",
        "Assurance Incident awaits resolution",
      ],
      evidence: [
        { label: "Action Claim + approval digest", state: "Bound" },
        { label: "Signed receipt", state: "Recorded" },
        { label: "Outcome Attestation", state: "Mismatch" },
        { label: "Resource hold", state: "Active" },
        { label: "Assurance Incident", state: "Open" },
      ],
    },
  };

  const root = document.querySelector("[data-palo-ai-demo]");
  if (root) {
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const title = root.querySelector("[data-demo-title]");
    const badge = root.querySelector("[data-demo-badge]");
    const narrative = root.querySelector("[data-demo-narrative]");
    const steps = root.querySelector("[data-demo-steps]");
    const evidence = root.querySelector("[data-demo-evidence]");
    const status = root.querySelector("[data-demo-status]");

    function render(key, announce) {
      const scenario = scenarios[key] || scenarios.with;
      tabs.forEach((tab) => {
        const active = tab.dataset.scenario === key;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      title.textContent = scenario.title;
      badge.textContent = scenario.badge;
      badge.classList.toggle("is-risk", scenario.risk);
      narrative.textContent = scenario.narrative;
      steps.replaceChildren(
        ...scenario.steps.map((label, index) => {
          const item = document.createElement("li");
          if (index === scenario.steps.length - 1)
            item.className = scenario.risk ? "is-risk" : "is-active";
          const number = document.createElement("span");
          number.textContent = String(index + 1).padStart(2, "0");
          const text = document.createElement("strong");
          text.textContent = label;
          item.append(number, text);
          return item;
        }),
      );
      evidence.replaceChildren(
        ...scenario.evidence.map((artifact) => {
          const item = document.createElement("li");
          const label = document.createElement("strong");
          label.textContent = artifact.label;
          const state = document.createElement("span");
          state.textContent = artifact.state;
          item.append(label, state);
          return item;
        }),
      );
      if (announce)
        status.textContent = `${tabLabel(key)} scenario selected. ${scenario.badge}.`;
    }

    function tabLabel(key) {
      return key === "without"
        ? "Without PALO"
        : key === "wrong"
          ? "Authorized but wrong"
          : "With PALO";
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => render(tab.dataset.scenario, true));
      tab.addEventListener("keydown", (event) => {
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
          ? 1
          : -1;
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        next.focus();
        render(next.dataset.scenario, true);
      });
    });
    render("with", false);
  }

  document.querySelectorAll("[data-copy-command]").forEach((button) => {
    button.addEventListener("click", async () => {
      const command =
        button.closest(".palo-ai-command")?.querySelector("code")
          ?.textContent || "";
      try {
        await navigator.clipboard.writeText(command);
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1400);
      } catch {
        button.textContent = "Select text";
      }
    });
  });
})();
