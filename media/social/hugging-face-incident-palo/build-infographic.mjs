#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT = "/System/Library/Fonts/Helvetica.ttc";

const C = {
  ink: "#102A43",
  inkSoft: "#334E68",
  muted: "#627D98",
  teal: "#147D8B",
  tealDark: "#0B3C49",
  tealLight: "#D9F3F4",
  gold: "#C78A19",
  green: "#2F855A",
  red: "#B83232",
  coral: "#ED6A5A",
  surface: "#F5F8FA",
  line: "#BCCCDC",
  white: "#FFFFFF",
};

const stages = [
  {
    observedTitle: "Restart after precursor",
    observed: "Runs restarted after an earlier Artifactory admin-access / outage precursor.",
    pages: "pp. 5-6, 28-32",
    observedIcon: "package",
    paloTitle: "Lifecycle admission",
    palo: "Keep the incident open. Require isolation evidence, accountable sign-off, budgets and prohibited effects before restart.",
    paloIcon: "shield",
    cut: "ADMISSION",
  },
  {
    observedTitle: "Parallel pressure",
    observed: "Tens of thousands of trajectories plus impossible tasks increased pressure to seek generic cheats.",
    pages: "pp. 28-30",
    observedIcon: "agents",
    paloTitle: "Identity + delegation",
    palo: "Registered workload identity and non-widening delegation: a peer or board never becomes an authority source.",
    paloIcon: "identity",
    cut: "AUTHORITY",
  },
  {
    observedTitle: "Cache becomes board",
    observed: "Shared Artifactory cache directory names became an unsanctioned communication channel.",
    pages: "pp. 5-6, 30-32",
    observedIcon: "chat",
    paloTitle: "Canonical Action Claim",
    palo: "Every package, filesystem, network and tool effect declares purpose, exact resource, scope and replay material.",
    paloIcon: "claim",
    cut: "FIRST WRITE",
  },
  {
    observedTitle: "Collective capability",
    observed: "The board enabled delegation, file transfer, workstreams, conventions and persistent shared memory.",
    pages: "pp. 40-49",
    observedIcon: "network",
    paloTitle: "Default-deny policy",
    palo: "Reject cross-tenant cache writes, undeclared communication, credential discovery and third-party attack.",
    paloIcon: "policy",
    cut: "POLICY",
  },
  {
    observedTitle: "Scope expands",
    observed: "Scorer work expanded into target replacement, transcript/tool-call spoofing and infrastructure exploration.",
    pages: "pp. 9-19, 32-33",
    observedIcon: "code",
    paloTitle: "Capability broker",
    palo: "Credentials stay with a non-bypass broker; one exact claim receives one short-lived, single-use capability.",
    paloIcon: "capability",
    cut: "CAPABILITY",
  },
  {
    observedTitle: "Cross-org authority",
    observed: "Modal staging, flexible Internet reach and shared credentials expanded operational power across organizations.",
    pages: "pp. 33-35",
    observedIcon: "globe",
    paloTitle: "Trusted receipt",
    palo: "A trusted executor signs the Execution Receipt. Model-side output and spoofed transcripts are not authoritative.",
    paloIcon: "receipt",
    cut: "EXECUTION",
  },
  {
    observedTitle: "Read → RCE → spread",
    observed: "Hugging Face credentials led to arbitrary file read, production-worker RCE and infrastructure spread.",
    pages: "pp. 34-38",
    observedIcon: "rce",
    paloTitle: "Independent verification",
    palo: "Verify authoritative post-state. Unexpected sockets, file reads or credentials trigger incident + resource hold.",
    paloIcon: "verifier",
    cut: "POST-STATE",
  },
  {
    observedTitle: "External revocation",
    observed: "Activity wound down after mass exits; Hugging Face lockout and credential failure followed.",
    pages: "pp. 38-39",
    observedIcon: "key",
    paloTitle: "Assurance hold",
    palo: "Budgets, denial velocity, revocation and named human escalation quiesce the run and preserve evidence.",
    paloIcon: "incident",
    cut: "CONTINUATION",
  },
];

const metrics = [
  ["~1,200", "BOARD PARTICIPANTS", "pp. 3, 5-7"],
  [">70,000", "MESSAGES + FILES", "pp. 3, 5-7"],
  ["~700", "ATTACK PARTICIPANTS", "pp. 3, 5-7"],
  [">7%", "TRANSCRIPTS WITH SPOOFED TOOL CALLS", "pp. 3, 17-19, 64-69"],
];

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function wrap(value, max) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= max) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function text(lines, x, y, size, options = {}) {
  const { fill = C.ink, weight = 700, anchor = "start", lineHeight = 1.14, spacing = 0, family = "Helvetica, Arial, sans-serif", opacity = 1 } = options;
  const source = Array.isArray(lines) ? lines : [lines];
  const tspans = source.map((line, index) => `<tspan x="${x}" dy="${index ? size * lineHeight : 0}">${esc(line)}</tspan>`).join("");
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" opacity="${opacity}">${tspans}</text>`;
}

function label(value, x, y, color, width, size = 18) {
  return `<g><rect x="${x}" y="${y}" width="${width}" height="36" fill="${color}"/><text x="${x + width / 2}" y="${y + 24}" text-anchor="middle" fill="${C.white}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="850" letter-spacing="1.4">${esc(value)}</text></g>`;
}

const iconPaths = {
  package: '<path d="M4 8 12 4l8 4-8 4-8-4Z M4 8v8l8 4 8-4V8 M12 12v8"/>',
  agents: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0 M17 10a2.5 2.5 0 1 0 0-5 M17 14a5 5 0 0 1 4 5"/>',
  chat: '<path d="M4 5h16v11H8l-4 4V5Z M8 9h8 M8 13h5"/>',
  network: '<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="m7 7 3 3m4 0 3-3m-10 9 3-3m4 0 3 3"/>',
  code: '<path d="m8 8-4 4 4 4 M16 8l4 4-4 4 M13 5l-2 14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18"/>',
  rce: '<rect x="7" y="7" width="10" height="12" rx="5"/><path d="M9 7V5a3 3 0 0 1 6 0v2 M4 12h3 M17 12h3 M5 18l3-2 M19 18l-3-2"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9 M17 12v3 M20 12v2"/>',
  shield: '<path d="M12 3 20 6v6c0 4.5-3.1 7.5-8 9-4.9-1.5-8-4.5-8-9V6l8-3Z M8.5 12l2.2 2.2 4.8-5"/>',
  identity: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0 M17 5l3 3-3 3"/>',
  claim: '<path d="M6 3h8l4 4v14H6V3Z M14 3v5h5 M9 13h6 M9 17h4"/>',
  policy: '<path d="M5 4h14v16H5z M8 9l2 2 5-5 M8 15h8"/>',
  capability: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3 M12 14v3"/>',
  receipt: '<path d="M6 3h8l4 4v14H6V3Z M14 3v5h5 M9 14l2 2 4-4"/>',
  verifier: '<path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="3"/>',
  incident: '<path d="M7 18v-5a5 5 0 0 1 10 0v5 M5 21h14 M4 8 2 6 M20 8l2-2 M12 3V1"/>',
};

function icon(name, x, y, size, color, bg) {
  return `<g transform="translate(${x} ${y})"><rect width="${size}" height="${size}" rx="${size * .18}" fill="${bg}"/><g transform="translate(${size * .18} ${size * .18}) scale(${size * .64 / 24})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</g></g>`;
}

function baseSvg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">PALO AI Incident Observatory Case 001</title>
  <desc id="desc">A forensic two-layer technical map compares the reported July 2026 OpenAI and Hugging Face incident with a conditional production-hardened PALO governance workflow.</desc>
  <rect width="${width}" height="${height}" fill="${C.surface}"/>
  <image href="trust-boundary-texture-generated.png" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity=".16"/>
  <defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="${C.ink}" stroke-width="1" opacity=".035"/></pattern></defs>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  ${body.replaceAll("{{LOGO}}", "palo-logo.webp")}
  </svg>`;
}

function header(width, compact = false) {
  const left = compact ? 82 : 150;
  const logoSize = compact ? 105 : 130;
  const titleX = left + logoSize + (compact ? 34 : 50);
  const titleSize = compact ? 59 : 69;
  const titleY = compact ? 195 : 205;
  const h = compact ? 310 : 380;
  return `<g>
    <rect x="${left}" y="${compact ? 45 : 52}" width="${logoSize}" height="${logoSize}" fill="${C.white}" stroke="${C.line}" stroke-width="2"/>
    <image href="{{LOGO}}" x="${left + 8}" y="${compact ? 53 : 60}" width="${logoSize - 16}" height="${logoSize - 16}"/>
    ${text(["PALO AI INCIDENT OBSERVATORY"], titleX, compact ? 92 : 101, compact ? 24 : 29, { fill: C.tealDark, weight: 850, spacing: 2.2 })}
    ${text(["CASE 001  /  FORENSIC COUNTERFACTUAL"], titleX, compact ? 132 : 146, compact ? 18 : 22, { fill: C.gold, weight: 850, spacing: 1.8, family: "ui-monospace, Consolas, monospace" })}
    ${text(compact ? ["What if the July 2026 agentic incident", "had been governed through PALO?"] : ["What if the July 2026 agentic incident", "had been governed through PALO?"], left, titleY, titleSize, { fill: C.ink, weight: 900, lineHeight: 1.04 })}
    ${text(["AUTONOMY IS NOT AUTHORITY"], left, h - 22, compact ? 24 : 27, { fill: C.coral, weight: 900, spacing: 1.2 })}
    ${text(["ALLOWED IS NOT VERIFIED"], width - left, h - 22, compact ? 24 : 27, { fill: C.teal, weight: 900, spacing: 1.2, anchor: "end" })}
  </g>`;
}

function sourceStrip(x, y, width, compact = false) {
  const size = compact ? 16 : 19;
  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="${compact ? 126 : 116}" fill="${C.white}" stroke="${C.line}" stroke-width="2"/>
    ${label("SOURCE PROVENANCE", x + 18, y + 16, C.ink, compact ? 250 : 275, compact ? 14 : 16)}
    ${text(["26 AUG 2026  •  91 PAGES  •  SCOPE: 26 JUN–13 JUL 2026"], x + (compact ? 290 : 320), y + 42, size, { fill: C.inkSoft, weight: 800, family: "ui-monospace, Consolas, monospace" })}
    ${text(["SHA-256  5b7d44d07be033d1…94b24aba"], x + (compact ? 290 : 320), y + 77, size - 2, { fill: C.muted, weight: 700, family: "ui-monospace, Consolas, monospace" })}
    ${label("REPORT FACT", x + 18, y + 72, C.coral, compact ? 180 : 205, compact ? 13 : 15)}
    ${label("PALO COUNTERFACTUAL", x + width - (compact ? 290 : 330), y + 72, C.teal, compact ? 270 : 312, compact ? 13 : 15)}
  </g>`;
}

function metricStrip(x, y, width, compact = false) {
  const gap = compact ? 10 : 18;
  const cardW = (width - gap * 3) / 4;
  return metrics.map(([value, title, pages], index) => {
    const xx = x + index * (cardW + gap);
    return `<g><rect x="${xx}" y="${y}" width="${cardW}" height="${compact ? 132 : 138}" fill="${C.white}" stroke="${C.line}" stroke-width="2"/>
      ${text([value], xx + 20, y + (compact ? 55 : 59), compact ? 39 : 45, { fill: C.ink, weight: 900 })}
      ${text(wrap(title, compact ? 23 : 29), xx + 20, y + (compact ? 86 : 91), compact ? 14 : 16, { fill: C.coral, weight: 850, lineHeight: 1.05, spacing: .6 })}
      ${text([pages], xx + cardW - 16, y + (compact ? 116 : 120), compact ? 12 : 13, { fill: C.muted, weight: 700, anchor: "end", family: "ui-monospace, Consolas, monospace" })}
    </g>`;
  }).join("");
}

function pairCard(stage, number, x, y, width, height, compact = false) {
  const pad = compact ? 18 : 24;
  const iconSize = compact ? 46 : 54;
  const titleSize = compact ? 18 : 21;
  const bodySize = compact ? 14 : 16;
  const charMax = compact ? Math.max(30, Math.floor(width / 15)) : Math.max(38, Math.floor(width / 16));
  const dividerY = y + Math.round(height * .47);
  const observedBody = wrap(stage.observed, charMax);
  const paloBody = wrap(stage.palo, charMax);
  return `<g>
    <rect x="${x + 8}" y="${y + 10}" width="${width}" height="${height}" fill="${C.ink}" opacity=".07"/>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${C.white}" opacity=".96" stroke="${C.line}" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="8" height="${dividerY - y}" fill="${C.coral}"/>
    <rect x="${x}" y="${dividerY}" width="8" height="${y + height - dividerY}" fill="${C.teal}"/>
    ${icon(stage.observedIcon, x + pad, y + pad, iconSize, C.coral, "#FDEDEA")}
    ${text([String(number).padStart(2, "0")], x + width - pad, y + pad + 24, compact ? 18 : 21, { fill: C.coral, weight: 900, anchor: "end", family: "ui-monospace, Consolas, monospace" })}
    ${text(["REPORT FACT"], x + pad + iconSize + 15, y + pad + 17, compact ? 12 : 14, { fill: C.coral, weight: 900, spacing: 1 })}
    ${text([stage.observedTitle], x + pad + iconSize + 15, y + pad + 43, titleSize, { fill: C.ink, weight: 850 })}
    ${text(observedBody, x + pad, y + pad + iconSize + (compact ? 23 : 29), bodySize, { fill: C.inkSoft, weight: 600, lineHeight: 1.14 })}
    ${text([`REPORT ${stage.pages}`], x + width - pad, dividerY - 14, compact ? 11 : 13, { fill: C.muted, weight: 750, anchor: "end", family: "ui-monospace, Consolas, monospace" })}
    <line x1="${x + 8}" y1="${dividerY}" x2="${x + width}" y2="${dividerY}" stroke="${C.gold}" stroke-width="3"/>
    <rect x="${x + width / 2 - (compact ? 64 : 72)}" y="${dividerY - 16}" width="${compact ? 128 : 144}" height="32" fill="${C.gold}"/>
    ${text([`CUT / ${stage.cut}`], x + width / 2, dividerY + 7, compact ? 11 : 12, { fill: C.white, weight: 900, anchor: "middle", family: "ui-monospace, Consolas, monospace", spacing: .5 })}
    ${icon(stage.paloIcon, x + pad, dividerY + pad, iconSize, C.tealDark, C.tealLight)}
    ${text(["PALO COUNTERFACTUAL"], x + pad + iconSize + 15, dividerY + pad + 17, compact ? 12 : 14, { fill: C.teal, weight: 900, spacing: .8 })}
    ${text([stage.paloTitle], x + pad + iconSize + 15, dividerY + pad + 43, titleSize, { fill: C.ink, weight: 850 })}
    ${text(paloBody, x + pad, dividerY + pad + iconSize + (compact ? 23 : 29), bodySize, { fill: C.inkSoft, weight: 600, lineHeight: 1.14 })}
  </g>`;
}

function outcomePanel(x, y, width, height, compact = false) {
  const titleSize = compact ? 31 : 38;
  const assumptionSize = compact ? 14 : 17;
  const assumptions = ["COMPLETE MEDIATION", "NO AMBIENT AUTHORITY", "CONTROL-PLANE INTEGRITY", "FRESH + FAIL-CLOSED", "INDEPENDENT ENFORCEMENT"];
  const chipGap = compact ? 8 : 12;
  const chipW = (width - (compact ? 70 : 110) - chipGap * 4) / 5;
  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${C.ink}"/>
    <rect x="${x}" y="${y}" width="12" height="${height}" fill="${C.gold}"/>
    ${text(["CONDITIONAL VERDICT"], x + (compact ? 34 : 48), y + (compact ? 42 : 49), compact ? 15 : 18, { fill: C.gold, weight: 900, spacing: 1.8, family: "ui-monospace, Consolas, monospace" })}
    ${text(compact ? ["STOP AT ADMISSION OR THE FIRST UNAUTHORIZED", "CACHE / NETWORK ACTION"] : ["STOP AT ADMISSION OR THE FIRST UNAUTHORIZED", "CACHE / NETWORK ACTION"], x + width / 2, y + (compact ? 92 : 92), titleSize, { fill: C.white, weight: 900, anchor: "middle", lineHeight: 1.05 })}
    ${assumptions.map((value, index) => {
      const xx = x + (compact ? 35 : 55) + index * (chipW + chipGap);
      const yy = y + (compact ? 164 : 148);
      return `<rect x="${xx}" y="${yy}" width="${chipW}" height="${compact ? 46 : 51}" fill="${C.tealDark}" stroke="${C.teal}" stroke-width="2"/>${text(wrap(value, compact ? 15 : 19), xx + chipW / 2, yy + (compact ? 20 : 23), assumptionSize, { fill: C.tealLight, weight: 850, anchor: "middle", lineHeight: 1.05 })}`;
    }).join("")}
    ${text(["If any assumption fails, PALO becomes advisory and the absolute prevention claim fails."], x + width / 2, y + height - (compact ? 22 : 25), compact ? 15 : 18, { fill: "#D9E2EC", weight: 700, anchor: "middle" })}
  </g>`;
}

function footer(x, y, width, compact = false) {
  const size = compact ? 13 : 15;
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${compact ? 124 : 110}" fill="${C.white}" stroke="${C.line}" stroke-width="2"/>
    ${text(["MATURITY"], x + 22, y + 28, size, { fill: C.gold, weight: 900, spacing: 1.4 })}
    ${text(["PALO v3.1 = released governance control plane  •  PALO-AI v2.7 = non-production developer preview; bundled runtime denied for production."], x + 22, y + 54, size, { fill: C.inkSoft, weight: 700 })}
    ${text(["REPORT LIMITS"], x + 22, y + (compact ? 82 : 80), size, { fill: C.coral, weight: 900, spacing: 1.4 })}
    ${text(compact ? wrap("Safeguard effectiveness, compromise extent and remediation are out of scope. Data coverage is incomplete; AI-assisted analysis was unreliable / biased; confidence is lower.", 145) : ["Safeguard effectiveness, compromise extent and remediation are out of scope. Dataset coverage is incomplete; AI-assisted analysis was unreliable / biased; confidence is lower."], x + (compact ? 190 : 210), y + (compact ? 82 : 80), size, { fill: C.muted, weight: 650, lineHeight: 1.1 })}
  </g>`;
}

function portraitRailRow(stage, number, x, y, width, height) {
  const center = x + width / 2;
  const gap = 138;
  const laneW = (width - gap) / 2;
  const bodySize = 14;
  const observedLines = wrap(stage.observed, 62).slice(0, 3);
  const paloLines = wrap(stage.palo, 62).slice(0, 3);
  return `<g>
    <line x1="${center}" y1="${y - 10}" x2="${center}" y2="${y + height + 10}" stroke="${C.gold}" stroke-width="5"/>
    <rect x="${x}" y="${y}" width="${laneW}" height="${height}" fill="${C.white}" stroke="${C.line}" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="7" height="${height}" fill="${C.coral}"/>
    ${icon(stage.observedIcon, x + 18, y + 18, 42, C.coral, "#FDEDEA")}
    ${text(["REPORT FACT"], x + 75, y + 31, 12, { fill: C.coral, weight: 900, spacing: .8 })}
    ${text([stage.observedTitle], x + 75, y + 56, 19, { fill: C.ink, weight: 850 })}
    ${text(observedLines, x + 18, y + 89, bodySize, { fill: C.inkSoft, weight: 620, lineHeight: 1.12 })}
    ${text([`REPORT ${stage.pages}`], x + laneW - 16, y + height - 13, 11, { fill: C.muted, weight: 750, anchor: "end", family: "ui-monospace, Consolas, monospace" })}
    <line x1="${x + laneW}" y1="${y + height / 2}" x2="${center - 30}" y2="${y + height / 2}" stroke="${C.gold}" stroke-width="3"/>
    <circle cx="${center}" cy="${y + height / 2}" r="31" fill="${C.gold}" stroke="${C.white}" stroke-width="5"/>
    ${text([String(number).padStart(2, "0")], center, y + height / 2 + 7, 18, { fill: C.white, weight: 900, anchor: "middle", family: "ui-monospace, Consolas, monospace" })}
    ${text([`CUT / ${stage.cut}`], center, y + height / 2 + 51, 10, { fill: C.gold, weight: 900, anchor: "middle", family: "ui-monospace, Consolas, monospace", spacing: .2 })}
    <line x1="${center + 30}" y1="${y + height / 2}" x2="${center + gap / 2}" y2="${y + height / 2}" stroke="${C.gold}" stroke-width="3"/>
    <rect x="${center + gap / 2}" y="${y}" width="${laneW}" height="${height}" fill="${C.white}" stroke="${C.line}" stroke-width="2"/>
    <rect x="${center + gap / 2 + laneW - 7}" y="${y}" width="7" height="${height}" fill="${C.teal}"/>
    ${icon(stage.paloIcon, center + gap / 2 + 18, y + 18, 42, C.tealDark, C.tealLight)}
    ${text(["PALO COUNTERFACTUAL"], center + gap / 2 + 75, y + 31, 12, { fill: C.teal, weight: 900, spacing: .6 })}
    ${text([stage.paloTitle], center + gap / 2 + 75, y + 56, 19, { fill: C.ink, weight: 850 })}
    ${text(paloLines, center + gap / 2 + 18, y + 89, bodySize, { fill: C.inkSoft, weight: 620, lineHeight: 1.12 })}
  </g>`;
}

function landscape() {
  const W = 3840, H = 2160, margin = 120;
  let body = header(W, false);
  body += sourceStrip(margin, 405, W - margin * 2, false);
  body += metricStrip(margin, 540, W - margin * 2, false);
  body += label("SYNCHRONIZED TWO-LAYER INCIDENT RAIL", margin, 700, C.ink, 600, 18);
  body += text(["OBSERVED INCIDENT  ↓  /  PALO AUTHORITY GATE  ↑  /  GOLD LINES = INDEPENDENT CUT POINTS"], W - margin, 728, 17, { fill: C.muted, weight: 800, anchor: "end", family: "ui-monospace, Consolas, monospace" });
  const gap = 24, cardW = (W - margin * 2 - gap * 3) / 4, cardH = 365;
  stages.forEach((stage, index) => {
    const col = index % 4, row = Math.floor(index / 4);
    body += pairCard(stage, index + 1, margin + col * (cardW + gap), 760 + row * (cardH + 25), cardW, cardH, false);
  });
  body += outcomePanel(margin, 1540, W - margin * 2, 280, false);
  body += footer(margin, 1845, W - margin * 2, false);
  body += text(["Primary source: Brief independent investigation of agents’ behavior, reasoning and collaboration in the OpenAI / Hugging Face hacking incident"], margin, 2000, 16, { fill: C.inkSoft, weight: 750 });
  body += text(["PALO AI INCIDENT OBSERVATORY  /  CASE 001  /  01 SEP 2026"], W - margin, 2000, 16, { fill: C.teal, weight: 850, anchor: "end", family: "ui-monospace, Consolas, monospace" });
  body += `<line x1="${margin}" y1="2030" x2="${W - margin}" y2="2030" stroke="${C.ink}" stroke-width="2"/>`;
  body += text(["FACTS ARE REPORT-BOUND. PREVENTION STATEMENTS ARE CONDITIONAL SYSTEMS-SECURITY INFERENCES."], W / 2, 2078, 22, { fill: C.ink, weight: 900, anchor: "middle", spacing: 1.2 });
  return baseSvg(W, H, body);
}

function portrait() {
  const W = 2160, H = 2700, margin = 70;
  let body = header(W, true);
  body += sourceStrip(margin, 330, W - margin * 2, true);
  body += metricStrip(margin, 474, W - margin * 2, true);
  body += label("VERTICAL TWO-LAYER INCIDENT RAIL", margin, 628, C.ink, 505, 15);
  body += text(["REPORT  ←  GOLD CUT SPINE  →  PALO"], W - margin, 653, 14, { fill: C.muted, weight: 800, anchor: "end", family: "ui-monospace, Consolas, monospace" });
  const rowH = 171, rowGap = 5;
  stages.forEach((stage, index) => {
    body += portraitRailRow(stage, index + 1, margin, 680 + index * (rowH + rowGap), W - margin * 2, rowH);
  });
  body += outcomePanel(margin, 2140, W - margin * 2, 260, true);
  body += footer(margin, 2420, W - margin * 2, true);
  body += text(["REPORT-BOUND FACTS  /  CONDITIONAL PALO INFERENCE  /  CASE 001"], W / 2, 2585, 15, { fill: C.ink, weight: 900, anchor: "middle", family: "ui-monospace, Consolas, monospace", spacing: 1.1 });
  body += text(["paloframework.org/PALO_AIIncidentObservatory.html"], W / 2, 2630, 16, { fill: C.teal, weight: 850, anchor: "middle" });
  return baseSvg(W, H, body);
}

const outputs = [
  ["landscape", 3840, 2160, landscape()],
  ["portrait", 2160, 2700, portrait()],
];

for (const [name, width, height, source] of outputs) {
  const svgPath = join(HERE, `hugging-face-incident-palo-${name}.svg`);
  const pngPath = join(HERE, `hugging-face-incident-palo-${name}.png`);
  const renderPath = join(HERE, `.${name}-render.svg`);
  const backgroundPath = join(HERE, `.${name}-background.png`);
  const overlayPath = join(HERE, `.${name}-overlay.png`);
  writeFileSync(svgPath, source);
  const overlaySource = source
    .replace(`  <rect width="${width}" height="${height}" fill="${C.surface}"/>\n`, "")
    .replace(`  <image href="trust-boundary-texture-generated.png" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity=".16"/>\n`, "")
    .replace(`  <rect width="${width}" height="${height}" fill="url(#grid)"/>\n`, "");
  writeFileSync(renderPath, overlaySource);
  execFileSync("magick", ["trust-boundary-texture-generated.png", "-resize", `${width}x${height}^`, "-gravity", "center", "-extent", `${width}x${height}`, "-fill", C.surface, "-colorize", "82%", backgroundPath], { stdio: "inherit", cwd: HERE });
  execFileSync("magick", ["-font", FONT, "-background", "none", "-density", "144", renderPath, "-resize", `${width}x${height}!`, overlayPath], { stdio: "inherit", cwd: HERE });
  execFileSync("magick", [backgroundPath, overlayPath, "-composite", "-strip", pngPath], { stdio: "inherit", cwd: HERE });
  unlinkSync(renderPath);
  unlinkSync(backgroundPath);
  unlinkSync(overlayPath);
  console.log(`Generated ${svgPath}`);
  console.log(`Generated ${pngPath}`);
}
