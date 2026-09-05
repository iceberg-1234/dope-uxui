# Non-Destructive Protocol

> **Scope**: the shared contract for every skill that touches an existing Figma working file.
> **Premise**: the user is handing you **their working file**. Break it once and they never come back. Predictability outranks accuracy.
> **Basis**: each gate below comes from an incident that actually happened — including one bulk color rebind that made an entire screen unreadable.

## The five-step contract

```
1. READ      read only; create nothing, change nothing
2. PROPOSE   print a dry-run report as conversation; the file is untouched
3. APPROVE   the user picks the scope; never proceed to step 4 without it
4. APPLY     execute only the approved scope and return every touched node ID
5. VERIFY    render the result, look at it, and check for regressions
```

🔴 **Never skip step 2.** "Obvious" fixes are not exempt. You do not know what the user intended in that file.

---

## 1. READ — constraints

| Allowed | Forbidden |
|---|---|
| Walking the node tree, reading properties | Creating, deleting or moving nodes |
| `get_screenshot` | Changing text, color or size |
| Listing variables and styles | Adding pages |
| Temporary computation | Changing selection |

Switching pages is allowed (`setCurrentPageAsync`), but restore the original page when done.

---

## 2. PROPOSE — the dry-run report

### Format (conversation only; never write a file)

```
Analyzed: {frame name} ({nodeId})

■ Inferred structure
  chrome    {n}   (status bar, nav bar, tab bar, home indicator)
  content   {n} blocks   (1 segment / 2 text / 1 list of 9 rows / 1 composite)
  overlays  {n}   (FAB)
  confidence  high | medium | low | none    ← if not high, say why

■ Will build
  {n} states
  · Loading   — 9 list rows → skeleton, FAB hidden, chrome kept
  · Empty     — list removed, guidance + CTA "{actual action label}"
  · Error     — top banner (cause + retry/later), existing list kept
  ...

■ Output location
  new page "States — {screen name}"    ← existing frames untouched

■ Drafted copy (editable)
  Empty title: "..."
  Empty body:  "..."
  Error cause: "..."

■ Changes to the existing file
  none                                 ← or, if changes are needed, the format below
```

### When existing nodes must change, quantify the blast radius

```
■ Proposed changes to the existing file
  1. unbound colors → variable binding      139 nodes   [samples: 3 nodeIds]
  2. spacing 18/3/9pt → 16/4/8pt            110 nodes   [samples: 3 nodeIds]
  3. layer names "Frame 427" → semantic     179 nodes   [samples: 3 nodeIds]

  ⚠ Undo path: Figma version history (File → Show version history).
    Saving a version before you approve is recommended.
```

🔴 **Never state "I will change n nodes" without samples.** A count alone is not decidable. Show at least 3 real node names with current and proposed values.

---

## 3. APPROVE — the gate

### Options offered to the user

| Option | Meaning |
|---|---|
| Proceed | run the whole proposal |
| Subset only | pick states or items (e.g. "Loading and Error only") |
| Edit copy first | the user rewrites the strings |
| Cancel | do nothing |

### Gates driven by inference confidence

| Confidence | Behavior |
|---|---|
| `high` | offer the options above |
| `low` (content area inferred) | 🔴 **state the basis and confirm first** — "I inferred the body area is '{name}'. Correct?" |
| `none` (no auto layout) | 🔴 **do not run.** "This screen is not auto-layout, so I cannot infer the structure reliably. Point me at the body frame and I will continue." Never force it |
| list match rate < 0.5 | ask about that block only — "I am not certain this block is a repeated list (40% match). Treat it as a list?" |

**The only case where you may skip approval**: the user explicitly said "do it without asking". Even then, do not skip the touched-node list in step 4 or the verification in step 5.

---

## 4. APPLY — execution rules

### Isolate the output

| Rule | Why |
|---|---|
| Create on a new page or section (`States — {screen}`) | do not disturb the user's canvas arrangement |
| Never change the original's coordinates, parent or name | the original is reference only |
| Encode provenance in generated frame names (`{original} / Loading`) | the user can tell later what was generated |
| Duplicate and override existing instances rather than creating components | do not pollute their design system |

### If original edits were approved

| Rule | Why |
|---|---|
| Approved items only. Other problems found mid-run are **reported, not fixed** | scope creep is a breach of trust |
| 🔴 Branch bulk edits **by role, never by value** | real incident: matching "if it is white, bind to primitive/white" bound large surfaces to a mode-invariant variable and destroyed dark mode entirely |
| Return **every** touched node ID | the basis for undo and traceability |
| Never modify a component master without approval | it propagates across the whole file |

### Absolutely never

- ❌ Delete nodes (hide with `visible = false` and report it)
- ❌ Delete pages
- ❌ Detach components in the original file
- ❌ Delete or change variables and styles (adding is fine)
- ❌ Reparent frames the user created

Hiding is also a destructive change. Record what you hid and why in the return value.

---

## 5. VERIFY — regression checks

### Mandatory: look at the render

Render every created or modified frame with `get_screenshot` and **look at it**.

| Check | Failure signal |
|---|---|
| Content fills the width | crowded into the left quarter → missing auto-layout FILL |
| No clipping, overlap or orphan nodes | |
| Skeleton keeps the original geometry | a large height delta means a layout jump |

### Extra checks by edit type

| Edit type | Required check |
|---|---|
| **Color binding** | 🔴 **Render in dark mode and look at it**, then restore light. This is where the real incident happened |
| Spacing / size | render that screen (layout collapse) |
| Text replacement | 🔴 **Print the resulting strings** in the return value. A typo inside the replacement string itself caused a second incident |
| Layer names | confirm instance overrides did not break |
| Font size | confirm text does not overflow its container |
| Any generation | 🔴 **parity check** — measure the same landmarks on original and output and report numeric drift |

### Final report format

```
■ Created
  {n} frames on page "States — {screen}"
  · Loading  {nodeId}
  · Empty    {nodeId}
  ...

■ Changes to the existing file
  none  |  {n} nodes (list: ...)

■ Verified
  {n} frames rendered and reviewed
  parity: list 319=319, rows 63×5 ✓ / badge +15pt ⚠
  (if colors changed) dark mode legibility confirmed, light restored

■ Open items
  · copy fell back to generic at: {location} — not enough domain vocabulary, needs input
  · low-confidence blocks: {location}
```

🔴 **Report honestly.** If you could not write the copy, a `[copy needed]` marker is better than a plausible generic sentence.

---

## String authoring rule (incident prevention)

🔴 **Write every string as a UTF-8 literal. Never use `\uXXXX` escapes.**

This applies not only to on-screen copy but to **warning messages, report text and log strings**. In the session that designed this protocol, an escape sequence inside a warning message produced a silent typo that was reported straight to the user. Every string a human will read is in scope — including the replacement strings in a find-and-replace script.

Details: `figma-authoring-pitfalls.md` §P0

---

## Checklist

- [ ] Nothing was changed during READ
- [ ] The dry-run report was printed **as conversation** (no file written)
- [ ] Proposals to change existing nodes included **a count plus 3 real samples**
- [ ] Confidence `none` meant not running, and asking the user to specify
- [ ] Only the approved scope was executed (other findings reported only)
- [ ] Output was isolated on a separate page
- [ ] Every created and modified node ID was returned
- [ ] The result was rendered and reviewed
- [ ] If colors changed, dark mode was verified and light restored
- [ ] The undo path (version history) was stated
- [ ] What failed or stayed uncertain was reported honestly
