---
name: figma-state-frames
description: Generate Empty, Loading, Error, Offline and Data-heavy state frames from one existing Figma screen. Use when asked to "add state screens", "make the empty state", "build a loading skeleton", "generate error states", or "produce all states for this screen". Never edits the original frames — it clones into a separate page and asks for approval with a dry-run report first. Requires the Figma MCP server.
---

# State Frames

The work designers skip most often, and the omission that always comes back during implementation. Takes one Default frame and derives five states from it.

## Non-negotiable rules

1. **Never modify existing frames.** Output goes to a new page `States — {screen name}`.
2. **No generation without dry-run approval.** Show the inferred structure, what will be built, and the drafted copy first.
3. **Loading keeps the exact skeleton of Default.** Never reduce row counts (prevents layout jump).
4. **Copy must contain real values from the screen.** Generic strings (`No data`) count as a failure.
5. **Write string literals as UTF-8.** Never use `\uXXXX` escapes.
6. **Blocks you cannot classify get cloned as-is** and reported. Never force a guess.

## Procedure

### 1. READ — read only
Infer the screen skeleton. All thresholds and the algorithm live in the reference.
→ `references/skeleton-inference.md` (3-tier content detection → chrome classification → list/grid/control detection → duplicate-node dedupe)

If confidence is `none` (no content area found), **stop here** and ask the user to point at the body frame.

### 2. PROPOSE — dry-run
Print inferred structure, states to build, output location, drafted copy, and unclassified blocks **as conversation**. The file stays untouched.
→ Report format: `references/non-destructive-protocol.md` §2

### 3. APPROVE
`proceed / subset only / edit copy first / cancel`. Nothing outside the approved scope is touched.

### 4. APPLY — generate
🔴 **Clone the original and transform it. Do not rebuild from scratch.** `original.clone()` → place on the new page → replace only inside the content area. Skeleton parity is then structurally guaranteed and chrome is preserved for free.

Transform rules:
- Chrome (status bar, nav, tab bar, home indicator), controls, dividers, spacers → **keep**
- Text → skeleton bar (width = **rendered glyph width** × 0.8, height = **original node height**). Node width makes bars too long; fontSize as height shrinks containers.
- Skeleton color → if the parent background is already tinted, **step one shade darker** (same shade is invisible)
- Lists → keep row count, skeletonize each row per `rowShape`
- **Instance rows → `detachInstance()` on the clone, then skeletonize inside** (overrides survive). Do not flatten a row into one block.
- **Anything painted with a `status-*` color → replace with a neutral skeleton** (a "Confirmed" badge visible during loading is false information). Check the node's own fill only.
- FAB / overlays → hide in Loading and Empty (in Empty it duplicates the CTA)
- Unclassified → clone as-is

State-by-state behavior: `references/skeleton-inference.md` §State matrix. Copy: `references/state-copy.md`.

Read `references/figma-authoring-pitfalls.md` before your first `use_figma` call (FILL ordering, surface color binding, literal text, API traps).

### 5. VERIFY
1. Render every generated frame with `get_screenshot` and **look at it** (clipped width, overlap, leftover status colors).
2. 🔴 **Skeleton parity check**: measure list height, row heights and intra-row heights on both original and output. If they differ, report the numbers — `parity drift: badge height +15pt`. Do not hide it.
3. Report generated node IDs, unclassified blocks, and any place where copy could not be generated.

Known drift: detaching an instance row can inflate a HUG-sized badge (measured +15pt). Root cause unresolved, so the parity check exposes it rather than pretending.

## States produced

| State | Required elements |
|---|---|
| Loading | Same skeleton as Default, one in-progress line |
| Empty | State title + body **containing real values from the screen** + next-action CTA |
| Error | What failed + cause + data-preservation note + `Retry` / `Later` branches |
| Offline / partial | Banner + **as-of timestamp** + skeleton only for the unloaded region + reconnect |
| Data-heavy | Row count × 2 + one row with text over 30 characters + "show more" |

## Never

- ❌ Delete nodes (hide instead, and report it)
- ❌ Modify component masters or create new components
- ❌ Delete or change variables and styles
- ❌ Declare done without looking at a screenshot
- ❌ Fill in a plausible generic sentence when copy could not be derived → leave a `[copy needed]` marker
