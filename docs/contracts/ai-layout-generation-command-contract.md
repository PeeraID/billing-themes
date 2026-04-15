# AI Layout Generation Command Contract

## Purpose
Kontrak command AI internal untuk menghasilkan layout katalog yang siap PR di repo `billing-themes`.

## Command Intent
Operator memberi brief generation. Command mengembalikan output package PR-ready tanpa push ke repo.

## Modes
- `random`: pilih source URL baru yang belum pernah dipakai.
- `explicit`: pakai source URL tertentu (boleh reuse URL existing).

## Input Contract

### Required
- `mode`: `random` | `explicit`
- `layout_name`: nama layout human-readable.
- `layout_goal`: tujuan layout (mis. billing-focused dashboard).
- `sections`: daftar section wajib.
- `target_viewports`: daftar viewport target.

### Conditionally Required
- `source_url`: wajib jika `mode=explicit`.

### Optional
- `design_style`: kata kunci style visual.
- `density`: compact | comfortable | spacious.
- `constraints`: batasan tambahan.

## Source Rules
- `random` wajib mencari source dari whitelist domain terlebih dahulu; jika exhausted, baru fallback internet umum.
- Canonical URL dipakai untuk uniqueness check global terhadap `catalog/source-registry/used-urls.json`.
- Pada `random`, canonical URL yang sudah pernah dipakai harus di-skip.
- Pada `explicit`, canonical URL boleh dipakai ulang.

## Key Derivation Rules
- `layout_key = src_{sha8(canonical_url)}`.
- `layout_tree_hash = sha256(canonical_json(layout.tree))`.

## Output Contract

### 1) Layout Family Artifact
Path:
- `catalog/layouts/{layout_key}/v{nnn}.json`

Minimum shape:
```json
{
  "layout_key": "src_a1b2c3d4",
  "version": "v003",
  "name": "Billing Focus Split",
  "description": "Split dashboard with billing-first hierarchy",
  "tags": ["dashboard", "billing", "split"],
  "renderer_version": "1.0",
  "generated_at": "2026-04-16T00:00:00Z",
  "source": {
    "mode": "explicit",
    "url": "https://example.com/design",
    "canonical_url": "https://example.com/design",
    "domain": "example.com"
  },
  "hash": {
    "layout_tree_hash": "sha256:..."
  },
  "layout": {
    "type": "page",
    "children": []
  }
}
```

### 2) Index Patch
Target file:
- `catalog/layouts/index.json`

Rule:
- satu entry per `layout_key`.
- explicit regenerate URL sama tidak menambah entry baru, hanya update `latest_version` jika ada versi baru.

### 3) Source Registry Patch
Target file:
- `catalog/source-registry/used-urls.json`

Rule:
- random mode append canonical URL baru.
- explicit mode tidak wajib append baru jika canonical URL sudah ada.

### 4) PR Metadata Suggestions
- Branch: `layout/{layout_key}-v{nnn}`
- Commit: `feat(layout): add {layout_key} {version}`
- PR title: `Add layout version: {layout_key} {version}`
- PR body: ringkas source mode, canonical URL, hash compare result, dan compatibility notes.

## Versioning Rules
- Jika `layout_tree_hash` identik dengan versi terbaru di `layout_key` yang sama: jangan buat versi baru.
- Jika hash berbeda: buat `v{nnn+1}` pada `layout_key` yang sama.

## Safety Rules
- Dilarang output credential, token, private URL, email personal, nomor telepon, atau PII customer.
- Dilarang output aset berhak cipta yang disalin mentah (logo/teks brand sumber).
- Metadata harus aman untuk repo public.

## Validation Rules
- Semua JSON valid dan lolos schema.
- Lolos depth/count/size limits layout tree.
- Lolos CI checks untuk safety + tenant path guard (jika PR menyentuh tenant active file).

## Integration Notes
- FE browse memakai `catalog/layouts/index.json`.
- Tenant active theme mereferensikan layout via `layout_key`/`version` atau embed `custom_layout`.
- Custom layout tenant yang ter-merge dapat dipromosikan otomatis ke katalog (auto-promote flow).
