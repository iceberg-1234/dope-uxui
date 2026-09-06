---
name: figma-naming-convention
description: Apply consistent naming conventions to all Figma elements (components, frames, layers, pages). Detects existing project patterns or applies industry standards. Use when asked to "clean up names", "standardize naming", "fix inconsistent names", or "apply naming convention". Violations only — preserves names already following the rules. Requires Figma MCP with edit access.
---

# Naming Convention

Mechanical work that designers skip until it blocks automation. Analyzes existing patterns, proposes a convention, and renames only the violations.

## Non-negotiable rules

1. **Detect before imposing.** If the project has a naming pattern used by 60%+ of elements, apply that. Otherwise use industry standards.
2. **Violations only.** Names already following the detected or standard convention are preserved.
3. **Approval required.** Show the detected pattern, proposed changes, and risk assessment before renaming anything.
4. **Track every mutation.** Return all mutated node IDs. High-risk changes (published components) require explicit confirmation.
5. **No structural changes.** Component variant properties cannot be renamed without changing the variant structure — skip them with a warning.
6. **External libraries untouched.** Skip instances of external components; their main components live in another file.

## Procedure

### 1. READ — pattern detection

Traverse the file and collect names by type: component, component set, frame, group, layer, page.

For each type, detect:
- **Case style**: PascalCase, camelCase, kebab-case, snake_case, Title Case, UPPER_CASE, Mixed
- **Separator**: slash `/`, hyphen `-`, underscore `_`, space, none
- **Affixes**: common prefixes (e.g. `icon-`, `btn-`) and suffixes
- **Hierarchy**: slash-based (`Navigation/Button`) vs flat (`NavigationButton`)

Calculate the dominant pattern per type. If a pattern is used by ≥60% of elements, treat it as the project convention. Otherwise fall back to standard rules.

Flag violations:
- Default Figma names: `Rectangle 123`, `Frame`, `Component 1`
- Copy names: `Button Copy`, `Frame Copy 2`
- Case mismatches: using `snake_case` when the dominant is `PascalCase`
- Mixed styles in one name: `Button_Primary`

→ Algorithm: `references/pattern-detection.md`

### 2. PROPOSE — convention and changes

Report:
- Total elements by type
- Detected patterns and confidence (high ≥80%, medium 60–80%, low <60%)
- Recommended convention (detected or standard)
- Proposed changes: node ID, current name → new name, type, risk level

**Standard rules** (when no dominant pattern exists):

| Type | Convention | Example |
|---|---|---|
| Component | PascalCase | `Button`, `SearchInput`, `NavigationBar` |
| Component Set | PascalCase, singular | `Button` (not `Buttons`) |
| Frame (screen) | PascalCase or Title Case | `LoginScreen`, `User Profile` |
| Frame (container) | camelCase | `headerContainer`, `contentWrapper` |
| Layer (icon) | kebab-case + `icon-` prefix | `icon-search`, `icon-close` |
| Layer (shape) | kebab-case + type suffix | `background-rect`, `divider-line` |
| Layer (text) | semantic or content | `Title`, `Body Text`, `"Welcome"` |
| Page | Title Case | `Design System`, `Mobile Screens` |
| Style | slash hierarchy | `color/primary/red`, `text/heading/large` |

**Risk assessment**:
- **High**: Published components (may affect other files), component sets
- **Medium**: Significant name change (similarity <50%), instances of external components
- **Low**: Everything else

→ Rules: `references/naming-rules.md`

### 3. APPROVE — scope selection

User can:
- Apply all
- Apply specific types only (e.g. components + frames)
- Apply specific pages only
- Exclude individual items
- Adjust the convention and re-propose

High-risk changes require explicit confirmation. List them separately with their risk reasons.

### 4. APPLY — batch rename

Rename in batches of 50 to avoid rate limits. For each change:
1. Verify the node exists
2. Confirm the current name matches the expected old name
3. Skip if locked
4. Rename and record the mutated node ID

Skip with warning:
- Component variants (property-driven names)
- External library main components
- Nodes whose names changed since analysis

Return:
- Applied: node ID, old name, new name, type
- Skipped: node ID, reason
- Failed: node ID, error

→ Protocol: `references/safe-rename.md`

### 5. VERIFY — confirm changes

Re-query renamed nodes to confirm:
- Name matches the proposed new name
- Node still exists
- No unintended side effects

Report:
- Total verified
- Successful
- Failed (with node IDs and actual names)
- Remaining violations (if any)

## Reference documents

- [Naming Convention Rules](references/naming-rules.md) — detailed rules per element type
- [Pattern Detection](references/pattern-detection.md) — detection algorithm
- [Safe Rename Protocol](references/safe-rename.md) — batch processing, rollback, error handling

## Constraints

### Will not rename

- Component variant properties (requires structural change)
- External library components
- User-excluded items
- Names already following the convention

### Cannot rename

- Files without edit access
- Published components (without user confirmation)
- Locked nodes

### Warnings

- **Code Connect impact**: Renaming components may break Code Connect mappings
- **Design token impact**: Renaming styles may affect token extraction scripts
- **Collaboration**: Confirm with team before renaming in active files

## Success criteria

- [ ] All elements follow a consistent naming convention
- [ ] Violations reduced to zero or justified exceptions only
- [ ] File structure and visual elements unchanged
- [ ] All mutated node IDs returned
- [ ] User understands and approved the changes

## Related skills

- `figma-state-frames`: Apply naming convention to generated state frames
- `figma-design-audit`: Include naming convention compliance in audit checks
