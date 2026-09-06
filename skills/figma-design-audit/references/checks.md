# Audit Checks

## Evidence model and collection

Status applies to one check on one node, range or pair:

| Status | Meaning |
|---|---|
| PASS | Sufficient evidence meets the explicitly named criterion or policy |
| FAIL | Sufficient evidence violates it and applicable exceptions have been checked |
| REVIEW | Heuristic concern, ambiguous semantics, or recommendation needing a decision |
| UNVERIFIED | Required property, unit mapping, rendering or dependency is unavailable |
| NOT_APPLICABLE | A documented exception or out-of-scope condition applies |

Use `high`, `medium`, `low` priority separately from status: blocked reading or operation is high; a localized standards issue is medium; token hygiene and duplicate candidates are usually low. Priority is not a claim of WCAG level. No invented score or pass percentage.

For each selected root, retain its ID, containing page, dimensions, actual mode and collection IDs, and source of platform/unit mapping. Never equate screenshot raster pixels, CSS px, iOS pt, Android dp/sp or Figma design units without evidence. Unknown mapping means conditional measurements, not a standards verdict.

Read existing nodes by ID, branching by node type before accessing type-specific properties. Keep instance trees intact. Inspect:

- Geometry, transforms, visibility, opacity, clipping, masks and paint order of relevant ancestors and intersecting layers.
- Visible fills/strokes, their paint types, alpha, blend modes, effects, style IDs and bound variable IDs.
- Text runs using `getStyledTextSegments` for supported fields and range getters for missing ones. Preserve `start`/`end`, size, numeric weight, fills and style bindings. `figma.mixed` is not a number or an empty binding.
- Interaction evidence from existing component semantics, prototype reactions, links or a supplied specification; names alone are hints.
- Existing variables and collections by ID, their types, modes, aliases and explicit/inherited consumer modes. Do not import a missing library dependency.

Track each check's unit: text ranges, meaningful graphics, targets, paint slots, token pairs or duplicate groups. A node can participate in multiple checks without making those counts interchangeable. Record eligible, assessed, review, unverified and excluded counts. Unknown totals remain unknown.

Effectively hidden ancestors exclude their descendants from visible checks. Zero-opacity decorative paint is excluded; an invisible but documented hit-area wrapper can still define an interactive target. Partially clipped, rotated, masked or occluded content needs actual visible/hit geometry; a bounding box alone does not prove it.

## C1. Text contrast

**Standard:** WCAG 2.2 SC 1.4.3 (AA).

- Normal text: at least **4.5:1**.
- Large text: at least **3:1**, when the rendered size is at least **24 CSS px**, or at least **14 × 96 / 72 CSS px (18.666… px) with bold weight**. Use known font weight (700 or higher for the helper); do not assume Semi Bold is bold. Unknown weight does not qualify a smaller run for the relaxed threshold.
- If weight is unknown for text between 18.666… and 24 CSS px, the helper's 4.5 threshold is conservative, not proof that a ratio between 3 and 4.5 fails the standard. Such a result is `UNVERIFIED` until weight is known; at least 4.5 meets either threshold, and below 3 fails either threshold when no exception applies.
- Evaluate mixed-style text per range. A large heading does not exempt its smaller caption.
- Confirm exceptions for inactive controls, decoration, invisible text and logotypes. Placeholder text is not exempt merely because it is a placeholder. An exception suggested only by a layer name needs review.
- Missing size mapping: report the measured ratio against both thresholds conditionally, leaving the standards verdict unverified. This is not a full WCAG conformance test.

### Establish the rendered color pair first

Do not choose the nearest ancestor fill blindly. A surface must cover the text's rendered region and actually be behind it. Include same-node paint order, ancestor fills, underlying siblings and overlays where relevant. An empty frame fill is not white; the editor canvas is not necessarily the product background.

The numeric helper is intentionally limited to **sRGB, solid paints, normal compositing, a known opaque backing surface, and uniform color behind the text range**. Convert normalized sRGB channels only with a verified color-space mapping. Non-sRGB/P3 data without a conversion is unverified.

For supported stacks, composite translucent solid background paints bottom-to-top against that backing surface, then composite the foreground onto the resulting background. Paint opacity and node opacity can be combined for a single isolated paint. Group opacity is applied to the already-composited group; do not multiply it into every child's alpha. If that group composition cannot be established, stop with `UNVERIFIED`.

For gradients, images, masks, blend effects, overlapping text surfaces, uncertain glyph regions or unknown ancestor compositing, report `UNVERIFIED` and the missing evidence. Screenshot sampling may inform visual review, but is not exact numeric contrast: antialiasing and scaling distort the colors. Do not pick a favorable gradient stop or average color to declare a pass.

### Calculation

For each normalized sRGB channel `c`, linearize as `c / 12.92` when `c <= 0.04045`, otherwise `((c + 0.055) / 1.055) ** 2.4`.

Relative luminance is `0.2126 R + 0.7152 G + 0.0722 B`; contrast is `(lighter + 0.05) / (darker + 0.05)`. Compare the **unrounded** result. A displayed 4.50 from an actual 4.499 is a failure of the 4.5 threshold. Report additional decimals near the boundary.

Evidence: text node and range, foreground/background node or paint IDs, resolved RGB values, alpha/compositing assumptions, color space, mode, CSS size/weight mapping, raw ratio and threshold.

## C2. Non-text contrast

**Standard:** WCAG 2.2 SC 1.4.11 (AA), **3:1** for visual information needed to identify controls, their states, or meaningful graphics against adjacent colors.

Use the C1 rendering constraints. First establish the visual cue's role: a decorative divider, shadow or button border is not automatically required to meet 3:1. If visible text or an icon already identifies the control, its container border may not be required. Check state indicators and relevant adjacent surfaces, not arbitrary colors from different screens. Inactive controls and applicable essential-presentation exceptions need evidence. Ambiguous necessity is `REVIEW`.

Evidence: cue ID, semantic role and source, adjacent paint IDs and values, mode, ratio, applicable exception decision.

## T1. Pointer/touch targets

**Project recommendation:** offer 44 × 44 design units when no policy was supplied; label it provisional, not WCAG AA. For iOS or Android, use the user's documented platform guideline and mapping instead of treating all units as CSS px.

**Web standard:** WCAG 2.2 SC 2.5.8 (AA) requires a target containing a 24 × 24 CSS-pixel axis-aligned square, subject to spacing, equivalent-control, inline, user-agent-control and essential-presentation exceptions. The 44 × 44 CSS-pixel enhanced criterion is SC 2.5.5 (AAA), with its own exceptions; do not substitute it for AA.

1. Identify a real interactive target from component semantics, reaction, link or spec. An icon name alone produces a candidate, not a confirmed target.
2. Measure the documented hit wrapper, not just its icon. A 20-unit icon inside a verified 48-unit target is not an undersized target. Do not promote any large ancestor to a hit area without evidence.
3. Preserve transformed/clipped geometry and overlaps. Axis-aligned bounding width/height is only a preliminary screen; rounded or rotated shapes might not contain the required square.
4. For an undersized web target, check the spacing exception: center a diameter-24 CSS-pixel circle on its bounding box. It must not intersect another target or the corresponding circle of another undersized target. No intersection means no interior overlap; tangency alone does not count as overlap. Assess the other exceptions too. If runtime semantics, neighboring targets or exceptions cannot be established, mark `REVIEW`/`UNVERIFIED`, not confirmed AA failure.
5. A design can expose a likely small hit area but cannot prove the implementation has no expanded hit slop. Label design geometry findings accordingly.

Evidence: interactive wrapper ID, identifying evidence, icon ID if applicable, dimensions and units, mapping, clipping/shape caveats, policy or SC, exception results and missing runtime evidence.

## T2. Minimum text size

**Project policy, not a universal WCAG minimum.** WCAG does not prescribe a single minimum font size for all text.

Use an explicit project type scale/minimum and platform units when available. Compare each visible text run against its role-specific minimum. Without a policy, report the observed size inventory and small-text review candidates without inventing a failing cutoff. Figma font size alone does not establish runtime scaling, reflow or Dynamic Type support.

Evidence: node/range, measured size, text role, policy source and threshold. Missing fonts or mixed runs that cannot be resolved are unverified.

## D1. Color-token bindings

**Design-system hygiene, not an accessibility failure.** Review visible fill and stroke slots and text-run paint bindings. Include relevant styles, not only node-level variable bindings.

Classify each eligible paint slot as variable-bound, style-backed, literal, or unresolved. A style-backed paint is not an unbound-color defect simply because its node has no direct variable binding. Inspect existing styles for internal bindings when available; otherwise keep that dependency unresolved. Exclude non-color image content from the solid-color binding denominator.

Report literals as `REVIEW` unless an explicit project policy prohibits them. Suggest only existing compatible semantic tokens with verified purpose and mode behavior. Equal RGB values alone do not establish interchangeable roles. Never rebind, import or create variables during this check.

Evidence: node/range and paint slot, raw/resolved value, style and variable IDs, actual classification, policy, suggested token ID if verified.

## D2. Light/dark token pairs

**Token-level check, not a rendered theme guarantee.** Read existing consumer mode resolution and `valuesByMode`. `resolveForConsumer` resolves the consumer's current modes, not any arbitrarily requested mode.

1. Get the intended light and dark mode IDs for every relevant collection from explicit project mapping. Mode labels are hints; modes can represent density, locale or brand rather than theme. Missing mapping is unverified.
2. Resolve aliases recursively in memory with a visited set of `(variable ID, mode ID)` pairs. Modes are collection-local: never reuse a mode ID from another collection. For cross-collection aliases use that collection's mapped mode; a documented mode-invariant/default-only collection can use its established default. Missing IDs, cycles, inaccessible remote dependencies and unsupported extended-collection inheritance are unverified.
3. Compare semantic foreground/background pairs from real consumer relationships, not a Cartesian product of all tokens. Apply C1/C2 thresholds only when role and rendered-size mapping are known. Reuse their alpha/background constraints.
4. Identical values across modes are not automatically wrong; fixed logo colors and primitives may be intentional. A semantic surface becoming indistinguishable from its text is meaningful evidence. Report the numeric pair, not a blanket rule against invariant tokens.
5. If an existing dark-mode frame is available in scope, inspect it independently. Otherwise report `token-only; dark render unverified`. Never toggle the original's modes or create a throwaway clone to render another theme.

Evidence: consumer IDs, semantic pair, collection/mode IDs for each theme, full alias chain, resolved values, ratios, mapping source and whether a real dark render was inspected.

## D3. Overlapping duplicate candidates

**Heuristic; unverified on production files.** Intended repeated rows, same-name layers and repeated instances at different positions are not duplicates.

Deduplicate traversal by node ID first. For accidental-overlay candidates, compare different sibling IDs in the same parent with matching type, transform, bounds, visible paint/effects, bindings, text/runs and relevant children or component identity/overrides. Begin with exact matches; a tolerance or reduced signature is a disclosed heuristic, never proof. Use geometry buckets before comparing candidates to avoid all-pairs work on the whole file.

- Parent-child overlap is normal containment, not a duplicate pair.
- Same bounds but different text, strokes, opacity, mode, bindings or interaction is not an exact duplicate.
- Boolean/mask composition, focus overlays, intentional stacking and layered shadows need review, not deletion.
- Incomplete subtree/override data means an unverified candidate, not a confirmed duplicate.

Return `REVIEW` groups containing the IDs, signature fields, count and reason for suspicion. No node is hidden or removed. Count a group of three coincident nodes as one candidate group containing three IDs, not three separate defects.

## Sources and validation boundaries

Standards-backed thresholds:

- [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [WCAG 2.2 SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

API references:

- [Figma TextNode](https://developers.figma.com/docs/plugins/api/TextNode/)
- [Figma Variable](https://developers.figma.com/docs/plugins/api/Variable/)

Only the pure sRGB arithmetic and threshold helper is regression-tested locally. Background reconstruction, target inference, collection mapping and duplicate detection are procedural guidance, not a tested automatic detector. Record real-file evidence before promoting a heuristic to a reliable rule.
