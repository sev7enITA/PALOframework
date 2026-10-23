---
title: 'PALO: Open-source software for studying evidence and authority across the AI lifecycle'
tags:
  - JavaScript
  - AI governance
  - research software
  - provenance
  - human oversight
  - agentic systems
authors:
  - name: Fabrizio Degni
    corresponding: true
    affiliation: 1
affiliations:
  - name: Independent Researcher, Italy
    index: 1
date: 23 October 2026
bibliography: paper.bib
---

# Summary

PALO (Principled AI Lifecycle Orchestration) is open-source software for representing and examining how organizations govern artificial intelligence systems. It connects descriptions of an AI use case to accountable owners, lifecycle decisions, evidence records and explicit review conditions. Researchers can inspect these relationships, exercise synthetic cases and compare a recorded permission with evidence of what subsequently happened. The implementation combines browser-based assessment tools, machine-readable contracts, command-line validators and a reference runtime for delegated agent actions [@palo].

The broader ecosystem also includes the P.A.L.O. Framework Toolbox for Android and iOS/iPadOS. These companion applications bring preliminary assessment and local evidence work to mobile devices [@paloMobile]. Their native source code is not public and is outside the software submitted for open-source review. The public web tools, contracts and reference implementations can be examined and reproduced independently of these mobile applications.

# Statement of need

AI governance research needs inspectable representations of the relationship between organizational requirements and observed system behavior. A completed assessment, a policy decision and an execution receipt answer different questions. Combining them into a single success label can obscure missing evidence or an action that was permitted but produced an unintended effect. PALO makes these distinctions available as data structures and executable checks.

The intended users are researchers investigating AI accountability, human oversight, evidence provenance and agentic assurance, together with practitioners developing reproducible case studies in these areas. A researcher can construct a use case, identify its permitted scope, attach supporting artifacts, validate the resulting records and examine whether an observable outcome satisfies an explicitly stated expectation. Cases and their assumptions remain inspectable instead of being embedded only in narrative reports.

The software supports methodological investigation and local experimentation. It does not establish that a governance process is effective merely because its records validate. Legal applicability, organizational authority and the adequacy of an observation still require accountable interpretation. This separation lets investigators study the representation and verification procedure without treating it as a compliance certificate.

# State of the field

Open Policy Agent (OPA) supplies a general-purpose policy language and evaluation engine that separates policy decisions from enforcement [@opa]. PALO uses OPA in its reference assurance workflow rather than implementing another policy language. Its additional subject is the surrounding lifecycle of a decision: the proposed action, approval context, execution evidence, declared effect and subsequent outcome observation.

Fairlearn provides fairness assessment and mitigation tools together with resources for interpreting fairness as a sociotechnical problem [@fairlearn]. AI Fairness 360 likewise provides fairness metrics and mitigation algorithms [@aif360]. PALO does not replace these specialist analytical methods. Its contribution is a general representation of where evidence belongs in an accountable governance workflow and what remains unresolved when evidence is incomplete.

A competent alternative can combine an existing policy engine, identity management, workflow software and an audit log. PALO's build rationale is to make explicit, reusable contracts and worked examples for studying how these concerns connect. It is not a claim that existing components cannot implement equivalent controls. Comparative performance, organizational benefit and reduced review effort have not been established by the local examples.

# Software design

The design separates canonical definitions, source-backed context, illustrative examples and records requiring human review. A versioned semantic source describes lifecycle phases, controls, artifacts and relationships. Generators produce browser-facing projections; validators and release manifests check consistency and bind generated artifacts to source digests. This introduces maintenance work when meanings change, but avoids allowing each interface to silently define its own governance vocabulary [@paloSemantics].

Case Files and Evidence Bundles provide portable records for local assessment. Browser storage and voluntary export reduce the infrastructure required to reproduce an example. The trade-off is explicit: local persistence does not provide multi-user authorization, protected archival storage or independently trustworthy evidence. Schema validation checks record structure; a digest binds content but does not make its assertions true.

For delegated agent actions, the reference implementation distinguishes an Action Claim, a policy decision, approval, a single-use execution capability, an execution receipt and an outcome attestation. An Effect Contract identifies the result to be checked. The compatibility demonstration exercises a synthetic catalog with a correct effect, an authorized but incorrect effect and stale state before execution. These paths allow the verification logic to be inspected independently of a successful tool invocation [@paloDemo]. The runtime remains a developer preview with an explicit production-admission boundary.

The mobile applications belong to the same ecosystem, with independently versioned Android and iOS components recorded in the release manifest. Their role is local preliminary assessment and evidence handling. Their presence extends the ways in which users encounter the framework, but does not establish feature parity with the web tools or agent runtime. Reproduction of the open-source core follows the repository instructions without an app-store account. No native build or validation claim is made for the non-public mobile code.

# Research impact statement

The repository contains three schema-valid synthetic Evidence Pack cases covering an agentic invoice exception, a human-resources learning assistant and a procurement summary. They provide concrete fixtures for examining purpose boundaries, decision rights and evidence handling. The assurance demonstration additionally exposes the difference between authorization and outcome verification [@paloCases; @paloDemo]. These are reusable experimental materials, not observations of effectiveness in an external organization.

PALO FinOps provides a documented research use within the broader project: a technical preprint and accompanying reproducibility materials investigate cost provenance, reservations and evidence-dependent outcome metrics [@paloFinOps]. Its experiments are local and synthetic. They support a bounded example of research using PALO software; they do not validate all framework modules, demonstrate provider billing accuracy or establish independent adoption of the complete ecosystem.

The project provides a public MIT-licensed repository, contribution guidance, issue reporting, automated checks and versioned releases. The JOSS contribution would make this software architecture and its reproducible examples citable as a coherent research instrument. No independent replication, production qualification or measured scientific adoption of the entire framework is claimed here.

# AI usage disclosure

OpenAI Codex was used for coding; GLM and Anthropic Claude were used for code assessment; Google Gemini was used for online research. Codex also assisted with source inspection, preparation of this manuscript and reproducibility checks. The existing FinOps manuscript identifies GLM-5.3 for that component's implementation critique; other historical model versions have not been established for this manuscript. These AI assessments are development aids, not independent peer review.

Verification materials include automated contract and semantic checks, regression tests and reproducible synthetic experiments. A clean-clone check during manuscript preparation passed 147 targeted tests and reran the FinOps synthetic allocation experiment. These checks cover the recorded assertions and examples; they do not establish complete correctness or production readiness.

The author personally reviewed and validated the AI-assisted code and made the core design decisions. He retains responsibility for the software and submitted materials. Automated checks and AI assessments support, but do not replace, this human review.

# Acknowledgements

PALO is a personal, independent project with no external funding. Fabrizio Degni is its sole author, creator and maintainer and has an intellectual and reputational interest in the project.

# References
