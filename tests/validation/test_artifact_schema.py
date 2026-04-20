import json
import subprocess
import sys
from pathlib import Path

from unittest import TestCase


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "validate_artifacts.py"


class ArtifactValidationTests(TestCase):
    def test_validator_accepts_repository_baseline(self) -> None:
        result = subprocess.run(
            [sys.executable, str(SCRIPT)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, msg=result.stderr)

    def test_validator_rejects_invalid_proposal_status(self) -> None:
        invalid_artifact = {
            "layout_key": "src_deadbeef",
            "version": "v001",
            "name": "Broken Layout",
            "renderer_version": "1.0",
            "source": {
                "mode": "explicit",
                "url": "https://example.com/layout",
                "canonical_url": "https://example.com/layout",
                "domain": "example.com",
            },
            "hash": {
                "layout_tree_hash": "sha256:test",
            },
            "layout": {
                "screens": [
                    {
                        "screen_id": "portal.billing",
                        "composition": {
                            "type": "screen",
                            "zones": [
                                {
                                    "id": "content",
                                    "items": [
                                        {
                                            "item_ref": "portal.billing.upgrade_plan",
                                            "interaction": {
                                                "type": "proposal_action",
                                                "proposal": {
                                                    "id": "proposal.portal.billing.upgrade_plan",
                                                    "title": "Upgrade Plan",
                                                    "status": "launched",
                                                    "intent": "Invalid status for validator test",
                                                    "visibility": "live_portal",
                                                    "owner": "company",
                                                },
                                            },
                                        }
                                    ],
                                }
                            ],
                        },
                    }
                ],
            },
        }

        layout_dir = ROOT / "catalog" / "layouts" / "src_deadbeef"
        layout_dir.mkdir(parents=True, exist_ok=True)
        artifact_path = layout_dir / "v001.json"

        try:
            artifact_path.write_text(json.dumps(invalid_artifact, indent=2) + "\n", encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("invalid proposal status", result.stderr)
        finally:
            artifact_path.unlink(missing_ok=True)
            layout_dir.rmdir()
