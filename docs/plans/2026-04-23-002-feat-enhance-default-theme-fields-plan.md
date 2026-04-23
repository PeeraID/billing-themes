---
title: "feat: Enhance Default Theme with Full Schema Coverage"
type: feat
status: active
date: 2026-04-23
origin: Direct user request to ensure all schema fields are utilized
---

# feat: Enhance Default Theme with Full Schema Coverage

## Overview

Improving the existing default theme in `billing-themes` to ensure 100% usage of all data-bearing schema tags (Profile, Billing, Support, Status, Documents). This will involve adding detailed breakdowns for invoices and more metadata for support tickets, while strictly following the "Aegis Obsidian" premium aesthetic.

## Problem Frame

The current default theme covers major pages but misses several detailed API fields (e.g., invoice tax details, ticket priority, specific status flags). To prove the Studio's data-driven power, every tag in the Live Schema (except functional/global) must be visually represented.

## Requirements Trace

- R1. Update **Billing** page to include: `billing.subtotal`, `billing.tax_rate`, `billing.tax_amount`, `billing.payment_method`, `billing.period_start`, `billing.period_end`, and `billing.notes`.
- R2. Update **Support** page to include: `support.type` and `support.priority`.
- R3. Update **Status** page to include: `status.is_online` (as a functional indicator) and ensure all status fields are visible.
- R4. Verify **Profile** page uses all coordinates and ID tags.
- R5. Maintain consistency with `billing-dashboard` visual style (glassmorphism, subtle borders, high-contrast typography).

## Scope Boundaries

- **In-Scope**: Modifying `catalog/layouts/peera/layout.json` contents.
- **Out-of-Scope**: Changing `functional.*` or `global.*` tag logic (already established).
- **Out-of-Scope**: Implementing the actual API logic (handled by backend).

## Key Technical Decisions

- **Detailed Invoice Card**: Add a "Bill Summary" section in the Billing page to show the subtotal/tax breakdown.
- **Badge Indicators**: Use color-coded badges for `support.priority` (High = Red, Medium = Amber, Low = Blue).
- **Period Visualization**: Display subscription periods as a "Service Period" range in the Billing UI.

## Implementation Units

- [ ] **Unit 1: Billing Detail Breakdown**
  - **Goal:** Render subtotal, tax, and service periods for invoices.
  - **Files:** `catalog/layouts/peera/layout.json`
  - **Approach:** Add a table-like summary below the main total amount in the `billing` HTML fragment.

- [ ] **Unit 2: Support Ticket Metadata Expansion**
  - **Goal:** Show ticket type and priority badges.
  - **Files:** `catalog/layouts/peera/layout.json`
  - **Approach:** Insert priority badges and a type label next to the ticket number in the `support` HTML fragment.

- [ ] **Unit 3: Final Schema Polish & Verification**
  - **Goal:** Ensure every non-functional/global tag is rendered.
  - **Files:** `catalog/layouts/peera/layout.json`
  - **Approach:** Scan all tags in `PORTAL_SCHEMA` and verify their presence in the JSON. Add missing ones to relevant pages.

## Verification

- Validate JSON syntax.
- Manually check each page in Studio via hard reload.
- Verify that tags render as sample data or session data (if logged in).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| UI Clutter | Use collapsible sections or subtle typography for secondary metadata like coordinates or tax rates. |

---
**Protocol Note:** Following root `AGENTS.md`, this plan will be executed via `ce-work` unit-by-unit after approval.
