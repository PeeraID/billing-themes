# billing-themes

Git-only storage for applied theme artifacts used by Billing Customer Portal (`*.portal.peera.id`).

## Purpose

- Source of truth for **applied** tenant themes.
- Consumed at runtime via jsDelivr CDN.
- Written by backend automation (GitHub App / bot), not by frontend clients.

## Repository Layout

```text
designs/
  tenants/{tenant_code}/
    active-theme.json
    manifest.json
    versions/
      {version_id}.json
```

## Runtime URL Pattern

```text
https://cdn.jsdelivr.net/gh/PeeraID/billing-themes@main/designs/tenants/{tenant_code}/active-theme.json
```

## Publish Policy

- Branch target: `main`
- Visibility: public
- Stored payloads: applied artifacts only (`active-theme.json`, `versions/*.json`, `manifest.json`)
- Drafts are not persisted here

## Write Contract (High Level)

Apply/fork flows should:

1. Read current `main` head commit
2. Create blobs for updated files
3. Create tree from base tree
4. Create commit
5. Fast-forward update `refs/heads/main`

## Notes

- Keep this repo free from secrets.
- Because this repository is public, artifact payloads must not contain:
  - personal data (email, phone, customer name, address, KTP, etc.)
  - internal IDs or tokens (session IDs, auth tokens, API keys, private URLs)
  - internal-only references (private dashboard links, internal ticket URLs)
- `applied_by.user_id` should be an anonymized actor reference (for example: `system`, `admin-redacted`, or hash), never a real internal user ID.
- `branding.logo_url` and `source.reference_url` should only use public-safe URLs, or be `null`.
- Commit metadata (version, actor reference, timestamp, sha) should be present in artifact payloads.
- Frontend integration contract lives in `billing-app/docs/contracts/theme-studio-git-storage-contract.md`.
