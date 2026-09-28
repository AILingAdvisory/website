# PEARL — Policy Engine of AI Regulatory Landscape

**Release Candidate:** `2026.3.0-RC2`  
**Engine Schema:** `2026.3`  
**Active Baseline Pack:** `hong-kong-v2025` (`17` regulations, `27` rules, `38` atomic controls)  
**Standard Currency:** HKD (Hong Kong Dollar)  
**Deliverable Language:** 100% Institutional English (`en-US` / `en-HK`)  

---

## 1. What PEARL Is

**PEARL** is a compact, deterministic regulatory compiler designed for institutional AI compliance. 

Given an AI system's operational fact profile, statutory licenses, and an evaluation date, PEARL deterministically compiles a baseline of applicable controls, statutory obligations, and evidence requirements with an unbroken, auditor-verifiable chain of custody back to primary legislation and supervisory manuals.

### Key Invariants
- **Deterministic Compilation:** Pure mathematical function. Zero runtime LLMs, zero probabilistic scoring, zero randomized UUIDs.
- **Fail-Closed Completeness Gate:** Missing operational flags throw `[INCOMPLETE_PROFILE]`. Speculation or silent defaults are prohibited.
- **Strict 4-Layer Separation of Regulatory Truth:** Primary legal text, normalized obligations, technical control steps, and audit evidence artifacts are strictly decoupled.
- **Audit-Ready Chain of Custody:** Control step → normative obligation → paragraph locator → primary statute quotation.

---

## 2. Strict 4-Layer Separation of Regulatory Truth

PEARL enforces an unbreachable 4-layer taxonomy across all data packs:

1. **Layer 1 — Primary Regulatory Text (`regulations.json` + `citations`):**  
   Primary regulatory instruments, pinpoint locators, and verbatim statutory excerpts authenticated from authoritative gazettes (`elegislation.gov.hk`, `hkma.gov.hk`, `sfc.hk`, `pcpd.org.hk`, `ia.org.hk`, `mpfa.org.hk`).
2. **Layer 2 — Normalized Obligations (`rules.json`):**  
   Regulator-mandated duties typed with formal `normativeStrength` (`STATUTORY_REQUIREMENT`, `REGULATORY_REQUIREMENT`, `SUPERVISORY_EXPECTATION`, `GUIDANCE`) and explicit trigger matrices.
3. **Layer 3 — Control Interpretations (`control-lib.json`):**  
   Institutional technical and procedural requirements categorized by step basis (`DIRECT`, `INTERPRETIVE`, `IMPLEMENTATION`) with exact citation references for direct regulatory duties.
4. **Layer 4 — Evidence Architecture (`control-lib.json` `evidenceStructure`):**  
   Unambiguous, audit-ready artifact requirements (e.g., board minutes, penetration test logs, cross-border data transfer assessments).

---

## 3. Data Pack: `hong-kong-v2025` (2026.3.0-RC2)

The Hong Kong financial AI regulatory pack features:
- **17 Authenticated Primary Regulations:**
  - HKMA: `HKMA-CIRC-2019-11-01`, `HKMA-CP-2019-12`, `HKMA-GENAI-2024`, `HKMA-SPM-TM-G-1`, `HKMA-AML-FEAS-2024`, `HKMA-AML-AI-2026-06`, `HKMA-CP-DRAFT-2027` (Draft)
  - SFC: `SFC-CODE-SCH7`, `SFC-ROBO-2018`, `SFC-GENAI-2024`
  - PCPD: `PDPO-CAP486-DPP1`, `PDPO-CAP486-DPP4`, `PDPO-CAP486-S33` (Enacted, Not Commenced), `PCPD-FRAMEWORK-2024`, `PCPD-AGENTIC-AI-2026-08`
  - IA: `IA-GL20`
  - MPFA: `MPFA-CIRC-2020`
- **Active Instrument Quarantine:** Non-active instruments (`PDPO-CAP486-S33` as `ENACTED_NOT_COMMENCED`, `HKMA-CP-DRAFT-2027` as `DRAFT`) are quarantined and excluded from active baselines.
- **27 Normalized Rules:** Covering algorithmic execution, credit risk scoring, generative AI risk management, customer chatbot disclosures, and cross-border data transfers.
- **38 Atomic Controls:** Fully mapped with typed step requirements and evidence structures across 7 domains (`GOV`, `MOD-RISK`, `CUST-PROT`, `DATA-PRIV`, `TECH-RISK`, `AUTO-TRADE`, `AML`).

---

## 4. Architecture & Invariants

### 4.1 Deterministic Baseline Identification
Every baseline output includes cryptographic SHA-256 fingerprints:
- `profileFingerprint`: SHA-256 digest of canonicalized client operational facts (`licenses`, `aiTopology`, `operationalFlags`).
- `packFingerprint`: SHA-256 digest of canonicalized regulatory pack contents.
- `baselineId`: Generated deterministically as `BL-<12-char SHA-256>` from clientReference, profileFingerprint, packFingerprint, and asOfDate.

### 4.2 Fail-Closed Completeness Gate
If an operational fact (`hasCustomerPII`, `isAutonomous`, `usesExternalProvider`, `isCrossBorder`, `modelType`, `hasHumanInLoop`, `customerFacing`) is `undefined` during compilation:
- Under `AND` trigger logic: If the rule has not already been disqualified by an answered flag or entity constraint, the compiler halts with `[INCOMPLETE_PROFILE]`.
- Under `OR` trigger logic: If the rule is not already satisfied, any missing required flag halts with `[INCOMPLETE_PROFILE]`.

### 4.3 Fail-Closed Pack Registry
The pack loader validates all regulations, rules, and controls against Schema 2026.3 Zod contracts and prevents duplicate IDs or conflicting definitions at boot time with zero silent trust or partial merge.

---

## 5. Verification & Tooling Commands

| Command | Description |
|---|---|
| `npm run validate` | Runs strict Zod schema validation and 22 integrity gates across all data packs. |
| `npm test` | Executes the comprehensive Golden Regression Test suite (`tests/test-phase1-pipeline.ts`). |
| `npm run verify` | Runs the full 22-suite / 25+ Golden Regulatory Assertions suite (`tests/verify.ts`). |
| `npm run simulate` | Runs full-pipeline operator simulations across 5 financial AI archetypes. |
| `npm run client:diff` | Computes deterministic diffs and temporal deltas between fact profiles. |
| `npm run client:annual-changelog` | Evaluates regulatory delta over time (e.g. 2025 vs 2026 baseline changes). |
| `npm run reg:check` | Monitors live regulatory instruments for updates, deprecations, or draft transitions. |
| `npm run build` | Builds production Next.js web application and PDF deliverable engine. |

---

## 6. Repository Layout

```
├── CONSTITUTION.md               # Immutable constitutional invariants & standards
├── AGENTS.md                     # Agent development guardrails & P0 review protocol
├── src/
│   ├── app/                      # Next.js App Router (Review Dashboard, Intake Form)
│   ├── components/               # React UI & React-PDF Document Templates
│   └── registry/
│       ├── regulatory-schema.ts  # Source of truth types (Schema 2026.3)
│       ├── engine.ts             # Deterministic compiler, fingerprinting, delta engine
│       ├── pack-registry.ts      # Multi-pack loader with collision defense
│       ├── pack-validator.ts     # Strict Zod schemas & integrity validators
│       ├── simulate-customer.ts  # End-to-end client simulation test harnesses
│       ├── diff-report-cli.ts    # Deterministic client diff CLI
│       └── packs/
│           ├── DATA_PACK_SPEC.md # Data pack authoring guide
│           └── hong-kong-v2025/  # Hong Kong Financial AI Pack (2026.3.0-RC2)
│               ├── manifest.json
│               ├── regulations.json
│               ├── rules.json
│               └── control-lib.json
└── tests/
    └── test-phase1-pipeline.ts   # 22-suite / 25+ Golden Regulatory Assertions Suite
```
