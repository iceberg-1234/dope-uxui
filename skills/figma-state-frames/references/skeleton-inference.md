# Skeleton Inference

> **Status**: every rule and threshold below was derived by running code against real Figma files and checking the output against screenshots. Anything not verified is marked `unverified`.
> **Sample**: 1 authored file (auto-layout throughout) + **2 real-world production files** (a Spotify clone, 22 screens; a Netflix ticketing flow, 50 screens).
> **Principle**: 🔴 **When unsure, report instead of guessing.** A forced classification damages the user's file.

---

## 🔴 The most important finding: production files do not use auto layout at the screen root

| File | Screens | Root is auto-layout | Has a `layoutGrow=1` child |
|---|---|---|---|
| Authored (our own output) | 18 | 18 / 18 | 18 / 18 |
| **Spotify clone** | 22 | **0 / 22** | **0 / 22** |
| **Netflix ticketing flow** | 50 | **0 / 50** | **0 / 50** |

The first version of this algorithm concluded that `layoutGrow === 1` was "the decisive signal". **That was sampling bias.** It worked 100% of the time on files we had authored ourselves and fires **zero times** across 72 real-world screens.

→ Content detection must be a **three-tier cascade**. Any design that depends on a single signal fails on real files.

---

## Step 1: Content area detection — three tiers in order

```
signal 1  direct child with layoutGrow === 1                       → authored / well-kept files
signal 2  child with layoutMode==='VERTICAL' && h >= frameH*0.4     → production convention (scroll viewport)
signal 3  geometric band decomposition                             → fully absolute files
```

### signal 2 — the "scroll viewport" convention (the main real-world path)

Production designers leave the root absolute and wrap **only the scrolling body** in an auto-layout frame, because the content has to be taller than the screen (measured: body 1088pt inside an 812pt frame).

| Measured | Result |
|---|---|
| Netflix `Tickets/ShowtimeList` | `Scroll Viewport` (VERTICAL, h=686) detected ✓ |
| Netflix `ShowtimeList-Loading` / `-Empty` / `MyTickets` | 4 / 4 detected ✓ |
| Chrome split (StatusBar, NavHeader, TabBar, HomeIndicator) | 4 / 4 correct ✓ |

Do not rely on the layer name (`Scroll Viewport`). Match on structure: **a tall VERTICAL auto-layout child**.

### signal 3 — geometric bands (the Spotify sample)

With no auto layout anywhere, decompose by coordinates. See §3-B.

---

## Step 2: Chrome classification (position based, shared by all tiers)

`y` is relative to the frame top, `H` is frame height.

| Verdict | Condition | Measured |
|---|---|---|
| `STATUS_BAR` | `y ≤ 4` and `h ≤ 60` | h=44 in both Spotify and Netflix |
| `NAV_BAR` | `y < H×0.25` and `40 ≤ h ≤ 100` | h=48 (Netflix), h=55 (Spotify header) |
| `TAB_BAR` | `y > H×0.7` and `44 ≤ h ≤ 70` | h=64 (Netflix), h=79 (Spotify) |
| `HOME_INDICATOR` | `y + h ≥ H − 6` and `h ≤ 40` | h=34 (as a node), h=5 (bar only) |

### 🔴 Bottom chrome can be multi-layered, and gaps alone cannot separate it

Spotify's Search screen stacks a **mini player above the tab bar**. With a 12pt merge gap the two fuse into one band; narrowing to 4pt **splits the tab bar itself** into an icon band (y=851) and a label band (y=878). No gap value works.

→ **Use a full-width background rectangle as the band boundary.** The mini player owns a rectangle at `w ≥ frameW × 0.85`; the tab bar has no background, just scattered icons and labels. `unverified` — derived from observation, not yet implemented and re-measured.

### Chrome is not always a single node

Spotify's tab bar is **not a frame**: it is 3 loose text nodes and 4 loose vectors. Treat chrome as a **y band**, not a node. Mark it `loose: true` and clone the whole band when generating states.

---

## Step 3: Repeated list detection

Fingerprint clustering when the content is auto-layout; geometric regularity when it is absolute.

### 3-A. Auto-layout content — two-stage fingerprint

```
sigStrict(n)  = [type, round(h/8),  layoutMode, hasText, sortedUnique(childTypes)]
sigRelaxed(n) = [type, round(h/12), layoutMode, sortedUnique(childTypes excluding iconish)]
```

`iconish(c)` = `|c.w − c.h| ≤ 2 && c.w ≤ 32`

**Why two stages**: with the strict fingerprint alone, row counts were wrong on three screens. One cause —

> **List rows are not identical, and that is normal.** Optional elements are the rule:
> only the selected option has a check icon, only completed rows have strikethrough, only assigned rows carry a chip.

If Stage A coverage is below 0.8, retry with Stage B (icon-ish children excluded). Measured: notification options 0.67 → 1.0 (3 rows, correct), assignee list 0.75 → 1.0 (4 rows, correct).

### 3-B. Absolute content — geometric regularity

```
candidates = nodes in the content band with w ≥ frameW × 0.6, h ≥ 30, not TEXT
sort by y → compute adjacent pitch → median mp
a run continues while ALL hold:
  · |pitch − mp| ≤ mp × 0.3
  · |w − firstRow.w| ≤ firstRow.w × 0.15
  · |h − firstRow.h| ≤ max(firstRow.h × 0.35, 8)
  · mp ≤ max(firstRow.h × 1.6, firstRow.h + 40)     ← rows spaced too far apart are not consecutive
  · no section heading sits between the two rows     ← the decisive condition
```

🔴 **"If a heading interrupts, it is a list of sections, not a list of rows."** That single condition removed the false positive on Spotify's Search screen (three carousels read as three list rows). Geometry alone cannot tell them apart; the semantic boundary is announced by the heading.

**Measured result**: Spotify's Library list was detected as **exactly 7 rows with no auto layout at all** (pitch 86, y 231→800, matching the screenshot). Row heights varied by 18pt (66–84) yet pitch regularity still caught it.

### 3-C. 🔴 Minimum row height 24pt

On Netflix `MyTickets`, two **section heading rows** (`SectionHeadingRow`, h=20) were misread as list rows — the heading was a FRAME, not a TEXT, so it slipped past the text filter.

→ **Anything under 24pt tall is not a list row.** Decide by height, never by name.

### 3-D. 🔴 Coverage is only meaningful inside a list container

| Target | rows | coverage | Truth |
|---|---|---|---|
| List container analyzed directly (authored file) | 9 / 5 / 4 / 3 | **1.0** | all correct |
| Whole content area analyzed (Netflix ShowtimeList) | 3 | **0.43** | **correct (3 rows)** |

Netflix's 0.43 is not an error — the content simply held 4 non-list blocks as well (location bar, date strip, filter pills, freshness row).

→ **Using coverage as list confidence makes you distrust healthy structures.** Compute it only after isolating a list container; across a whole content area, judge by **row count and contiguity**.
The earlier "coverage is always 1.0" observation was also sampling bias — list containers had been passed in directly.

---

## Step 4: Other block classification

Order matters — the first match wins.

| Order | Kind | Condition | Measured |
|---|---|---|---|
| 1 | `DIVIDER` | `h ≤ 2` | ✓ |
| 2 | `TEXT` | `type === 'TEXT'` | ✓ |
| 3 | `SPACER` | no text, no icons, no visible fill | 2/2 |
| 4 | `ACTION` | `40 ≤ h ≤ 60` + exactly 1 text + visible fill + `primaryAxisAlignItems==='CENTER'` | 2/2 |
| 5 | `SEGMENT` | horizontal auto-layout + ≥2 children + **every child `layoutGrow===1`** + height spread ≤ 2pt | 2/2, name-independent |
| 6 | `GRID` | ≥2 nodes in the same y bucket (±16pt) + `w < frameW × 0.6` + `h ≥ 40` | Spotify 2-column grid detected ✓ |
| 7 | `LIST` | passes §3 | Library 7 rows / Netflix 3 rows ✓ |
| 8 | `COMPOSITE` | anything else | |
| — | `UNCLASSIFIED` | matched nothing | **report honestly**. Never force it |

🔴 Skipping the order breaks immediately: in one run the SEGMENT check was omitted and a 5-cell segmented control was reported as a 5-row list.

### Blocks that stayed unclassified (examples of honest reporting)

| Item | Why |
|---|---|
| Spotify Library filter chip row (`Frame 328`, h=60) | horizontal chip group — no dedicated rule yet |
| Spotify Search input field (`Frame 367`, h=62) | standalone block between header and content |
| Spotify Search horizontal carousels (h=138/134/118) | needs one more level of descent to confirm horizontal arrangement |

Reporting these as `UNCLASSIFIED` is better than misclassifying them. Show them in the dry-run and let the user decide.

---

## Step 5: Duplicate overlapping nodes (a constant in production files)

Identical type, position and size stacked on top of each other is common.

```
key = [type, round(x), round(y), round(w), round(h)]
same key twice or more → duplicate
```

| File | Duplicates |
|---|---|
| Spotify Library | 2 (list row frames exactly overlapping) |
| Spotify Search | **7** (the word "Search" ×4, "Home" ×2, "Your Library" ×2 stacked in place) |

🔴 **Never auto-delete duplicates.** They may be intentional (fake shadows, parked state variants). Report only. **But dedupe before counting list rows** — before deduping, Library counted as 9 rows against a truth of 7.

This detection has standalone value: it found 9 issues in production files immediately.

---

## 🔴 Generation method: clone and transform, never rebuild

Verified in the generation experiment.

```
❌ rebuild    stack chrome and blocks into an empty frame from scratch
✅ clone      original.clone() → place on the new page → replace only inside the content area
```

| Advantage of clone-and-transform | Measured |
|---|---|
| **Skeleton parity guaranteed structurally** | spacing, dividers, segment cell structure, chrome all preserved automatically |
| No need to reconstruct chrome | status bar, nav bar (with icons), tab bar (with active color), home indicator — 4/4 intact |
| Skeleton sizes derived from the original | more accurate than the hand-built reference (measured values instead of invented ones) |
| Less code | about one third of the rebuild version |

The original is never touched. All mutation happens on the clone.

---

## Leaf → skeleton conversion

| Original | Skeleton |
|---|---|
| TEXT | width = **rendered glyph width** × 0.8, height = **the node's own height**, radius = sm |
| Icon-ish node | same box size (radius full if circular) |
| Badge | same size, radius = sm |
| Controls / chrome / SPACER / DIVIDER | **keep unchanged** |

### 🔴 Text width is the glyph width, not the node width

A text node stretched by FILL has **the container's width**, far wider than the glyphs. Using node width makes skeleton bars implausibly long.

Because you are working on a clone, you can measure safely:

```js
t.textAutoResize = 'WIDTH_AND_HEIGHT';   // clone only
const realWidth = t.width;               // now the glyph width
```

Measured: all 17 text nodes corrected, and the natural look of a shorter second line appeared **automatically**.

### 🔴 Skeleton height is the node height, not fontSize

A text node's height includes line height (`AUTO` ≈ 1.2×): fontSize 15 renders at 18pt, fontSize 17 at 21pt. Using fontSize shrinks every container by ~3pt per line — measured: a segmented control went 38pt → 35pt, exactly the layout jump the parity rule exists to prevent.

### 🔴 Skeleton color must contrast with its parent background

A `bg-tertiary` skeleton on a `bg-tertiary` background is **invisible**. In the first generation run the segmented control and hint banner skeletons vanished entirely.

```
walk up to 3 ancestors, inspect the bound background variable
  → if it is bg-tertiary / bg-secondary / status-*-bg
  → promote the skeleton one shade darker (border-default family)
```

Measured: 11 elements recovered by this correction.

Color order: `bg-tertiary` variable → (tinted parent) `border-default` variable → in files without variables, the most frequent neutral → otherwise hardcoded gray **and say so in the dry-run**.

---

## 🔴 Instance rows (the main real-world path — dedicated experiment)

Rows as component instances (Netflix `TheaterGroup`, Spotify `Search Link`) are the production standard. A dedicated test screen was built with 5 instance rows carrying text overrides.

### Verified

| Item | Result |
|---|---|
| List detection | 5 identical instances → Stage A, exactly 5 rows |
| **Does `detachInstance()` preserve text overrides** | ✅ **Yes.** Before/after strings identical |
| Nested instances (icon inside the row) | become plain instances after detach and convert normally |
| Effect on the original file | none (detach happens on the clone) |

### Strategy comparison — detach wins

| Strategy | Result |
|---|---|
| **A: detach, then skeletonize internals** | ✅ the row's internal rhythm (icon + 2 lines + badge) survives and reads as a skeleton |
| B: swap the whole row instance for one block | ❌ five large gray slabs; the skeleton is gone and it reads as unfinished |

Netflix's own `SkeletonGroup` is a designed skeleton with internal structure, which matches strategy A.

### 🔴 Status colors must be neutralized

After detaching, the badge kept its green `status-confirmed-bg`, so a **"Confirmed" state was visible during loading** — false information.

```
if the node's OWN fill is a status-* color → replace with a neutral skeleton
```

- 🔴 **Do not inspect descendants.** Including descendants makes the whole row (which contains the badge) match, collapsing it into a single block — it degenerates into strategy B. This happened in testing.
- Order: **detach instances → neutralize status → text → icons.** Checking status before detaching leaves instance internals untouchable.

### ⚠️ Unresolved: detaching changes the height of a HUG container

Detaching an instance row inflates a HUG-sized badge from **23pt to 38pt**. Ten iterations ruled out all of the following:

| Hypothesis tested | Result |
|---|---|
| call `resize` last on the replacement | no effect |
| copy the original's `layoutAlign` / `layoutGrow` | no effect |
| collect all geometry before mutating (two-pass) | no effect — already 38 at collection time |
| path-based geometry snapshot taken before detach | no effect |
| recolor in place without removing the node | no effect → **detach itself is the cause** |
| snapshot and restore sizing modes around detach | 0 restorations needed — sizing modes do not change |

Root cause unknown. Impact is **one class of HUG container, 15pt**; row height, list height and segment height match exactly (319 = 319, 63 × 5, 38 = 38).

→ **Response: do not hide what you do not understand.** Run the parity check after generating and report the mismatch.

---

## State matrix

| Block | Loading | Empty | Error | Offline | Data-heavy |
|---|---|---|---|---|---|
| Chrome (including loose) | keep | keep | keep | keep + banner | keep |
| SEGMENT / chip row | labels → skeleton | keep | keep | keep | keep |
| TEXT | skeleton bar | keep or replace | keep | keep | keep |
| LIST | **same row count**, each row skeletonized | remove list → empty block | keep + error banner on top | keep (stored data) | rows × 2 + one long-text row |
| GRID | cells skeletonized | remove | keep | keep | cells × 2 |
| ACTION | keep (disabled) | keep (promoted to the Empty CTA) | keep | keep | keep |
| Controls | keep | keep | keep | keep | keep |
| OVERLAY (FAB) | **hide** (no action while loading) | 🔴 **hide** (duplicates the Empty CTA) | keep | keep | keep |
| UNCLASSIFIED | **clone as-is and flag for the user** | same | same | same | same |

Confirmed against Netflix `ShowtimeList-Empty`: the list disappears while StatusBar, NavHeader and HomeIndicator stay. Matches this matrix.

### 🔴 Skeleton parity self-check (required after generating)

"Same skeleton as Default" is a measurement, not a declaration. Measure the same landmarks on both and report drift verbatim.

```js
function measure(frame){
  const content = frame.children.find(c => c.layoutGrow === 1);
  const list    = content.children.filter(c=>'children' in c).sort((a,b)=>b.height-a.height)[0];
  const rows    = list.children.filter(c => c.height >= 24);
  return { listH: Math.round(list.height),
           rowH:  rows.map(r => Math.round(r.height)),
           row0:  rows[0].children.map(c => Math.round(c.height)) };
}
```

Measured example (instance-row case):

| Landmark | Original | Output | Verdict |
|---|---|---|---|
| List height | 319 | 319 | ✅ |
| Row heights × 5 | 63 | 63 | ✅ |
| Intra-row (icon / body / badge) | 20 / 39 / **23** | 20 / 39 / **38** | ⚠️ badge +15pt |

🔴 **Report drift as numbers — `parity drift: badge height +15pt`.** Hiding what you do not understand is far worse than not understanding it.

### Empty block placement

Center it **vertically** in the content area. Top-aligned leaves a large void underneath and reads as unfinished.

```js
box.layoutGrow = 1;
box.primaryAxisSizingMode = 'FIXED';
box.primaryAxisAlignItems = 'CENTER';
```

---

## Step 6: Row shape summary (for skeleton construction)

```
rowShape(row) = {
  leading:   first child is icon-ish → 'icon', TEXT → 'text', else 'block'
  textLines: total text nodes in the row
  trailing:  last child has text && h ≤ 30 → 'badge', icon-ish → 'icon', else 'block'
  h:         row height
}
```

⚠️ `textLines` includes text inside a trailing badge. If you draw the badge separately, use **body lines = textLines − (trailing === 'badge' ? 1 : 0)**.

---

## Step 7: Control detection (switches, checkboxes)

Skeletonizing a control looks wrong during loading — its shape carries the meaning. Identify it separately.

```
control(c) = not already matched as an icon
  && ( (44 ≤ w ≤ 60 && 26 ≤ h ≤ 36 && no text)                 // switch (iOS 51×31)
     || (|w−h| ≤ 2 && 18 ≤ w ≤ 30 && no text && no inner icon) )  // checkbox / radio
```

🔴 **The "not already an icon" clause is mandatory.** Without it, icon instances were misread as controls on four screens.

---

## Final measured scorecard

| Item | Authored | Spotify Library | Spotify Search | NF ShowtimeList | NF Loading | NF Empty | NF MyTickets |
|---|---|---|---|---|---|---|---|
| Content area | grow ✓ | geometric ✓ | geometric ✓ | viewport ✓ | ✓ | ✓ | ✓ |
| Chrome | 6/6 | ✓ | **partial** (tab bar over-split) | ✓ | ✓ | ✓ | ✓ |
| List row count | 8/8 | **7/7** | 0 false positives | **3/3** | **3/3** | null ✓ | **false positive** (fixed by the 24pt floor) |
| Grid | — | — | 1 detected | — | — | — | — |
| Duplicates | — | 2 | 7 | — | — | — | — |

**List row counts: 21 attempts → 19 correct, 1 false positive (fixed), 1 not measured.**

---

## Confidence levels and gates

| Level | Condition | Behavior |
|---|---|---|
| `high` | content found via signal 1 or 2 | present the dry-run and proceed |
| `medium` | content found via signal 3 (geometric) | proceed but **state the basis in the dry-run** |
| `low` | overlapping bands, or more than half the blocks unclassified | require user confirmation |
| `none` | no content candidate | **do not run**; ask the user to point at the area |

---

## Unverified (check on the next run)

| Item | Status |
|---|---|
| Full-width background rectangle as a bottom-chrome band separator | derived from observation, **not implemented or measured** |
| Horizontal carousel detection (one more level of descent) | left unclassified on Spotify Search |
| Chip / filter row detection | unclassified on both Spotify and Netflix |
| Nested lists (showtime rows inside Netflix `TheaterGroup`) | only the top-level cluster is returned |
| Search input field detection | unclassified |
| iPad and desktop widths | only 375 and 428pt verified; chrome thresholds likely need recalibration |
| Rows dominated by an image fill | present in Spotify; conversion rule unverified |
| Generation on a fully absolute file | detection verified, generation not yet attempted |
