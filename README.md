# NovAI assessment

Next.js 16 App Router foundation with React 19, strict TypeScript, Tailwind CSS, TanStack Query, and English/Dutch localization. The companies screen is intentionally a placeholder; API, auth, and company features follow in later stages.

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

The store is **in-memory and single-process only**: it resets on server restart and is not shared across workers/instances (including serverless deployments). It is for local assessment use, not durable production storage. The typed client takes an injected token getter and optional 401 callback; sign-in and token storage are deferred to the next stage. Query options are created via `createCompanyQueries(client)`; `companyKeys.lists()` and `.details()` are invalidation prefixes.
