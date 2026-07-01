# React Rewrite Maintainability Review

Date: 2026-06-30

This is a friendly review of the current React rewrite direction for the FSWEPP2 tools, especially RockCliMe and ERMiT. The goal is not to argue against React. React can absolutely be a good long-term direction for these tools if the rewrite gives us clearer boundaries, less duplicated logic, stronger tests, and easier future changes.

The concern is narrower: the current React rewrite is not yet demonstrably more maintainable than the existing JSX/native implementation. Before moving ERMiT, Disturbed WEPP, WEPP:Road, and FUME onto the React path, the React version needs to reach functional parity and show that it reduces maintenance risk rather than moving it around.

## Current Assessment

The existing JSX/native implementation is already complete enough to run the production workflows, and recent changes have been small, targeted, and testable. The React rewrite has a better component model in principle, but right now it is still incomplete and has several state-management issues that would make maintenance harder.

The biggest risk is that the React implementation has multiple sources of truth for the same climate state. For example, climate data is represented in camelCase in `ClimateState` (`cligenVersion`, `parId`, `usePrism`), but some update paths write snake_case keys (`cligen_version`, `par_id`, `use_prism`) into the same state flow. That can silently drop updates or persist stale/default values. This kind of mismatch is easy to miss in manual testing and hard to debug later.

ERMiT also does not appear to have full feature parity yet. It builds and submits a run payload, but it does not yet provide the complete result rendering and workflow behavior present in the current implementation.

RockCliMe is also split between older page-level `.jsx` files and newer shared React/TypeScript components. That makes it harder to know which implementation is canonical and increases the chance of fixing a bug in one place while another path keeps the old behavior.

## What Looks Promising

There are useful pieces in the React rewrite:

- Shared components for soil properties, vegetation/burn severity, hillslope geometry, and simulation options could reduce duplication across ERMiT, Disturbed WEPP, WEPP:Road, and FUME.
- `react-hook-form` and schema validation can be a good fit if each tool has a clear canonical state model.
- A shared RockCliMe control could be better than each tool owning its own climate widgets, provided it has one state contract and parity tests.
- Typed API payload builders would be a real maintainability win if they replace ad hoc payload construction.

Those are good directions. The rewrite just needs stronger boundaries before it becomes the easier codebase to maintain.

## Requirements Before the React Rewrite Is More Maintainable

The React rewrite should meet these requirements before we treat it as the preferred implementation path.

### 1. One Canonical Climate State Shape

Pick one internal shape for climate state and enforce it everywhere. Prefer camelCase inside React and convert to snake_case only at API/cookie boundaries.

Required:

- No component should write `cligen_version`, `par_id`, `input_years`, `use_prism`, or `user_defined_par_mod` into React state.
- All cookie reads/writes should go through one climate utility.
- All API payload conversion should happen in one place.
- The React climate state should preserve the same behavior as `ui/public/js/core/rockclim-state.js`.
- Custom climate data must always disable PRISM.

### 2. One Source of Truth Per Tool

Avoid duplicating the same values in local component state, form state, cookie state, and map state unless there is a clear reason.

Required:

- Each tool should have one canonical tool state object.
- Derived UI state should be computed from canonical state, not persisted separately.
- React effects should not independently write partial climate state unless they are part of a controlled reducer/update function.
- Station changes, location changes, PRISM toggles, and custom climate import/delete should flow through one update path.

### 3. Complete Feature Parity Before Replacing a Tool

No tool should be considered migrated until it matches the current working implementation.

Required for each migrated tool:

- All current inputs exist and have matching defaults.
- All validation behavior is equivalent.
- Run payloads match the API contract.
- Result tables/charts/downloads/log views match the current workflow.
- Climate file and station PAR file behavior match the current workflow.
- Error/loading/empty states are implemented.
- Existing edge cases are covered, including PRISM without location, custom climate with PRISM enabled, invalid imports, and unit changes.

### 4. API Payload Builders With Tests

Each tool should have a small, typed payload builder that can be tested without rendering React.

Required:

- `buildErmitPayload(state)` or equivalent.
- `buildDisturbedPayload(state)` or equivalent.
- `buildWeppRoadPayload(state)` or equivalent.
- `buildFumePayload(state)` or equivalent.
- Tests proving payload compatibility with representative current UI/API payloads.

This is one of the clearest ways React can become more maintainable: UI components should gather state, but pure functions should build API requests.

### 5. Unit Handling Must Be Centralized

The current project guidance is to keep canonical metric values in state/requests and convert only for display. The React rewrite should follow that same rule.

Required:

- State and API requests store canonical metric values.
- Inputs either use Unitizer consistently or use a single React-native unit conversion layer.
- Do not mix `UnitsContext`, `use-units`, local conversion helpers, localStorage events, and Unitizer attributes without a clear owner.
- Result tables put units in headers and keep cell values unitless.
- Unit preference changes re-render displayed values without mutating canonical state.

### 6. RockCliMe Must Be One Implementation

RockCliMe should not exist as both page-level `.jsx` workflows and separate shared TSX settings components indefinitely.

Required:

- Identify the canonical RockCliMe implementation.
- Remove or quarantine old/dead RockCliMe pages once parity exists.
- Keep shared climate controls in one component tree.
- Do not duplicate station lookup, PRISM behavior, import/export, or custom climate logic.

### 7. Results Rendering Is Part of the Migration

Submitting a model run is not enough. The output workflow is part of the tool.

Required:

- ERMiT must render probability/annual results at parity with the current implementation.
- Disturbed WEPP, WEPP:Road, and FUME must render their specific result tables and summaries.
- Downloads should use the same filenames and content behavior as current UI.
- Unit preferences must apply to result tables.

### 8. Tests Must Protect the Migration

The React rewrite should add tests that make future maintenance easier, not just tests that components mount.

Required:

- Climate state normalization tests.
- JSON climate import tests.
- PRISM toggle/custom climate interaction tests.
- Station/location change tests.
- API payload builder tests.
- Result rendering tests for representative API responses.
- At least one end-to-end smoke test per migrated tool.

### 9. Remove Debug Logging and Commented-Out Workflows

Debug logs and commented-out implementation paths make it harder to tell what is intentional.

Required:

- Remove routine `console.log`/`console.debug` statements before considering a tool complete.
- Remove commented-out implementation blocks or convert them into tracked TODO issues.
- Keep comments only where they explain non-obvious domain behavior.

### 10. Migration Should Be Incremental and Reversible

React migration should proceed one tool at a time, with clear acceptance criteria.

Required:

- Pick one tool as the pilot, preferably ERMiT or RockCliMe.
- Finish it fully before moving the remaining tools.
- Keep the current implementation available until the React version passes parity.
- Do not migrate Disturbed WEPP, WEPP:Road, or FUME until the pilot proves the architecture.

## Suggested Acceptance Checklist

A React tool is ready to replace the current implementation only when all of these are true:

- The tool can complete the same user workflows as the current UI.
- The tool produces equivalent API payloads for representative cases.
- The tool renders equivalent outputs for representative API responses.
- Climate state behavior matches current RockClim behavior.
- Unit behavior matches project guidance.
- Focused unit tests pass.
- E2E smoke test passes.
- There is no duplicate implementation path for the same workflow.
- The code has fewer places to update for common changes than the current implementation.

## Recommendation

Keep the React rewrite as a possible future direction, but do not treat it as the default migration path yet. The next useful milestone is not "more components" or "more tools in React." The next useful milestone is one fully migrated tool that proves the architecture is simpler to maintain than the current JSX/native implementation.

Once one tool reaches parity with a clean state model, tested payload builders, centralized unit handling, and complete result rendering, then the maintainability argument becomes much stronger. Until then, the safer path is to continue maintaining the working implementation and use the React rewrite as an experimental branch toward a clearer architecture.
