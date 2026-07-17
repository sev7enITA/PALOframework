# PALO-AI n8n Three-Outcome Demo

This developer-preview demo makes three governance outcomes visible without executing a real target tool:

- an autonomous low-risk profile is allowed to perform a simulated read;
- a supervised profile is routed to human approval;
- a restricted profile attempting an unregistered delete tool is denied.

All profiles use `case-n8n-demo`. Run the workflow once with sequence number `1`. Before a repeated run, increment the sequence number in all three PALO nodes to the next integer; the Gateway deliberately enforces caller-maintained monotonic sequences.

The workflow requires an n8n `PALO API` credential configured with the online Gateway URL and its protected bearer token. It does not include or export credentials.
