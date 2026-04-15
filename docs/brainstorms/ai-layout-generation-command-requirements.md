---
date: 2026-04-16
topic: ai-layout-generation-command
---

# AI Layout Generation Command for billing-themes

## Problem Frame
Dibutuhkan command AI yang bisa menghasilkan layout katalog secara konsisten dari referensi internet, tetap unik di level source URL, aman untuk repo public, dan siap diajukan melalui PR tanpa backend orchestration.

## Requirements

**Repository Model and Paths**
- R1. Konfigurasi tenant aktif disimpan hanya pada satu file: `designs/tenants/{tenant_code}/active-theme.json`.
- R2. Katalog layout shared disimpan di repo yang sama pada path `catalog/layouts/`.
- R3. Setiap keluarga layout berbasis source URL disimpan dengan key stabil: `layout_key = src_{sha8(canonical_url)}`.
- R4. Versi layout dalam satu keluarga disimpan pada path `catalog/layouts/{layout_key}/v{nnn}.json`.
- R5. FE browse katalog melalui `catalog/layouts/index.json`, satu entry per `layout_key` dengan pointer ke versi terbaru.
- R6. Registry URL terpakai disimpan pada `catalog/source-registry/used-urls.json`.

**Generation Modes and Source Policy**
- R7. Command harus mendukung dua mode source: `random` dan `explicit`.
- R8. Pada mode `random`, source dipilih dari whitelist desain terlebih dahulu (Dribbble/Behance/Awwwards/Mobbin/Land-book), lalu fallback ke internet umum jika source whitelist habis.
- R9. Pada mode `random`, canonical URL yang sudah pernah dipakai tidak boleh dipakai ulang (permanent block).
- R10. Pada mode `explicit`, source URL tertentu boleh dipakai ulang walau sudah ada di registry.

**Uniqueness and Versioning**
- R11. Keunikan source dihitung secara global seluruh katalog berdasarkan canonical URL.
- R12. Deteksi layout identik/berbeda wajib menggunakan canonical JSON hash dari `layout.tree`.
- R13. Jika hasil regenerate explicit mode identik 100% dengan versi terbaru pada `layout_key` yang sama, versi baru tidak dibuat.
- R14. Jika hasil regenerate explicit mode berbeda (meskipun minimal), buat versi baru (`v{nnn+1}`) pada `layout_key` yang sama.
- R15. `index.json` tidak menambah entry baru saat explicit regenerate URL sama; cukup update pointer `latest_version` dan metadata versi.

**Theme Builder and PR Flow (No Backend Submit)**
- R16. Theme builder FE tidak submit ke backend untuk publish; FE menghasilkan artifact PR-ready.
- R17. Submit flow V1 bersifat semi-otomatis: FE memberi JSON final + branch suggestion + commit message + PR description template, user tetap propose changes lewat GitHub UI.
- R18. JSON desain tenant boleh memuat full arbitrary `custom_layout` tree.
- R19. Custom layout dari tenant yang ter-merge harus auto dipublikasikan ke katalog (auto-promote).

**Quality, Safety, and CI Guardrails**
- R20. CI wajib validasi schema untuk `active-theme.json`, layout catalog artifact, index, dan source registry.
- R21. CI wajib menolak PR yang memuat data sensitif (token, credential, URL private, PII).
- R22. CI wajib enforce tenant path guard: dalam satu PR tenant change, perubahan tenant config hanya boleh menyentuh path tenant yang relevan dan `tenant_code` di JSON harus match path.
- R23. CI wajib enforce batas ukuran/depth/node-count layout tree agar aman dirender FE.

## Success Criteria
- Operator bisa menjalankan command AI dan mendapatkan paket output PR-ready tanpa edit besar.
- Random generation tidak pernah memakai ulang canonical URL yang sudah ada.
- Explicit regenerate pada URL yang sama menghasilkan versioning yang benar (skip jika identik, naik versi jika berbeda).
- FE dapat browse layout family dari index dengan stabil.

## Scope Boundaries
- Tidak mencakup implementasi renderer FE detail.
- Tidak mencakup auto-merge PR.
- Tidak mencakup UI drag-drop editor end-user.

## Key Decisions
- Storage tenant menggunakan single active JSON per tenant, history mengandalkan Git commit history.
- Layout catalog berada di `billing-themes`, bukan di bundle FE.
- Random source uniqueness global berbasis canonical URL + registry file tunggal.
- Layout family key memakai `src_{sha8(canonical_url)}`.
- Versioning explicit regenerate menggunakan hash `layout.tree` yang canonical.
- Publish tetap berbasis PR review, tanpa submit backend orchestration.

## Dependencies / Assumptions
- Tersedia CI workflow di repo ini untuk schema/safety/path checks.
- FE mengkonsumsi `catalog/layouts/index.json` untuk browsing dan selection.
- Maintainer review tetap mandatory sebelum merge ke `main`.

## Outstanding Questions

### Resolve Before Planning
- (None)

### Deferred to Planning
- Format canonicalization URL (rules strip query/trailing slash/subdomain normalization).
- Struktur final `used-urls.json` agar efisien untuk lookup + audit.
- Field minimum index untuk preview card di FE.

## Next Steps
-> `/ce:plan` untuk breakdown implementasi command, schema, CI, dan auto-promote flow.
