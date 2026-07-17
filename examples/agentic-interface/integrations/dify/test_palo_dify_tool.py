import importlib.util
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).with_name("palo_dify_tool.py")
SPEC = importlib.util.spec_from_file_location("palo_dify_tool", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ConnectorTests(unittest.TestCase):
    def tool(self, decision):
        client = MODULE.PaloGovernanceTool(gateway_url="http://127.0.0.1:1", gateway_token="a-secure-test-token-123456789")
        captured = []
        client._post = lambda route, payload: captured.append((route, payload)) or decision
        return client, captured

    def test_connector_sends_full_canonical_claim_with_schema_bound_arguments(self):
        client, captured = self.tool({"status": "allowed", "reasons": ["within authority"]})
        result = client.verify_and_log(
            "read_file", {"path": "/workspace/support-docs/runbook.md"}, case_id="case-runtime-example",
            agent_id="agent-support-copilot-sub-1", operation="read", resource="/workspace/support-docs/runbook.md",
            path="/workspace/support-docs/runbook.md", argument_schema={"type": "object"}, sequence_number=1,
            read_scopes=["/workspace/support-docs"], external_network=False,
        )
        self.assertTrue(result["authorized"])
        claim = captured[0][1]["claim"]
        self.assertEqual(captured[0][0], "/v1/actions/verify")
        self.assertEqual(claim["action"]["arguments"]["path"], "/workspace/support-docs/runbook.md")
        self.assertTrue(claim["action"]["argumentsDigest"].startswith("sha256:"))
        self.assertTrue(claim["action"]["argumentSchemaDigest"].startswith("sha256:"))

    def test_pending_approval_is_not_authorized(self):
        client, _ = self.tool({"status": "pending_approval", "approvalId": "approval-example"})
        result = client.verify_and_log("write_file", {}, case_id="case-runtime-example", agent_id="agent-support-copilot-sub-1", operation="update", resource="/workspace/file", path="/workspace/file", argument_schema={"type": "object"}, sequence_number=1, write_scopes=["/workspace"])
        self.assertFalse(result["authorized"])
        self.assertTrue(result["pendingApproval"])

    def test_claim_ids_and_nonces_do_not_collide(self):
        client, captured = self.tool({"status": "denied", "reasons": ["test"]})
        for sequence in range(1, 3):
            client.verify_and_log("read_file", {}, case_id="case-runtime-example", agent_id="agent-support-copilot-sub-1", operation="read", resource="/workspace/file", path="/workspace/file", argument_schema={"type": "object"}, sequence_number=sequence)
        claims = [item[1]["claim"] for item in captured]
        self.assertNotEqual(claims[0]["claimId"], claims[1]["claimId"])
        self.assertNotEqual(claims[0]["nonce"], claims[1]["nonce"])


if __name__ == "__main__":
    unittest.main()
