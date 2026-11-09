# NovAI assessment

A bilingual Companies workspace built with Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS, and TanStack Query. It includes assessment-only sign-in, an authenticated mock API, and a searchable, filterable, sortable, paginated companies list. Company creation, detail and editing drawers, and conflict recovery are planned for a later stage.

## Prerequisites

Node.js 20.9+ and pnpm 10 (the project specifies pnpm 10.11.0).

## Run locally

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000 (redirects to `/companies`). Switch language with the EN/NL control; the preference is stored in a cookie. The default is English.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:watch
pnpm build
pnpm start  # after build
```

`typecheck` runs `next typegen` first so route types exist on a fresh checkout. Tests use a separate QueryClient per render, with retries disabled. Date formatting uses the selected locale and an explicit UTC timezone.

Localization checks: `pnpm lint` rejects literal JSX text and user-facing JSX attributes in `src/**/*.tsx` (excluding tests); `pnpm typecheck` checks that the Dutch dictionary has exactly the English dictionary's keys. Add new UI strings to both dictionaries and render them via the selected dictionary. Technical attributes (such as `className`, `id`, form `name`/`value`, and data attributes) are exempt; rare proper nouns need a documented local lint exception. The rule does not detect strings built in JavaScript expressions, so review those when adding UI.

## Mock companies API

All requests require `Authorization: Bearer <nonempty token>` (any nonempty token is accepted by this mock). Each request incurs a 300–800 ms delay, including errors. Available endpoints:

- `GET /api/v1/companies?limit=20&offset=0&sort=-created_at` — filter/search and paginate. Omit `status` to include all records; valid sort values are `name`, `-name`, `created_at`, `-created_at`.
- `GET /api/v1/companies/{id}` — retrieve one record.
- `POST /api/v1/companies` — create with `{ "name": "Example", "domain": "example.com", "status": "new" }`.
- `PATCH /api/v1/companies/{id}` — update with `{ "if_version": 1, "name": "Updated" }`.

For example, while `pnpm dev` is running:

```sh
curl -H 'Authorization: Bearer demo' 'http://localhost:3000/api/v1/companies?limit=2&q=atlas'
curl -X POST -H 'Authorization: Bearer demo' -H 'Content-Type: application/json' \
  -d '{"name":"Example"}' http://localhost:3000/api/v1/companies
```

The server seeds exactly 40 deterministic records. List defaults are limit 20, offset 0, no filter, and newest first; limit must be 1–100 and offset a nonnegative safe integer. Search covers names and domains without case sensitivity; sorting uses ID as a tie-breaker. Names are trimmed and cannot be blank; omitted domain becomes `null`, omitted status becomes `new`. Invalid query/body fields return 422 with field errors, malformed JSON returns 400, missing records return 404, and a stale `if_version` returns 409 with the latest record in `error.details.current`. Error bodies use `{ "error": { "code", "message", "details" } }`.

The store is **in-memory and single-process only**: it resets on server restart and is not shared across workers/instances (including serverless deployments). It is for local assessment use, not durable production storage. The typed client takes an injected token getter and optional 401 callback. Query options are created via `createCompanyQueries(client)`; `companyKeys.lists()` and `.details()` are invalidation prefixes.

## Companies workspace and fake sign-in

Open `/companies`. Without a session, the app redirects to `/sign-in` and preserves the requested local path and query string. Enter **any nonempty token**; it is stored in this tab's `sessionStorage` and sent as a bearer token to the mock API. This is assessment-only authentication, **not real identity or authorization**: the mock API accepts any nonempty bearer value. The server does not validate a real user. Sign out removes the token and all cached company data. A 401 does the same and returns to sign-in. No environment variable or external authentication service is needed.

The list uses `q`, `status`, `sort`, and `page` in `/companies` as its source of truth. Defaults are an empty search, all statuses, newest first, and page 1 (20 rows). Invalid status, sort, or page values fall back to defaults without rewriting the URL; changing a control writes a normalized value. Search input is debounced by 350 ms and **replaces** the current history entry so each keystroke does not create a Back stop. Filter, sort, page, open and close actions **push** a history entry; filter/sort/search changes reset page to 1. Back/Forward and refresh restore controls, results and drawer. Other parameters are preserved. During a new request the old rows remain visible, with an updating announcement; pagination waits for authoritative bounds. Language switching keeps the URL, session, and client query cache.

## Company drawer and conflict recovery

`drawer=new` opens the create form; `drawer=<company-id>` opens the detail/edit form. The list stays mounted behind the drawer. Direct links and refresh restore either mode; closing removes only `drawer`. A successful create replaces `drawer=new` with the new ID, updates the detail cache, and invalidates lists. Active filters may exclude the new record, so the drawer remains available even when the row is not in the list. Name, domain and status are validated with the same rules as the API; an empty domain becomes `null`. Field errors from a 422 are localized.

The drawer uses the shadcn/ui **Sheet** source with Radix Dialog's modal focus trap, Escape handling, and focus restoration. Its generated source was adapted to the existing light stone palette and a localized text close control; the CLI did not change global CSS. Create focuses the name field; detail focuses the close control. A direct link without an opener restores focus to Create company when closed.

To reproduce a conflict, open the same company in two tabs (sign in separately in each tab), edit it in both, save in tab A, then save the stale form in tab B. Tab B keeps its draft and original base version. Choose **Load latest version** to fetch fresh detail data, compare the saved values with the draft, then explicitly choose **Use latest saved values** or **Keep my draft**. The latter adopts the new base version but requires another deliberate save; a second 409 repeats the same review. A failed reload retains the draft and can be retried. The opening detail response fixes the form's draft and base version before the first keystroke; background refetches never change either. Only a successful save or explicit reconciliation resets the base.

Known limitations: this is a single-process in-memory demo; restarts lose edits and multiple server workers may disagree. There is no real account security, deletion, persistence, unsaved-change confirmation, or cross-tab realtime sync. A conflict is detected only at save time; opening a second tab does not copy the first tab's `sessionStorage` in all browsers, so enter a token there if prompted.
