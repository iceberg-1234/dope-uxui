# Audit Report

Return this in the user's language, as conversation only. Braced values below are placeholders, not measured results. Omit unavailable values explicitly rather than filling them with plausible examples.

```text
Design audit — read only
Scope: {file/branch and selected root names + IDs}
Platform / unit mapping: {source, or unconfirmed}
Policies: {WCAG design checks; supplied target/type policy; provisional recommendations}
Tools / evidence: {raw properties, screenshots, token definitions; unavailable capabilities}
Figma writes performed: none

Summary
- {n} confirmed findings affecting {n} unique nodes
- {n} review candidates; {n} unverified checks
- Coverage: {complete for the selected checks and roots / partial with reason}
- This is not implementation-level accessibility certification.

Coverage by check
Check | Unit | Eligible | PASS | FAIL | REVIEW | UNVERIFIED | NOT_APPLICABLE
C1 Text contrast | text ranges | {...}
C2 Non-text contrast | meaningful cues | {...}
T1 Target size | targets | {...}
T2 Type minimum | text ranges | {...}
D1 Color bindings | paint slots | {...}
D2 Theme pairs | consumer pairs per mode | {...}
D3 Duplicate layers | candidate groups | {...}

Findings — confirmed first, grouped by check and component
{finding ID} | {priority} | {status} | {check ID / criterion or project policy}
Location: {root, node name, real ID, range/paint slot if applicable}
Observed: {values with units, mode, evidence source}
Expected: {threshold and its source, or review question}
Evidence: {background/target/alias IDs, calculation or structural comparison}
Uncertainty / exceptions: {what was checked and what is not established}
Suggested next action: {specific proposal, not an applied fix}
Occurrences: {count and all affected IDs}

Visual verification
- Inspected roots: {IDs and actual modes}
- Not inspected: {IDs and reason}
- Dark-mode assessment: {existing rendered frames / token-only / unverified}

Unverified / excluded
- {check, affected IDs or unknown scope, missing evidence, next input needed}
- {hidden content or documented exception and reason}
- {truncation, inaccessible dependencies, unsupported paint stack or missing mapping}

Next step
{highest-impact verification or proposed repair scope; no changes have been applied}
```

## Reporting rules

- Each finding needs at least one actual node ID. A token-only dependency issue also lists its consumer ID and variable/collection IDs.
- Coverage is per check, not just how many frames were opened. If traversal was truncated, eligible count is `unknown`, never the observed sample count presented as a total.
- Once eligibility is known, its count equals PASS + FAIL + REVIEW + UNVERIFIED. NOT_APPLICABLE items are recorded separately as excluded. If one check has multiple policies, give separate rows so their statuses are not conflated.
- D3 candidate groups have no meaningful whole-file pass denominator. Report candidate/review counts and traversed node coverage; do not claim every other node passed duplicate detection.
- A literal paint or duplicate candidate is not a confirmed defect without a rule and sufficient evidence. Do not count `REVIEW` in confirmed findings.
- Missing type policy means the inventory is measured but the minimum-size verdict is unverified. Absent theme support is NOT_APPLICABLE only when the user confirms it is not required; inaccessible theme definitions are unverified.
- Preserve exact values for decisions; round only for display and add precision at threshold boundaries.
- Keep semantic observations separate from measurements: `20 × 20 icon; enclosing target not established` is more honest than `20 × 20 button fails`.
- Keep a compact summary with grouped detail. For a large report, deliver additional batches in conversation and clearly state which IDs remain to be delivered. Never silently drop affected IDs or write an unsolicited report file.
- Never claim a mode was rendered when only its token values were evaluated. Never claim the entire design passed because the assessable subset had no failures.
- No automatic remediation, Figma comments or external issue creation. If requested, first propose a separate repair/export task with the exact affected scope and await authorization.
