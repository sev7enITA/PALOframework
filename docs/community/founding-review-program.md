# PALO founding review program

The Evidence Pack review cohort is 20 people: four reviewers in each of five communities. A person becomes a founding reviewer only after explicitly accepting the task. Public nomination alone is not acceptance.

## Cohorts and exact tasks

| Community | Seats | Review task | Required output |
| --- | ---: | --- | --- |
| Automation builders | 4 | Complete the preloaded case, then prepare one case contribution. Identify friction and any workflow bypass. | Completion time, one friction trace and one contribution artifact. |
| Policy-as-code and platform security | 4 | Attempt receipt tampering, missing-authority and fail-open paths. | One reproducible negative test with severity and expected behavior. |
| Governance, legal and audit | 4 | Assess whether the dossier supports a named human decision without overstating legal status. | Decision-rights review and one evidence-quality correction. |
| Research and standards | 4 | Reproduce the result from a clean clone and critique claim/source traceability. | Reproduction record, source critique and proposed measurement improvement. |
| Executive and design partners | 4 | Decide whether to continue, pause or stop the synthetic case using only the dossier. | Decision, missing evidence and willingness to repeat with a second case. |

## Nomination record

The named roster is maintained outside the public repository until each person has been approved for outreach and a contact route is known. This avoids unsolicited public tagging and avoids implying endorsement before consent.

For every nominee record:

- Name and public affiliation.
- Community seat and exact task from the table above.
- Why the person is relevant, based on public work.
- Contact route approved by the maintainer.
- Invitation date, response and consent to public credit.

## Invitation template

Subject: `A bounded 20-minute review of PALO Evidence Pack`

> I am inviting a small founding review cohort to challenge one claim: allowed is not verified. Your task is limited to [task]. The case is synthetic, runs locally, needs no account and sends no mandatory telemetry. Participation does not imply endorsement. If you accept, please return [required output] by [date]. May we credit you publicly if your feedback changes PALO? A no or no response ends the invitation.

## Review integrity

- No reviewer receives repository write access merely for accepting.
- Findings are credited only with explicit permission.
- Conflicts and affiliations are recorded with the finding.
- A maintainer cannot mark a self-review as independent.
- High or critical security findings move to the private security route.
