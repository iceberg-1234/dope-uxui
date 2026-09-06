# Project conventions

- This repository distributes agent skills, not an application. Keep a skill's references and scripts alongside its SKILL.md.
- The existing state-generation skill is under `skills/figma-state-frames`. New Devin skills belong under `.devin/skills/`; do not relocate the existing skill incidentally.
- Preserve original Figma designs. The audit skill permits no writes, including temporary clones, page switches or variable-mode toggles.
- Distinguish standards-backed checks, project policies and unverified heuristics. Synthetic metric tests do not validate live Figma traversal or rendering.

# Verification

- Run metric regressions from the repository root: `node --test .devin/skills/figma-design-audit/tests/metrics.test.mjs` (Node.js 22 or later; no dependencies).
- Run `skillspector scan <changed-skill-directory> --no-llm` for every authored or modified skill. HIGH and CRITICAL findings block completion; report the risk score.
- `.github/workflows/skillspector.yml` calls the shared SkillSpector workflow for all skills and runs the metric regressions. Do not weaken its HIGH threshold or add suppressions to get a passing build.
- Run `git diff --check`; check newly created untracked files separately before committing.
- Live audit verification needs a user-selected Figma file and node IDs. No production audit fixture is currently supplied.
