# Testing Strategy

Patchwork testing is organized around user-visible behavior and data integrity.

## Unit tests

Use unit tests for pure validation, transformations, scoring, and utility functions. These should remain fast and deterministic.

## Integration tests

Integration tests should cover database constraints, authorization boundaries, Server Actions/API behavior, and optimistic-update failure paths.

## UI checks

Important flows should verify keyboard accessibility, responsive layouts, loading states, empty states, and recoverable error states.

## Regression rule

Every fixed bug should ideally gain a regression test at the lowest useful layer. Prefer a focused test over a large end-to-end test when the failure is isolated.

Before release, run the complete test suite plus a production build.
