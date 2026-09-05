# State Screen Copy

> **Basis**: extracted from the real Empty and Loading screens in a Netflix ticketing flow. The patterns below were observed, not invented.
> **Principle**: 🔴 the moment you write a generic sentence (`No data available`), this skill becomes worthless. **Build sentences out of values that are already on the screen.**

---

## Production reference (Netflix `Tickets/ShowtimeList-Empty`)

| Role | Actual copy | Size |
|---|---|---|
| Title | `No showtimes match` | 32pt |
| Body | `Nothing is playing for `**`The Sea Beast`**` on `**`Fri, Aug 7`**` within `**`5mi`**` of `**`Brooklyn, NY 11201`**`.` | 12pt |
| Alternative path title | `In Theaters Now` | 12pt |
| Alternative path body | `The Sea Beast is in cinemas now. Nothing near you is bookable with these settings.` | 12pt |

**The key observation**: all four bold fragments are **values that already exist elsewhere on that screen** — the title (NavHeader), the date (selected DateStrip item), the distance (FilterPillRow "Under 5mi"), the location (LocationBar "Brooklyn, NY 11201").

Loading is one line: `Finding showtimes near you` — **progressive verb + domain noun + context**.

---

## Parameter extraction

Before writing Empty or Error copy, **harvest values from the original screen.**

| Source | How to extract (name-independent) | What you get |
|---|---|---|
| Nav bar text | first text inside the node classified as nav chrome | the screen's subject |
| Selected segment cell | **the cell with a visible fill** (siblings have none) | current filter |
| Caption row | first content TEXT matching a date pattern (`\d+/\d+`) | date, index, unit, count |
| List rows | after list detection, the first text of each row | domain vocabulary |
| Hint banner | 🔴 **a text whose parent has a visible (tinted) fill** | a domain statement |
| Overlay presence | a child with `layoutPositioning === 'ABSOLUTE'` | whether an add action exists |

### 🔴 Picking the hint by length selects the caption instead

Selecting "the longest text" as the hint returned the **caption** (`11/15(Sat) · Day 2 · 5 items`). Row subtitles also pollute the candidate pool.

→ Identify the hint as **a text whose parent has a visible fill (tinted background)**. Measured: of 7 candidates exactly 1 was `tinted: true`, and it was the hint banner.

### 🔴 Never swap a term for a synonym

An early output replaced the screen's own word `parents` with `other family members`. Same meaning, but **now one concept has two words**, which breaks consistency.

Extract the term and inject it:

```js
const stateTerm    = hint.match(/(under review|confirmed|draft|tentative)/i)[1];
const audienceTerm = hint.match(/([A-Za-z가-힣]{2,12})'?s? (?:screen|view)/)[1];
copy = `Jot it down as ${stateTerm} first. It stays hidden from ${audienceTerm}'s view.`;
```

Measured output kept both of the screen's own terms intact.

---

## Templates by state

### Empty

```
title    the absence of {subject} as a short noun phrase (largest type step on the screen)
body     inject {filter/context values} so it says concretely WHY it is empty
action   one thing the user can do next + CTA (reuse the screen's real action label)
```

- The title states a condition, not a negation: `No showtimes match` (good) / `No search results` (weak — carries no value)
- The body must contain **at least one extracted value**. If you could not inject a single one, the sentence has failed
- Without a next action it is not an Empty state, it is a dead end (forbidden)

### Loading

```
one line    {progressive verb} + {domain noun} + {context}
```

- Say **what is happening**, like `Finding showtimes near you`
- `Loading…` carries no information (forbidden)
- Include progress only if you actually know it (no fake percentages)

### Error

```
title       Could not save {screen subject}
cause       plain language; an error code alone is a failure
preserved   🔴 {index} {unit} {count} are still here    ← three parameters combined
branches    Retry + Later/alternative (retry alone is a dead end)
```

🔴 **The preservation line is where this rule pays off.** Measured output:

> `Your internet connection dropped. The 5 Day 2 items you just edited are still here.`

Composed from `dayLabel` + `unitNoun` + `rowCount`. Compare it to `Save failed` — the information the user receives is not remotely the same. This is the one sentence that genuinely reassures, so never drop it.

- If retry is meaningless (permissions, policy), omit the retry button and offer only the alternative
- ⚠️ Do not use an `on-accent` token as the foreground on an error button; that token assumes an `accent-primary` background. If the file has no error-foreground token, use `primitive/white` explicitly and note it in the dry-run (in testing the contrast merely happened to work out)

### Offline / partial load

```
banner   current state + 🔴 as-of timestamp for the data shown
body     say the visible values are stored; skeleton only the region that failed
action   one "Reconnect"
```

- 🔴 **Always state the as-of time.** "You are offline" alone leaves the user unsure whether the numbers on screen are current
- If the original screen already shows a freshness stamp (`Updated 12s ago`), reuse that value verbatim

### Data-heavy

Do not write new copy. Keep the original strings, **double the row count, and make one row exceed 30 characters**. Add only a "show more" label.

---

## Language and register

| Rule | Why |
|---|---|
| Follow the original screen's language | never drop English copy into a Korean screen |
| Follow the original screen's register | match its formality exactly |
| 🔴 Write string literals as UTF-8 | `\uXXXX` escapes create silent typos (`figma-authoring-pitfalls.md` §P0) |
| Reuse the original's terminology | never introduce a new word for an existing concept |

---

## When copy cannot be written

If no parameter could be extracted (an icon-only screen) or the domain vocabulary is too thin:

🔴 **Do not fill the gap with a plausible generic sentence.** Leave a `[copy needed: {state}]` marker and say so in the dry-run report.

Fabricated copy is hard for the user to notice, and once noticed it discredits the entire skill.
