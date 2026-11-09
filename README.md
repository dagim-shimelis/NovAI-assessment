# Companies workspace

A bilingual (English/Dutch) B2B CRM demo built with Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS and TanStack Query. Search and manage 40 seeded companies in a URL-driven table and a shared create/detail/edit drawer, including deliberate recovery from concurrent edits. [Written assessment answers](docs/assessment-answers.md).

## Run locally

Prerequisites: Node.js **20.9+** and **pnpm 10.11.0** (or Corepack configured for the `packageManager` in `package.json`). No database, identity provider or environment variables are required.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:3000/companies>. Unauthenticated visits go to `/sign-in`; enter **any nonempty token** (for example `demo`) and continue. The token lives in this tab's `sessionStorage`; it is attached to API requests but is **not** a real credential. Sign out clears it and cached company data. A 401 also clears the session and returns to sign-in, preserving a validated local destination. To change languages, use the flag-and-code dropdown in the header; the selection persists in a cookie.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start                 # production server, after build
```

`typecheck` generates Next route types before checking TypeScript. Tests use isolated QueryClients and mock the artificial API delay. `pnpm test:watch` is available for development.

## Navigation and API

The `/companies` URL owns list and drawer navigation state:

| Parameter | Example | Behavior |
| --- | --- | --- |
| `q` | `?q=atlas` | Case-insensitive search of name and domain |
| `status` | `?status=qualified` | One of `new`, `researching`, `contacted`, `qualified`, `rejected` |
| `sort` | `?sort=name` | `name`, `-name`, `created_at`, `-created_at`; default newest first |
| `page` | `?page=2` | One-based page; **20 rows per page** |
| `drawer` | `?drawer=new` or `?drawer=company-001` | Create or open a shareable detail/edit drawer |

For example, `/companies?status=contacted&sort=name&page=2&drawer=company-003` preserves the list while the drawer opens. Search typing is debounced (350 ms) and **replaces** the current history entry; discrete filter, sort, page and drawer actions **push** entries. Search/filter/sort changes reset the page. Refresh and Back/Forward restore normalized controls and drawer. Invalid status, sort or page values use defaults without silently rewriting the URL. The prior table remains visible while a different query loads; the search icon spins during typing/fetching, and old rows are not highlighted as new-query matches. Status controls use shadcn Select in the list and drawer. Click anywhere on a company row to open its detail; its name remains a keyboard-accessible button.

Four mock Route Handler operations require `Authorization: Bearer <nonempty token>` and each waits **300–800 ms**, even on errors:

- `GET /api/v1/companies?limit=20&offset=0&q=atlas&status=new&sort=-created_at` returns `{ items, total, limit, offset }`.
- `GET /api/v1/companies/{id}` returns a record or 404.
- `POST /api/v1/companies` accepts `{ name, domain?, status? }`, returning 201 and version 1.
- `PATCH /api/v1/companies/{id}` accepts `{ if_version, name?, domain?, status? }`, returning the incremented version, 409 on a stale version or 404 if missing.

```sh
curl -H 'Authorization: Bearer demo' 'http://localhost:3000/api/v1/companies?limit=2&q=atlas'
```

Names are trimmed and cannot be blank; omitted/blank domains become `null`, omitted status becomes `new`. Invalid query/body fields produce structured 422 errors, malformed JSON produces 400, and responses are marked no-store. The API accepts any nonempty bearer value; it does **not** enforce users, organizations or permissions.

## Architecture and decisions

- `src/app/api/v1/companies/` exposes the four handlers; `src/companies/store.ts` holds one seeded **server-only**, single-process in-memory store. Validation in `src/companies/validation.ts` is shared with the form, and the server compares and writes versions without an intervening `await`.
- `src/companies/client.ts` centralizes typed calls, bearer attachment and structured HTTP errors. `src/companies/queries.ts` centralizes normalized query keys/options. TanStack Query owns **server state**—fetch lifecycles, caching, cancellation, retries on demand and mutation invalidation—rather than duplicating API responses in component state or loading through `useEffect + fetch`.
- The URL owns shareable list/drawer navigation; only the transient debounced input and form draft live locally. All response-affecting list parameters (including limit/offset) come from the same normalized URL state as the query key. No token, locale or drawer ID enters the list key. The table stays mounted during query changes.
- The opening detail response fixes the editable draft **and its base version** before typing. Background refetches can refresh the detail cache without overwriting either. A successful create seeds the new detail cache and invalidates lists, then replaces `drawer=new` with the new ID. A successful edit writes the returned detail and invalidates lists; active filters may still exclude that company.
- `src/i18n/server.ts` selects one dictionary from a cookie on the server and the root layout passes it and the locale into `LocalizationProvider`, so client controls and server text agree. Dictionaries have typed key parity; dates use locale-aware `Intl.DateTimeFormat` in UTC. The shadcn/ui **Sheet** (Radix Dialog primitive) supplies modal focus trapping, Escape and focus restoration instead of a homegrown dialog.

## Reproduce a version conflict

1. Open the same company in **two tabs** (for example `/companies?drawer=company-001`). Sign in separately in each tab if needed: `sessionStorage` is tab-scoped.
2. Leave both drawers open. In tab A edit and save the company, advancing its server version. In tab B edit the original values and click **Save changes**.
3. Tab B receives 409, shows a conflict message, and **keeps its draft and original base version**. Click **Load latest version** to fetch current server data into the detail cache; the draft remains separate. If loading fails, retry without losing edits.
4. Compare **Latest saved values** with **Your draft**. Choose **Use latest saved values** to discard the draft, or **Keep my draft** to adopt the latest base while retaining the typed fields. The latter requires another explicit **Save reviewed draft**; another concurrent write can produce another 409.

## Scope and limitations

This is a local assessment, not a production CRM. The seeded 40 records and subsequent edits reset on server restart and are **not shared across server processes/instances**. The fake `sessionStorage` token has no expiry, refresh, hosted identity provider, tenant isolation or actual authorization; never use this pattern for real customer data. There is no persistence, deletion, realtime cross-tab synchronization, unsaved-change confirmation, automated browser E2E suite, or server-prefetched/hydrated company data (the server cannot see this tab's token). These were consciously left out to prioritize the requested typed API, navigation, concurrency and accessibility. With more time: introduce a real auth/session layer and durable tenant-scoped database with atomic version checks, add automated two-tab and keyboard E2E tests, then measure before adding server prefetch/streaming or other performance optimizations.

The locale lint rule checks JSX text and user-facing attributes, and TypeScript checks dictionary-key parity; generated JavaScript strings still require human review. A single-process mock and browser session are for local review, not multi-worker deployment.
