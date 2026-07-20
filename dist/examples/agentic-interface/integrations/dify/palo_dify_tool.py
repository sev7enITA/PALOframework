"""Non-production Dify example for the PALO-AI developer-preview gateway.

This example never stores policy or signing keys and never decides locally. It demonstrates
canonical claim submission only. It does not provide production identity, retry/resume,
exactly-once execution, meaningful human approval, or a trusted evidence boundary.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
import secrets
import urllib.error
import urllib.request
import uuid
from typing import Any, Dict, Iterable, Optional


def _canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


class PaloGovernanceTool:
    def __init__(self, gateway_url: Optional[str] = None, gateway_token: Optional[str] = None):
        self.gateway_url = (gateway_url or os.environ.get("PALO_GATEWAY_URL", "http://127.0.0.1:8787")).rstrip("/")
        self.gateway_token = gateway_token or os.environ.get("PALO_GATEWAY_TOKEN")
        if not self.gateway_token or len(self.gateway_token) < 24:
            raise ValueError("PALO_GATEWAY_TOKEN must contain at least 24 characters")

    def _post(self, route: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        request = urllib.request.Request(
            f"{self.gateway_url}{route}",
            data=_canonical(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {self.gateway_token}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            # Fail closed: a governance outage never becomes implicit authorization.
            return {"status": "denied", "reasons": [f"PALO governance gateway unavailable: {error}"], "obligations": ["restore_governance_gateway"]}

    def verify_and_log(
        self,
        proposed_tool: str,
        args: Dict[str, Any],
        *,
        case_id: str,
        agent_id: str,
        operation: str,
        resource: str,
        path: str,
        argument_schema: Dict[str, Any],
        sequence_number: int,
        read_scopes: Iterable[str] = (),
        write_scopes: Iterable[str] = (),
        external_network: bool = False,
        network_host: Optional[str] = None,
        delegation_depth: int = 0,
        subagent_count: int = 0,
        approval_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        action = {
            "tool": proposed_tool,
            "operation": operation,
            "resource": resource,
            "path": path,
            "networkIntent": "read" if external_network else "none",
            "arguments": args,
            "argumentsDigest": f"sha256:{hashlib.sha256(_canonical(args).encode('utf-8')).hexdigest()}",
            "argumentSchemaDigest": f"sha256:{hashlib.sha256(_canonical(argument_schema).encode('utf-8')).hexdigest()}",
        }
        if network_host:
            action["networkHost"] = network_host
        claim = {
            "format": "palo-agentic-action-claim",
            "schemaVersion": "1.1.0",
            "claimId": f"claim-{uuid.uuid4()}",
            "agentId": agent_id,
            "caseId": case_id,
            "action": action,
            "requestedScopes": {"read": list(read_scopes), "write": list(write_scopes)},
            "externalNetwork": external_network,
            "delegation": {"depth": delegation_depth, "subagentCount": subagent_count},
            "requestedAt": now.isoformat().replace("+00:00", "Z"),
            "expiresAt": (now + timedelta(minutes=2)).isoformat().replace("+00:00", "Z"),
            "nonce": secrets.token_urlsafe(24),
            "idempotencyKey": f"dify:{agent_id}:{uuid.uuid4()}",
            "sequenceNumber": sequence_number,
        }
        decision = self._post("/v1/actions/verify", {"claim": claim, "approvalId": approval_id})
        return {
            "authorized": decision.get("status") == "allowed",
            "pendingApproval": decision.get("status") == "pending_approval",
            "claim": claim,
            "decision": decision,
        }
