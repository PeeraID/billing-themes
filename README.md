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
- Commit metadata (version, actor, timestamp, sha) should be present in artifact payloads.
- Frontend integration contract lives in `billing-app/docs/contracts/theme-studio-git-storage-contract.md`.
