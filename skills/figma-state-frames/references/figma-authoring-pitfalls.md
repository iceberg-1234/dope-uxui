# Figma Authoring Pitfalls

> **Status**: every entry below comes from a **failure that actually occurred** while authoring Figma files through the Plugin API. Nothing here is speculative.
> **Read before**: your first `use_figma` call. Skipping this document means repeating these failures.

---

## 🔴 P0. Write strings as UTF-8 literals — never `\uXXXX` escapes

**The most expensive failure in this project.** Writing Korean copy as `\uXXXX` escapes produced **38 typos in on-screen text plus 3 in frame names**, all caught only at final review.

| Forbidden | Required |
|---|---|
| `t.characters = '\uc0c1\ubc84\uc57d'` | `t.characters = '상비약'` |
| Hand-computing code points | Pasting the characters directly |

**Why**: escape conversion is manual, character by character, so **typos pass silently**. Rendering looks perfect, screenshots reveal nothing, and only a human reading the text finds them. Non-Latin scripts (Korean, Japanese, Chinese, Arabic) are especially exposed.

🔴 **The scope is every string, not just screen copy.** In a later session an escape inside a **warning message** produced another typo, which was reported directly to the user because non-screen strings were outside the review pass. In scope: screen text, report and warning and log strings, layer and frame names, and **the replacement strings inside find-and-replace scripts**.

**Extra defense**: dump every text node and read the list before declaring the work done (see §T1).

---

## 🔴 P1. `layoutSizingHorizontal='FILL'` only works **after** append

```js
// ❌ fails: "FILL can only be set on children of auto-layout frames"
const block = vstack(12);
block.layoutSizingHorizontal = 'FILL';   // no parent yet
parent.appendChild(block);

// ✅ works
parent.appendChild(block);
block.layoutSizingHorizontal = 'FILL';
```

**Required helper** — define this and never call `appendChild` directly:

```js
function addF(parent, child){
  parent.appendChild(child);
  try { child.layoutSizingHorizontal = 'FILL'; } catch(e) {}
  return child;
}
```

---

## 🔴 P2. Forget to FILL a wrapper and content is clipped to the default 100pt

**All 13 screens in one build were assembled clipped.** The cause: a screen's content wrapper (`screen/body`) was `counterAxisSizingMode='FIXED'` and never received a width, so it stayed at Figma's **default frame width of 100pt**.

| Symptom | Cause |
|---|---|
| Cards and lists crowded into the left quarter | wrapper width is 100pt |
| Text wrapping one character per line | same |

**Rule**: every direct child of a screen frame (nav bar, body, tab bar, safe areas) and every block child of the body must be FILL. Verify right after assembly:

```js
for (const child of frame.children) {
  if (child.layoutPositioning === 'ABSOLUTE') continue;
  child.layoutSizingHorizontal = 'FILL';
}
```

---

## 🔴 P3. Binding a large surface to a **mode-invariant primitive** kills dark mode

This produced a **blocker-level defect**. A cleanup pass that rebound hardcoded white fills to variables also bound content wrappers to `primitive/white` (identical in both modes), so dark mode rendered **white text on a white background** — completely unreadable.

| Target | Bind to |
|---|---|
| Screen backgrounds, cards, sheets, nav/tab bars — **surfaces** (width ≥ 150) | **semantic/bg-\*** (mode-aware) |
| Text and icons | **semantic/text-\*** / **semantic/status-\*** |
| Switch knobs, checkmarks on accent, avatar rings — **always white in every mode** | `primitive/white` is fine |

**Rules**:
1. When running a bulk color script, **branch on node size and role**. Never map by value ("if it is white, bind to primitive/white").
2. 🔴 **After changing color bindings, render dark mode and look at it** (see §T2).

---

## 🔴 P4. Plugin API name and type traps (calls that actually failed)

| ❌ Failing call | Error | ✅ Correct |
|---|---|---|
| `figma.variableCollections.create(name)` | `no such property 'variableCollections'` | `figma.variables.createVariableCollection(name)` |
| `combineAsVariants([autoLayoutFrame, ...])` | `COMPONENT_SET cannot have children of type other than COMPONENT` | convert each variant with `figma.createComponentFromNode(frame)` first |
| `v.scopes = ['ALL_FILLS','STROKE_COLOR']` | `If ALL_FILLS is set, other fill scopes cannot be set` | use `ALL_FILLS` alone, or narrow to `['FRAME_FILL','SHAPE_FILL']` / `['TEXT_FILL']` |
| `frame.width = 900` | `read-only property on FRAME node` | `frame.resize(900, frame.height)` |
| `rect.appendChild(child)` | `no such property 'appendChild' on RECTANGLE` | RECTANGLE / ELLIPSE / VECTOR are not containers. To overlap, put the child in an auto-layout parent with `layoutPositioning='ABSOLUTE'` plus x/y |
| `if (rect.appendChild) {...}` | **the access itself throws** | never truthy-check for a property; branch on `node.type` |
| `layoutSizingVertical = 'AUTO'` | invalid enum | children take `'FIXED' \| 'HUG' \| 'FILL'`; the frame itself takes `primaryAxisSizingMode='FIXED' \| 'AUTO'` |
| `node.layoutSizingHorizontal = undefined` | `Required value missing` | "leave unset" cannot be expressed by assigning undefined — omit the call or wrap it in try/catch |
| Using a text node's `width` as the glyph width | **no error, wrong value** | a FILL text node's width is the container width. Set `textAutoResize='WIDTH_AND_HEIGHT'`, then read `width` (on a clone, never the original) |
| Removing or replacing a child of an INSTANCE | instance structure is immutable | `detachInstance()` on the clone, then transform. **Never detach in the original** |
| `text.fontName = {...}` without loading | `Cannot write to node with unloaded font` | `await figma.loadFontAsync({family, style})` first. When editing existing text, load **its current fonts** via `getRangeAllFontNames` |
| Inter weight `'SemiBold'` | font not found | `'Semi Bold'` (with the space), `'Extra Bold'` |

---

## 🔴 P5. Never ship placeholder icons — generate real vectors from SVG

One build replaced icons with "circle outline plus a character" and reported it as `unresolved (tool limitation)`. **It was not a tool limitation.** `figma.createNodeFromSvg()` produces real vector icons; 16 of them were generated in minutes on the next pass.

```js
const svg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
          + '<path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5.5v-6.5h-5V21H4a1 1 0 0 1-1-1z"'
          + ' stroke="#1D1D1F" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const node = figma.createNodeFromSvg(svg);
node.name = 'icon/home';
// bind colors to variables (strip the hardcoded hex)
for (const ch of node.findAll(()=>true)) {
  if ('strokes' in ch && ch.strokes.length) ch.strokes = ch.strokes.map(s =>
    s.type==='SOLID' ? figma.variables.setBoundVariableForPaint(s,'color', textPrimaryVar) : s);
  if ('fills' in ch && ch.fills.length) ch.fills = ch.fills.map(f =>
    f.type==='SOLID' ? figma.variables.setBoundVariableForPaint(f,'color', textPrimaryVar) : f);
}
const comp = figma.createComponentFromNode(node);
```

**Follow-ups**:
- Clear any opaque fill left on the icon root (`node.fills = []`).
- **Normalize icon `strokeWeight` by role**: line work 1.8, bold glyphs (chevron, plus, check) 2.2. Leaving the SVG source values produces a 1.7 / 2.0 / 2.2 mix and 250 stroke-consistency violations.
- Resize icon instances per use with `resize(size, size)`.

---

## 🔴 P6. Override the text inside instances or the screen says nothing

Master demo text (`Button`, `Segment 1`, `Placeholder`) left on a screen still renders, but **the screen's purpose does not come across** — the usual cause of failing a 3-second comprehension test.

```js
for (const t of frame.findAllWithCriteria({types:['TEXT']})) {
  if (t.characters === 'Segment 1') t.characters = 'Day 1';
}
```

**Rule**: before finishing, confirm zero occurrences of `Button` / `Placeholder` / `Segment n` / `Lorem`.

---

## 🔴 P7. Page context and coordinates

- Page context **resets between `use_figma` calls**. Start each call with `await figma.setCurrentPageAsync(page)`.
- Nodes appended to a page without coordinates stack at (0,0). Lay screens out on a grid:
  ```js
  frames.forEach((f,i)=>{ f.x = (i%6)*(390+40); f.y = Math.floor(i/6)*(844+90); });
  ```
- Temporary nodes left parented to the page appear as ghosts in screenshots. When done, check `page.children.filter(c=>c.type!=='FRAME')` and clean up (this happened once).

---

## Self-verification routines (required before declaring done)

### T1. Dump and read every string

```js
const set = new Set();
for (const t of page.findAllWithCriteria({types:['TEXT']})) set.add(t.characters);
return { count: set.size, texts: Array.from(set) };
```

Read the returned list **the way a human reads prose**:
- [ ] Zero typos or mangled characters (especially non-Latin)
- [ ] Zero `Button` / `Placeholder` / `Segment n` / `Lorem`
- [ ] Frame names reviewed too (`page.children.map(f=>f.name)`)

### T2. Dark mode render check

```js
const collection = await figma.variables.getVariableCollectionByIdAsync(colorCollectionId);
for (const f of targetFrames) f.setExplicitVariableModeForCollection(collection, darkModeId);
// → get_screenshot, review, then restore light mode
```

- [ ] Background is in the `#1C1C1E` family (not pure black)
- [ ] Text and icons separate from the background
- [ ] Badges and status colors remain legible on dark surfaces

### T3. Per-screen screenshot review

- [ ] Render every screen at least once with `get_screenshot` and **look at it**
- [ ] Content fills the width (no §P2 symptom)
- [ ] The lower half is not entirely empty (a sign of insufficient data volume)
- [ ] No overlap, clipping or ghost nodes

### T4. Node property scan

Collect `fontSize` / `cornerRadius` / `strokeWeight` / `itemSpacing` and paddings / unbound fills / default layer names, and compare against your token and boundary sets. **Catching these while authoring is far cheaper than catching them in review.**

---

## Never

- ❌ Write non-Latin text as `\uXXXX`
- ❌ Set `layoutSizing*` before `appendChild`
- ❌ Leave a content wrapper without FILL (100pt clipping)
- ❌ Bind surface colors to mode-invariant primitives
- ❌ Skip the **dark mode render check** after changing color bindings
- ❌ Ship placeholder icons and call it a tool limitation
- ❌ Leave component demo text (`Button`, `Placeholder`) on a screen
- ❌ Declare the work done **without ever looking at a screenshot**
