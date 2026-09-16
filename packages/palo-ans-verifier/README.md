# PALO ANS verifier

Small Go wrapper around the pinned official `agentnameservice/ans-sdk-go`.
The operational verifier and synthetic fixture issuer are separate commands.

See the [integration guide](../../examples/agentic-interface/integrations/ans/README.md)
for the trust boundary, build commands, coverage and remaining production gaps.

The verifier uses an operator-provisioned trust root file, emits bounded JSON
over private stdio, performs no network requests and holds no signing key.
It verifies signed leaf/status and request possession; it does not independently
validate a transparency-log checkpoint. Its replay cache is process-local.
