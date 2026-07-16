package palo.agentic.governance

default allow_subagent_spawn = false
default allow_task_claim = false

# Rules for Spawning Subagents (Modality A)
allow_subagent_spawn {
    # Check that parent role is recognized
    is_valid_parent_role(input.parent.role)
    # Check that subagent role is in allowed roles
    subagent_role_is_allowed(input.parent.allowedSubagentRoles, input.subagent.role)
    # Max subagents constraint
    input.parent.currentSubagents < input.parent.maxSubagents
    # Check risk matching: limited-risk subagent is allowed
    input.subagent.riskTier == "limited"
}

# Administrative roles can always spawn limited subagents
allow_subagent_spawn {
    input.parent.role == "Governance Lead"
    input.subagent.riskTier == "limited"
}

# Rules for Task Claims (Modality B)
allow_task_claim {
    # If the task does not require human validation, it can be claimed
    not input.agent.requireHumanValidation
    # Verify that the task actions are within the agent's allowed tools
    all_tools_allowed(input.agent.allowedTools, input.task.requiredTools)
}

# Helper: check parent role is allowed to delegate
is_valid_parent_role(role) {
    role == "Product Owner"
}
is_valid_parent_role(role) {
    role == "Governance Lead"
}

# Helper: check subagent role is in allowed roles
subagent_role_is_allowed(allowed_roles, role) {
    allowed_roles[_] == role
}

# Helper: check all tools are allowed
all_tools_allowed(allowed, required) {
    # every required tool must be in the allowed set
    count({x | x := required[_]; not allowed_contains(allowed, x)}) == 0
}

allowed_contains(allowed, x) {
    allowed[_] == x
}
