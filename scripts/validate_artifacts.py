from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_INDEX = ROOT / "catalog" / "layouts" / "index.json"
USED_URLS = ROOT / "catalog" / "source-registry" / "used-urls.json"
LAYOUT_KEY_PATTERN = re.compile(r"^src_[a-f0-9]{8}$")
VERSION_PATTERN = re.compile(r"^v[0-9]{3}$")
HASH_PATTERN = re.compile(r"^sha256:.+")
PROPOSAL_STATUSES = {"planned", "preview_only", "coming_soon", "blocked", "deprecated"}
PROPOSAL_VISIBILITIES = {"preview_only", "live_portal"}


class ValidationError(Exception):
    pass


def read_json(path: Path) -> object:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def validate_catalog_index(payload: object) -> list[dict]:
    ensure(isinstance(payload, dict), "catalog/layouts/index.json must be an object")
    entries = payload.get("entries")
    ensure(isinstance(entries, list), "catalog/layouts/index.json entries must be an array")

    normalized: list[dict] = []
    seen_layout_keys: set[str] = set()
    for entry in entries:
        ensure(isinstance(entry, dict), "catalog entry must be an object")
        layout_key = entry.get("layout_key")
        latest_version = entry.get("latest_version")
        name = entry.get("name")

        ensure(isinstance(layout_key, str) and LAYOUT_KEY_PATTERN.match(layout_key), "invalid layout_key in catalog index")
        ensure(layout_key not in seen_layout_keys, f"duplicate catalog layout_key: {layout_key}")
        seen_layout_keys.add(layout_key)
        ensure(isinstance(latest_version, str) and VERSION_PATTERN.match(latest_version), f"invalid latest_version for {layout_key}")
        ensure(isinstance(name, str) and name.strip(), f"missing catalog name for {layout_key}")
        normalized.append(entry)

    return normalized


def validate_used_urls(payload: object) -> None:
    ensure(isinstance(payload, dict), "catalog/source-registry/used-urls.json must be an object")
    entries = payload.get("entries")
    ensure(isinstance(entries, list), "catalog/source-registry/used-urls.json entries must be an array")
    for entry in entries:
        ensure(isinstance(entry, str) and entry.strip(), "used URL entry must be a non-empty string")


def validate_proposal_action(interaction: dict, context: str) -> None:
    proposal = interaction.get("proposal")
    ensure(isinstance(proposal, dict), f"{context}: proposal_action requires proposal object")
    proposal_id = proposal.get("id")
    title = proposal.get("title")
    status = proposal.get("status")
    intent = proposal.get("intent")
    visibility = proposal.get("visibility")
    owner = proposal.get("owner")

    ensure(isinstance(proposal_id, str) and proposal_id.strip(), f"{context}: proposal id is required")
    ensure(isinstance(title, str) and title.strip(), f"{context}: proposal title is required")
    ensure(status in PROPOSAL_STATUSES, f"{context}: invalid proposal status")
    ensure(isinstance(intent, str) and intent.strip(), f"{context}: proposal intent is required")
    ensure(visibility in PROPOSAL_VISIBILITIES, f"{context}: invalid proposal visibility")
    ensure(owner == "company", f"{context}: proposal owner must be company")


def validate_interaction(interaction: dict, context: str) -> None:
    interaction_type = interaction.get("type")
    ensure(isinstance(interaction_type, str), f"{context}: interaction type is required")

    if interaction_type == "official_action":
        action_ref = interaction.get("action_ref")
        ensure(isinstance(action_ref, str) and action_ref.strip(), f"{context}: official_action requires action_ref")
        return

    if interaction_type == "local_ui_rule":
        rule = interaction.get("rule")
        ensure(isinstance(rule, str) and rule.strip(), f"{context}: local_ui_rule requires rule")
        return

    if interaction_type == "proposal_action":
        validate_proposal_action(interaction, context)
        return

    raise ValidationError(f"{context}: unsupported interaction type {interaction_type}")


def validate_layout_artifact(path: Path, payload: object) -> tuple[str, str]:
    ensure(isinstance(payload, dict), f"{path}: artifact must be an object")
    layout_key = payload.get("layout_key")
    version = payload.get("version")

    ensure(isinstance(layout_key, str) and LAYOUT_KEY_PATTERN.match(layout_key), f"{path}: invalid layout_key")
    ensure(isinstance(version, str) and VERSION_PATTERN.match(version), f"{path}: invalid version")
    ensure(path.parent.name == layout_key, f"{path}: directory name must match layout_key")
    ensure(path.stem == version, f"{path}: filename must match version")

    name = payload.get("name")
    renderer_version = payload.get("renderer_version")
    ensure(isinstance(name, str) and name.strip(), f"{path}: name is required")
    ensure(isinstance(renderer_version, str) and renderer_version.strip(), f"{path}: renderer_version is required")

    source = payload.get("source")
    ensure(isinstance(source, dict), f"{path}: source is required")
    ensure(source.get("mode") in {"random", "explicit", "promoted_custom"}, f"{path}: invalid source mode")
    for key in ("url", "canonical_url", "domain"):
        ensure(isinstance(source.get(key), str) and source.get(key).strip(), f"{path}: source.{key} is required")

    hash_payload = payload.get("hash")
    ensure(isinstance(hash_payload, dict), f"{path}: hash is required")
    layout_tree_hash = hash_payload.get("layout_tree_hash")
    ensure(isinstance(layout_tree_hash, str) and HASH_PATTERN.match(layout_tree_hash), f"{path}: invalid layout_tree_hash")

    layout = payload.get("layout")
    ensure(isinstance(layout, dict), f"{path}: layout is required")
    screens = layout.get("screens")
    ensure(isinstance(screens, list) and screens, f"{path}: layout.screens must be a non-empty array")

    for screen_index, screen in enumerate(screens):
        context = f"{path}: screen[{screen_index}]"
        ensure(isinstance(screen, dict), f"{context} must be an object")
        screen_id = screen.get("screen_id")
        ensure(isinstance(screen_id, str) and screen_id.strip(), f"{context}: screen_id is required")
        composition = screen.get("composition")
        ensure(isinstance(composition, dict), f"{context}: composition is required")
        ensure(composition.get("type") in {"shell", "screen"}, f"{context}: invalid composition type")
        zones = composition.get("zones")
        ensure(isinstance(zones, list) and zones, f"{context}: zones must be a non-empty array")

        for zone_index, zone in enumerate(zones):
            zone_context = f"{context} zone[{zone_index}]"
            ensure(isinstance(zone, dict), f"{zone_context} must be an object")
            zone_id = zone.get("id")
            ensure(isinstance(zone_id, str) and zone_id.strip(), f"{zone_context}: id is required")
            items = zone.get("items")
            ensure(isinstance(items, list) and items, f"{zone_context}: items must be a non-empty array")

            for item_index, item in enumerate(items):
                item_context = f"{zone_context} item[{item_index}]"
                ensure(isinstance(item, dict), f"{item_context} must be an object")
                item_ref = item.get("item_ref")
                ensure(isinstance(item_ref, str) and item_ref.strip(), f"{item_context}: item_ref is required")
                if "interaction" in item:
                    ensure(isinstance(item["interaction"], dict), f"{item_context}: interaction must be an object")
                    validate_interaction(item["interaction"], item_context)

    return layout_key, version


def validate_catalog_alignment(entries: list[dict]) -> None:
    for entry in entries:
        layout_key = entry["layout_key"]
        latest_version = entry["latest_version"]
        version_path = ROOT / "catalog" / "layouts" / layout_key / f"{latest_version}.json"
        ensure(version_path.exists(), f"catalog index points to missing artifact: {version_path.relative_to(ROOT)}")


def validate_tenant_active_theme(path: Path, payload: object) -> None:
    ensure(isinstance(payload, dict), f"{path}: active theme must be an object")
    for key in ("schema_version", "tenant_code", "design_name", "branding", "tokens", "layout", "source"):
        ensure(key in payload, f"{path}: missing required field {key}")

    tenant_code = payload.get("tenant_code")
    ensure(isinstance(tenant_code, str) and tenant_code.strip(), f"{path}: tenant_code is required")
    ensure(path.parent.name == tenant_code, f"{path}: tenant_code must match tenant directory")

    layout = payload.get("layout")
    ensure(isinstance(layout, dict), f"{path}: layout must be an object")
    layout_ref = layout.get("layout_ref")
    if layout_ref is not None:
      ensure(isinstance(layout_ref, dict), f"{path}: layout_ref must be an object when present")
      layout_key = layout_ref.get("layout_key")
      version = layout_ref.get("version")
      ensure(isinstance(layout_key, str) and LAYOUT_KEY_PATTERN.match(layout_key), f"{path}: invalid layout_ref.layout_key")
      ensure(isinstance(version, str) and VERSION_PATTERN.match(version), f"{path}: invalid layout_ref.version")

    custom_layout = layout.get("custom_layout")
    if custom_layout is not None:
      ensure(isinstance(custom_layout, dict), f"{path}: custom_layout must be an object when present")

    source = payload.get("source")
    ensure(isinstance(source, dict), f"{path}: source must be an object")
    layout_strategy = source.get("layout_strategy")
    if layout_strategy is not None:
      ensure(layout_strategy in {"basic", "approved", "custom"}, f"{path}: invalid source.layout_strategy")


def main() -> int:
    try:
        entries = validate_catalog_index(read_json(CATALOG_INDEX))
        validate_used_urls(read_json(USED_URLS))

        layout_root = ROOT / "catalog" / "layouts"
        for artifact_path in layout_root.glob("src_*/*.json"):
            validate_layout_artifact(artifact_path, read_json(artifact_path))

        validate_catalog_alignment(entries)
        for active_theme_path in (ROOT / "designs" / "tenants").glob("*/active-theme.json"):
            validate_tenant_active_theme(active_theme_path, read_json(active_theme_path))
        return 0
    except ValidationError as error:
        print(f"validation failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
