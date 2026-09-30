# Patchwork Architecture

Patchwork separates the presentation layer from project state and persistence.

## Main layers

- UI — dashboards, boards, forms, and responsive views.
- Application actions — validation, authorization, optimistic updates, and business rules.
- Persistence — PostgreSQL/Supabase data access and transactional boundaries.
- CLI — project scaffolding and local setup.

## Mutation flow

A typical task mutation should validate input at the request boundary, check access to the project, perform the database mutation inside the appropriate transaction, return a typed result, and reconcile optimistic UI state with the server result.

The UI should never treat a successful optimistic update as proof that persistence succeeded.

## Reliability

Destructive operations should be explicit. Server failures should leave the client in a recoverable state and expose enough information for debugging without leaking credentials or internal database details.
