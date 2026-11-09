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
