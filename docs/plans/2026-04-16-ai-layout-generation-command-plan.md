---
date: 2026-04-16
topic: ai-layout-generation-command
source_requirements: docs/brainstorms/ai-layout-generation-command-requirements.md
---

# Plan: AI Layout Generation Command

## Goal
Menyediakan workflow command AI internal untuk menghasilkan layout katalog yang unik-by-source, terversi, aman, dan siap PR tanpa submit backend.

## Deliverables
- D1. Contract command generation di `docs/contracts/ai-layout-generation-command-contract.md`.
- D2. Struktur katalog dan registry source URL yang final (`catalog/layouts/`, `catalog/source-registry/used-urls.json`).
- D3. Aturan canonicalization URL + layout tree hashing.
- D4. PR-ready output standard (branch/commit/PR template).
- D5. CI checks untuk schema, safety, path guard, dan constraints.

## Workstreams

### W1 — Artifact Model Lock
- W1.1 Lock file model tenant active: `designs/tenants/{tenant_code}/active-theme.json`.
- W1.2 Lock layout family model: `catalog/layouts/{layout_key}/v{nnn}.json`.
- W1.3 Lock index model: `catalog/layouts/index.json` dengan pointer `latest_version`.
- W1.4 Lock source registry model: `catalog/source-registry/used-urls.json`.

### W2 — Source Selection and Uniqueness
- W2.1 Definisikan whitelist source dan fallback policy ke internet umum.
- W2.2 Definisikan canonical URL function untuk uniqueness key.
- W2.3 Implement aturan mode `random` (permanent block reused URL).
- W2.4 Implement aturan mode `explicit` (allowed reuse URL).

### W3 — Versioning and Diff Rules
- W3.1 Definisikan canonical JSON serializer untuk `layout.tree`.
- W3.2 Definisikan hash compare rule: identik => skip version.
- W3.3 Definisikan increment version rule: berbeda => `v{nnn+1}` pada `layout_key` sama.
- W3.4 Definisikan update rule ke index saat version baru dibuat.

### W4 — PR Output and Author Workflow
- W4.1 Definisikan output bundle command: artifact JSON + index patch + registry patch + PR metadata suggestion.
- W4.2 Definisikan naming convention branch/commit/PR title.
- W4.3 Definisikan semi-otomatis flow untuk user GitHub UI (`Propose changes`).

### W5 — Auto-Promote and CI Guardrails
- W5.1 Definisikan auto-promote flow: custom layout dari tenant active yang ter-merge masuk katalog shared.
- W5.2 Definisikan schema validation gates untuk semua artifact.
- W5.3 Definisikan path guard tenant dan tenant_code match checks.
- W5.4 Definisikan safety checks (no secret/no PII/no private URL).
- W5.5 Definisikan layout complexity limits (depth/count/size) sebagai CI gate.

## Sequence
1. Lock model artifact dan contract (W1).
2. Lock source uniqueness rules (W2).
3. Lock versioning rules (W3).
4. Lock author workflow output PR (W4).
5. Lock CI + auto-promote governance (W5).

## Verification
- V1. Skenario random mode menolak URL yang sudah ada di registry.
- V2. Skenario explicit mode pada URL sama: identik di-skip, beda jadi versi baru.
- V3. Skenario update index tidak menambah entry baru untuk family yang sama.
- V4. CI menolak payload yang melanggar schema/safety/path/size limits.

## Risks and Mitigations
- RISK: Registry file tunggal menjadi bottleneck merge.
  - MITIGATION: deterministic sort + idempotent update + small, append-safe structure.
- RISK: Output AI variasi tinggi dan noisy.
  - MITIGATION: contract-first prompt + canonical hash + strict CI gate.
- RISK: Auto-promote menambah katalog berkualitas rendah.
  - MITIGATION: metadata source jelas + maintainer review tetap wajib sebelum merge.

## Rollout
- Phase 1: Publish docs + contract + schema draft.
- Phase 2: Implement CI checks dan template command output.
- Phase 3: Internal trial (random + explicit), evaluasi kualitas, lalu standardisasi operasional.

## Out of Scope
- Implementasi renderer FE.
- Otomasi auto-merge PR.
- End-user visual editor drag-drop.
