from typing import Any, Dict, List
import hashlib
import json
import time

class PaloGovernanceTool:
    """
    Custom Dify middleware tool for intercepting and logging tool executions
    against the PALO Agentic Interface constraints.
    """
    
    def __init__(self, agent_config_path: str):
        with open(agent_config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)
            
    def verify_and_log(self, proposed_tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        # Extract constraints from PALO Agentic Interface config
        allowed_tools = self.config.get("authority", {}).get("allowedTools", [])
        agent_id = self.config.get("agentId", "unknown")
        
        # 1. Authority Verification
        if proposed_tool not in allowed_tools:
            return {
                "authorized": False,
                "error": f"Tool '{proposed_tool}' is not in the allowed scope for Agent '{agent_id}'."
            }
            
        # 2. Cryptographic Signing of the Evidence
        timestamp = int(time.time())
        payload = {
            "agentId": agent_id,
            "tool": proposed_tool,
            "arguments": args,
            "timestamp": timestamp
        }
        
        # Mock cryptographic signing using SHA-256 for integrity
        serialized = json.dumps(payload, sort_keys=True)
        sign_key = self.config.get("evidence", {}).get("signKeyHash", "default_secret")
        signature = hashlib.sha256((serialized + sign_key).encode("utf-8")).hexdigest()
        
        return {
            "authorized": True,
            "evidence": {
                "artifactId": f"ev-{agent_id}-{timestamp}",
                "title": f"Execution authorization for {proposed_tool}",
                "kind": "signed-execution-log",
                "content": serialized,
                "signature": signature
            }
        }
