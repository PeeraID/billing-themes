---
title: "feat: Full Theme Overhaul with Live Schema Integration"
type: feat
status: active
date: 2026-04-23
---

# feat: Full Theme Overhaul with Live Schema Integration

## Overview

Designing a complete and functional default theme for the Peera Customer Portal. This overhaul will replace static placeholders with dynamic `{{halaman.field}}` tags from the latest `PORTAL_SCHEMA` and apply the "Aegis Obsidian" premium aesthetic inspired by `billing-dashboard`.

## Problem Frame

The current default theme uses outdated tags and lacks coverage for several new API modules (Support, Documents, detailed Profile). Users need a production-ready starting point that proves the power of the Studio and dynamic data binding.

## Requirements Trace

- R1. Update Navigation to include all active modules (Home, Status, Billing, Documents, Profile).
- R2. Replace all static text with dynamic tags (e.g., `{{global.company_name}}`, `{{profile.fullname}}`).
- R3. Design a high-fidelity Profile page with all 10+ fields.
- R4. Design a high-fidelity Billing page with invoice details and status.
- R5. Design a high-fidelity Support page for ticket tracking.
- R6. Design a high-fidelity Status/Dashboard page.
- R7. Maintain "Aegis Obsidian" premium aesthetic (Dark/Light mode, high-contrast, rounded 4px).

## Scope Boundaries

- Focus only on `layout.json` and theme tokens.
- No changes to API implementation.
- Functional actions (e.g., `action_pay_invoice`) are excluded from page content but can be added as buttons.

## Context & Research

### Relevant Code and Patterns

- `billing-dashboard/src/app/App.tsx`: Source of PORTAL_SCHEMA.
- `billing-dashboard/src/index.css`: Aesthetic reference.
- `billing-themes/catalog/layouts/peera/layout.json`: Target file.

## Key Technical Decisions

- **Direct Layout Update**: Modify the base `peera` default layout directly to set the standard for all new tenants.
- **Tag Standard**: Use `{{global.field}}` for company data and `{{page.field}}` for specific page data.

## Implementation Units

- [ ] **Unit 1: Navigation & Global Branding Refactor**
  - **Goal:** Update nav header/footer and items to support new modules and tags.
  - **Files:** `catalog/layouts/peera/layout.json`
  - **Approach:** Update `nav.header_html` with `{{global.company_name}}` and `items` with `/documents` and `/profile`.

- [ ] **Unit 2: Dashboard & Status Page Redesign**
  - **Goal:** Update the landing experience with real connection status.
  - **Files:** `catalog/layouts/peera/layout.json`
  - **Approach:** Use `{{status.is_online}}`, `{{status.active_ip}}`, and `{{global.customer_fullname}}`.

- [ ] **Unit 3: Profile & Settings Page Design**
  - **Goal:** Create a comprehensive profile view.
  - **Files:** `catalog/layouts/peera/layout.json`
  - **Approach:** Map `profile.fullname`, `profile.whatsapp`, `profile.service_plan`, `profile.region`, `profile.latitude`, etc., into an elegant grid.

- [ ] **Unit 4: Billing & Documents Page Design**
  - **Goal:** Render invoice details and downloadable links.
  - **Files:** `catalog/layouts/peera/layout.json`
  - **Approach:** Map `billing.invoice_number`, `billing.total_amount`, and `documents.file_url`.

- [ ] **Unit 5: Support & Authentication Page Update**
  - **Goal:** Ensure support tickets and login follow the new branding.
  - **Files:** `catalog/layouts/peera/layout.json`
  - **Approach:** Map `support.ticket_number` and ensure `login` uses `global.logo`.

## Verification

- Validate JSON syntax of `layout.json`.
- Verify all 30+ tags from `PORTAL_SCHEMA` are present in at least one page.
- Hard reload Studio to see the new default layout in action.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| JSON Size Limit | Keep HTML fragments concise but high-impact. |
| Tag Mismatch | Cross-check every tag against the latest PORTAL_SCHEMA. |

---
**Origin:** Direct user request to prove Studio capabilities.
