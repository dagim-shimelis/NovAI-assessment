# Project Guide

This project implements a Companies workspace for a B2B sales and

marketing application. Users can search, filter, create, and edit company

records through a bilingual interface.

## Technology

- Next.js 16 App Router and React 19

- TypeScript with strict checking

- Tailwind CSS

- TanStack Query

- pnpm

## Organization

Keep presentation, API access, and server-side storage separate.

- Route Handlers expose the companies API.

- A shared in-memory store owns company records.

- A typed client handles requests, authentication headers, and HTTP errors.

- Query options and query keys define server-state access.

- Feature components implement the table and company drawer.

- Locale dictionaries contain interface text.

Prefer straightforward modules and reuse existing conventions before

introducing new abstractions.

## Data and API

Company records include an ID, name, optional domain, status, version,

and creation/update timestamps.

The API supports listing, retrieving, creating, and updating companies.

List responses include items, total, limit, and offset.

Validate input at the API boundary. Keep client validation consistent

with those rules and expose actionable validation messages in the UI.

The mock API uses bearer authentication and simulated latency.

In-memory persistence is intended for local development and resets when

the server restarts.

## Server State

Use TanStack Query for remote data and mutations.

- Centralize request behavior in the typed client.

- Include every relevant list parameter in its query key.

- Normalize URL parameters before constructing requests and query keys.

- Keep the table mounted while results refresh.

- Update or invalidate affected queries after successful mutations.

- Clear session-specific cached data when authentication ends.

Keep editable form drafts separate from cached server records.

## Navigation State

The URL represents search, filters, sorting, pagination, and drawer state.

Refreshing or sharing a URL should restore the same view. Browser

navigation should restore previous selections.

Reset pagination when filters change. Preserve list parameters when

opening or closing a company drawer.

## Concurrent Editing

Updates include the version associated with the form's starting values.

The server rejects stale writes with HTTP 409.

When a conflict occurs:

- Preserve the user's draft.

- Explain that another update was made.

- Allow the latest record to be retrieved.

- Keep the latest server values available alongside the draft.

- Require deliberate reconciliation before submitting again.

Background data refreshes must preserve unsaved edits. Keep the version

check and write together in the server-side update operation.

## Authentication

Attach bearer tokens through the shared API client.

Handle HTTP 401 consistently by returning the user to sign-in.

Keep tokens out of URLs, query keys, logs, and error messages.

## Localization

Support English and Dutch throughout the Companies feature.

- Centralize user-facing strings in locale dictionaries.

- Load the selected dictionary for client components.

- Keep server and client locale selection consistent.

- Format dates and numbers using the selected locale.

- Include validation and feedback messages in translations.

## Accessibility

Use semantic controls and explicit form labels.

The drawer must support keyboard navigation, trap focus while open,

close on Escape, and restore focus after closing. Announce errors and

make retry actions accessible.

Provide clear loading, error, and empty states for both the list and

drawer.

## Testing

Prioritize observable behavior and regressions involving state.

Maintain coverage for:

- List filtering and URL synchronization.

- Conflict recovery and draft preservation.

- Query-key consistency or typed client behavior.

Use an isolated QueryClient for each test.

Before completing a change, run:

    pnpm lint

    pnpm typecheck

    pnpm test

    pnpm build

## Contribution Practices

Keep changes focused and commits descriptive. Include relevant tests

with behavior changes.

Use explicit types and handle errors at appropriate boundaries.

Avoid `any`, type-check suppression, unused code, and unnecessary

abstractions.

Update the README when setup, behavior, or architectural decisions

change. Document known limitations and explain significant trade-offs.
