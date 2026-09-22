# AI Usage

## Tool
**Claude Code** (Anthropic CLI) — model: `claude-sonnet-4-6`

---

## How I Used It

I used Claude Code as a pair programming assistant within a plan-first workflow: diagnose and architect first, then execute. The throughline: I owned the engineering decisions — Claude implemented them.

### 1. Bug Fix: Duplicate FHIR API Calls

I diagnosed the root cause before touching any code: React 18 StrictMode intentionally mounts → unmounts → remounts components in development. The existing `useEffect` called three separate async functions with no cleanup, so both the original and remounted effect would race to update state, producing doubled FHIR calls in the logs.

I used Claude Code's plan mode to specify the fix — consolidating the three fetch functions into a single inline `async` effect with a `cancelled` flag, the idiomatic React pattern for this class of bug — then executed the plan directly against the file.

### 2. Patient Detail Page UI

I drafted a full implementation plan in Claude Code's plan mode covering layout, component hierarchy, data sources, and design patterns before any code was written. This kept the output scoped and accurate on the first pass.

### 3. Design Iteration

Rather than describing UI changes in prose, I provided a screenshot and used a structured audit prompt before allowing any edits:

```
Pause before coding. Audit the current implementation against the design screenshot
and enumerate all discrepancies across layout, content fields, type hierarchy, and
spacing. I'll confirm which to fix.
```

This surfaced several issues I then directed Claude to fix:
- Removed fields not present in the design (phone, email, address from the Demographics card)
- Corrected the page header — removed the patient name h1, moved the Active badge to the far right
- Fixed the Demographics card to show Age as the primary value with gender + blood type as a single subtitle line
- Fixed an inverted type hierarchy: Claude had assigned `text-lg font-bold` to section headings and `text-sm font-semibold` to card primary values — I caught this and directed the correction
- Corrected the wrong icon on the Care Team card
- Tuned spacing throughout to match the design (card header padding, Medical History internal spacing)

---

## Engineering Decisions I Made

- Identified the StrictMode root cause and chose the `cancelled` flag pattern specifically
- Interpreted the design screenshot and determined which fields belonged on the page
- Caught the type hierarchy inversion Claude introduced
- Approved or rejected each change before it was applied
