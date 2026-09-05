<h1 align="center">dope-uxui</h1>

<p align="center"><em>Agent skills for UX/UI designers who already live in Figma.</em></p>

<p align="center">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-black"></a>
  <img alt="Requires Figma MCP" src="https://img.shields.io/badge/requires-Figma%20MCP-blue">
  <img alt="Status: early" src="https://img.shields.io/badge/status-early-orange">
</p>

---

## What this is

Most AI design skills inject **taste** — they tell the model to make prettier output. This one does something different: it does the **mechanical work inside your existing Figma file**, without touching your originals.

The first skill generates the thing designers skip most often and regret every time: **state screens**.

| | |
|---|---|
| Input | one Default frame you already made |
| Output | Empty, Loading, Error, Offline and Data-heavy frames on a **separate page** |
| Your file | **never modified** — it clones, and it asks first |
| Manual cost replaced | ~15–20 min per state, per screen |

## Why it is not a prompt

Every threshold in these skills was derived by running code against real Figma files and checking the result against screenshots. The rules that survived are the ones that were **measured**, and the failures are documented next to them.

Verification sample: 1 authored file + **2 real-world production files** (a Spotify clone, 22 screens; a Netflix ticketing flow, 50 screens).

| What was measured | Result |
|---|---|
| List row detection | **19 / 21 correct**, 0 false positives after fixes |
| Content-area detection across 3 file styles | 7 / 7 screens |
| Chrome classification (status bar, nav, tab, home indicator) | 6 / 6 screens; 1 partial (over-split tab bar) |
| Duplicate overlapping nodes found in production files | 9 |
| Generated states rendered and reviewed | Loading, Empty, Error |
| Text overrides surviving `detachInstance()` | verified preserved |

The single most useful finding is a warning about our own first draft:

> **Production files do not use auto layout at the screen root.**
> 0 of 22 Spotify screens. 0 of 50 Netflix screens. 18 of 18 in the file we had authored ourselves.
> Our first algorithm keyed on `layoutGrow === 1` and called it "the decisive signal". That was sampling bias, and it would have failed on every real file.

Details, thresholds and the full scorecard: [`skeleton-inference.md`](skills/figma-state-frames/references/skeleton-inference.md)

## Requirements

- An agent that supports skills — Claude Code, Cursor, Codex, or similar
- **The [Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559)** with write access to the file you point it at
- A Figma file with at least one screen frame

## Install

```bash
npx skills add https://github.com/iceberg-1234/dope-uxui
```

Or install a single skill by its install name (the `name:` field in the SKILL frontmatter):

```bash
npx skills add https://github.com/iceberg-1234/dope-uxui --skill "figma-state-frames"
```

You can also just copy a `SKILL.md` into your project, or paste it into a conversation.

## Skills

| Skill | Install name | What it does |
|---|---|---|
| **figma-state-frames** | `figma-state-frames` | Reads one screen, infers its skeleton, and generates Empty / Loading / Error / Offline / Data-heavy frames on a new page. Dry-run first, approval required, originals untouched. |

More are planned — see [Roadmap](#roadmap).

## How it behaves

Every skill here follows the same five-step contract, because the fastest way to lose a designer is to damage their working file.

```
1. READ      read only — creates nothing, changes nothing
2. PROPOSE   a dry-run report in chat: what it inferred, what it will build, the drafted copy
3. APPROVE   proceed / subset only / edit copy first / cancel
4. APPLY     the approved scope only, and it returns every node ID it touched
5. VERIFY    renders the output, looks at it, and reports numeric drift instead of hiding it
```

If it cannot infer your screen's structure (for example, no auto layout anywhere and no clear content band), it **stops and asks you to point at the body frame** rather than guessing. Blocks it cannot classify are cloned as-is and listed in the report.

Full contract: [`non-destructive-protocol.md`](skills/figma-state-frames/references/non-destructive-protocol.md)

## What good output looks like

Two rules do most of the work.

**Loading keeps the exact skeleton of Default.** It clones your frame and replaces content in place, so spacing, dividers, chrome and row counts are preserved structurally rather than by effort. Row counts are never reduced — that is what causes layout jump. After generating, it measures both frames and reports any drift in numbers.

**Copy is assembled from values already on your screen.** Not `No data available`, but:

> `Your internet connection dropped. The 5 Day 2 items you just edited are still here.`

built from the caption's day index, its unit noun, and the detected row count. The pattern was taken from a real production Empty screen, not invented. If it cannot extract a single value, it leaves a `[copy needed]` marker instead of writing something plausible.

Details: [`state-copy.md`](skills/figma-state-frames/references/state-copy.md)

## Known limitations

Stated plainly, because a skill that hides its gaps is worse than one that has them.

| Limitation | Status |
|---|---|
| Detaching an instance row can inflate a HUG-sized badge by ~15pt | **Root cause unresolved** after 10 iterations. The parity check surfaces it rather than hiding it |
| Horizontal carousels, chip rows and search fields | left `UNCLASSIFIED` and cloned as-is |
| Multi-layer bottom chrome (mini player above a tab bar) | separated, but the tab bar can over-split |
| Nested lists (rows inside rows) | only the top-level cluster is returned |
| iPad and desktop widths | only 375pt and 428pt verified; chrome thresholds likely need recalibration |
| Generation on a fully absolute-positioned file | detection verified, generation not yet attempted |
| Offline and Data-heavy states | specified and templated, not yet generated end to end |

Every unverified rule inside the reference docs is tagged `unverified`. If you hit one of these, an issue with the file structure is genuinely useful.

## Roadmap

Ordered by how much manual pain each removes, based on where designers actually lose time:

1. **figma-state-frames** — state screens ← *shipped, early*
2. **figma-design-audit** — read-only accessibility and token audit (contrast, 44pt targets, minimum text size, dark-mode pairs, duplicate nodes). Read-only means the lowest trust barrier
3. **figma-token-normalize** — bind hardcoded colors to variables, align spacing to the scale, generate and verify dark-mode pairs, rename layers
4. **figma-screen-build** — spec to screens
5. **mobile-screen-spec** — PRD to screen list, IA and states (the one skill that needs no Figma access)

## Contributing

Issues and PRs welcome. Two things make a contribution especially valuable here:

- **A file that breaks the inference.** Structure descriptions or a shared link beat a bug description
- **A measurement.** If you change a threshold, say what you ran it against and what the output was. The project's rule is that a rule without evidence does not go in

## License

MIT — see [LICENSE](LICENSE).
