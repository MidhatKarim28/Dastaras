# CLAUDE.md — Dastaras

Context for Claude Code. Read this first; it records decisions already made so they don't get re-litigated.

## What this is
**Dastaras** (دسترس, "within reach") is a home-services marketplace for Pakistan. Clients book vetted local
providers (electricians, cleaners, AC techs, plumbers, carers…) by the hour. It's a 2026 rebuild of the
owner's university FYP (an Expo/React Native app + Express/pg API at `../FYP`, never shipped).
Goals: (1) a real, fully working **website**, (2) a portfolio piece showing modern full-stack skill,
(3) leave room for the **Expo mobile app to come back later using the same API**.

The old FYP is reference only — don't port its code. Known problems there: Twilio creds hardcoded and
committed to git (the owner must rotate them), no auth/sessions, route collisions, LAN-IP URLs, mocked screens.

## Stack (decided)
- **pnpm workspaces + Turborepo** monorepo, Node ≥ 22, TypeScript 6 (strict, `noUncheckedIndexedAccess`)
- **apps/api**: Hono 4 on `@hono/node-server`. Better Auth (email+password) with the Drizzle adapter.
  Zod 4 validation via `@hono/zod-validator` (wrapped in `src/lib/validate.ts` for a consistent
  `{ error, issues }` 400 shape). Exports `AppType` + a typed **Hono RPC client** (`@dastaras/api/client`)
  used by web now and by a future Expo app. Built with tsup; dev with `tsx watch`.
- **packages/db**: Drizzle ORM 0.45 + node-postgres, `casing: "snake_case"`. Schema in `src/schema.ts`,
  SQL migrations in `drizzle/`.
- **packages/shared**: Zod schemas, the booking state machine, constants (cities, PKR formatting).
  Pure TS; zod is the only runtime dependency. Import from here on both server and client.
- **apps/web**: Next.js 16 App Router, React 19, Tailwind v4. Built; not yet run against a live DB.
- Postgres 17 (docker compose). Biome 2 for lint+format. Vitest 5 for tests. GitHub Actions CI (still to add).

## Layout
```
apps/api/src
  app.ts            Hono app: middleware, error handling, route mounting, exports AppType
  index.ts          node server entry (graceful shutdown)
  auth.ts           Better Auth config (roles, provider-profile hook)
  middleware.ts     withSession, requireAuth, requireRole(role), currentUser(c)
  routes/           catalog.ts, listings.ts, bookings.ts, me.ts   (chained → RPC types work)
  lib/bookings.ts   transactional booking logic (create / transition / review)
  client.ts         createApiClient(), unwrap(), ApiError
  scripts/seed.ts   destructive dev seed
apps/api/test       Vitest integration tests via app.request() against the dastaras_test DB
packages/db         schema.ts, index.ts (createDb, Database, Tx), migrate.ts, drizzle/
packages/shared     booking.ts, schemas.ts, constants.ts (+ test/)
```

## Commands (from repo root)
```bash
cp .env.example .env            # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm install                    # enable pnpm with: corepack enable
pnpm db:up                      # docker compose Postgres (creates dastaras + dastaras_test)
pnpm db:migrate
pnpm db:seed                    # demo data; logins below
pnpm dev                        # turbo: api on :8787 (web on :3000 once it exists)
pnpm test                       # shared unit + api integration tests (Postgres must be up)
pnpm typecheck && pnpm lint
pnpm db:generate                # after editing packages/db/src/schema.ts → new migration
```
Demo logins (password `password123`): `client@dastaras.dev`, `provider@dastaras.dev`, plus more providers
(ayesha@, bilal@, sana@, usman@, hamza@, nadia@, kashif@, faisal@, rabia@, zain@, mariam@ …dastaras.dev).

Windows note: if the Docker volume was created before `scripts/create-test-db.sql` existed, create the test DB
by hand: `docker compose exec db psql -U dastaras -c "CREATE DATABASE dastaras_test"`.

## Domain model
- `user` (Better Auth table + `role` enum client|provider|admin, `phone`), `session`, `account`, `verification`
- `category` (slug, `icon` = lucide icon name) → `service`
- `provider_profile` (1:1 with user; auto-created on provider sign-up via a Better Auth `databaseHooks` hook)
- `listing`: a provider's offer for one service. Title, description, `hourly_rate` (integer PKR), city, area,
  `active`, and a denormalised `rating_avg`/`rating_count` (updated inside the review transaction). GIN FTS index.
- `booking`: status enum, `scheduled_at`, `duration_hours` (1–12), a **price snapshot** (`hourly_rate`,
  `total_amount`), address, notes
- `booking_event`: append-only audit log of every status change (drives the timeline UI)
- `review`: one per booking (unique), client → provider, rating 1–5

### Booking state machine (`packages/shared/src/booking.ts` is the single source of truth)
```
pending ─accept(P)→ accepted ─start(P)→ in_progress ─complete(P)→ completed
pending ─decline(P)→ declined ; pending ─cancel(C)→ cancelled ; accepted ─cancel(C|P)→ cancelled
```
The API returns `actions` (the viewer's allowed transitions) on booking list and detail. UIs render buttons
from `actions` and never hardcode the rules. Transitions lock the row (`SELECT … FOR UPDATE`). Accepting a
booking checks for overlapping accepted/in_progress jobs (409). Creating a booking also rejects overlaps with
confirmed jobs, bookings on your own listing, and times less than 30 minutes from now.

## API surface (all under `/api`)
| Method | Path | Auth |
|---|---|---|
| * | `/auth/*` | Better Auth (sign-up/email, sign-in/email, sign-out, get-session…) |
| GET | `/health` | – |
| GET | `/categories`, `/categories/:slug` | – |
| GET | `/listings?q&category&service&city&maxRate&sort&page&pageSize` | – (sort: recommended/rating/price_asc/price_desc/newest) |
| GET | `/listings/:id` | – (includes providerProfile + 20 latest reviews) |
| POST | `/listings` | provider |
| PATCH | `/listings/:id` | owner (partial update, incl. `active`) |
| GET | `/bookings?as=client\|provider&status` | signed in |
| POST | `/bookings` | signed in |
| GET | `/bookings/:id` | participant (adds `viewerRole`, `actions`, `canReview`, `review`, `events`) |
| POST | `/bookings/:id/transition` `{ to, note? }` | participant |
| POST | `/bookings/:id/review` `{ rating, comment? }` | client; completed bookings only; once |
| GET | `/me` | signed in |
| PUT | `/me/provider-profile` | provider |
| GET | `/me/listings`, `/me/stats` | provider |

Errors always look like `{ error: string, issues?: {path,message}[] }`, with the matching status (400/401/403/404/409).

## Conventions / gotchas
- Keep route files **chained** (`new Hono().get(...).post(...)`), otherwise RPC type inference breaks.
- In handlers, use `currentUser(c)` (throws 401) instead of `c.get("user")!`.
- Multi-step writes go in `db.transaction`; the tx type is `Tx` from `@dastaras/db`.
- Better Auth rejects cookie-authenticated POSTs without a trusted `Origin` header (the tests send `origin: http://localhost:3000`).
- Users can self-select only `client` or `provider`; the `before` hook forces anything else to `client`.
- Money is integer PKR; format it with `formatPKR()` from shared.
- Don't hand-edit `packages/db/drizzle/`. Change the schema and run `pnpm db:generate`.
- The seed is destructive (truncates everything) and refuses to run with NODE_ENV=production.
- `.env` lives at the repo root; the api scripts load it with `--env-file=../../.env`.

## Status
**Done and verified** in the build environment: typecheck is clean, 18 API integration tests and 7 unit tests
pass, the seed runs, and the live endpoints were smoke-tested. Built so far: monorepo, schema + first
migration, seed, auth with roles, catalog/listings/bookings/reviews/me routes, the state machine, overlap
protection, row-locked transitions, and the typed RPC client.

On the owner's machine it has **not been installed or run yet**. First step: follow "Commands" above and
confirm `pnpm test` passes locally.

## Backlog
**[docs/BACKLOG.md](docs/BACKLOG.md) is the source of truth** for what's planned: phases, gates, MVP decisions
(no CNIC, one-way ratings, no online status, whole-hour bookings) and the decision log. Planning docs and reports
live in `docs/` (Markdown/HTML + images in `docs/assets/`), not in external tools. The notes below are the
original build spec.

## Next up
### 1. Web app — `apps/web` (Next.js 16, App Router, Tailwind v4)
- `package.json` name `@dastaras/web`. Deps: next, react, react-dom, `@dastaras/api` (client + types),
  `@dastaras/shared`, better-auth (react client), @tanstack/react-query, lucide-react, sonner, clsx,
  tailwind-merge, geist (font from npm, which avoids fetching Google Fonts at build time). Add the workspace
  packages to `transpilePackages`.
- **Same-origin API**: `next.config.ts` rewrites `/api/:path*` → `${API_URL}/api/:path*`, so auth cookies stay
  first-party. In the browser, call `createApiClient(window.location.origin)` (the routes already include
  `/api`). Server components call `API_URL` directly and forward the `cookie` header.
- Auth client: `createAuthClient` from `better-auth/react` (baseURL = the window origin, basePath `/api/auth`).
  Pass `role` in `signUp.email`. Server-side session helper: hit `/api/auth/get-session` with the cookies.
  Protect `/dashboard/**` in a layout (redirect to `/sign-in?next=`).
- Pages:
  - `/` landing: hero with search (service + city), category grid (lucide icons from `category.icon`),
    how-it-works for clients and providers, top-rated listings, provider CTA. Server-rendered.
  - `/services`: search/browse with filters kept in URL searchParams (q, category, city, maxRate, sort, page). SSR.
  - `/listings/[id]`: details, provider card (verified badge, years of experience), rating and reviews, and a
    sticky booking form (date, time, hours stepper, address, notes, live total) → POST /bookings → redirect to
    the booking page.
  - `/sign-in`, `/sign-up` (client/provider role toggle), honouring a `next` redirect.
  - `/dashboard`, role-aware. Client: bookings with status tabs, cancel, a "leave a review" dialog.
    Provider: stats cards (`/me/stats`), incoming requests with accept/decline, upcoming jobs (start/complete),
    "My listings" (create/edit/pause), a profile editor (`PUT /me/provider-profile`).
  - `/bookings/[id]`: detail plus a timeline from `events`, action buttons from `actions`, and a review form
    when `canReview` is true.
- Use React Query for dashboard data and mutations (invalidate after transitions), `sonner` toasts for errors
  (`ApiError.message`), loading skeletons, empty states, `not-found.tsx`, `error.tsx`.
- Design: clean, trustworthy, mobile-first. Deep emerald/teal primary with a warm amber accent, Geist font,
  CSS-variable tokens with dark mode. Small hand-rolled shadcn-style primitives in `src/components/ui`.
- Add `apps/web` to Turbo `dev` so `pnpm dev` runs both apps.

### 2. Quality & DevOps
- `.github/workflows/ci.yml`: Postgres service, pnpm install, lint, typecheck, test, build.
- Playwright E2E for the core loop (sign up → book → provider accepts → completes → review).
- README with an architecture diagram, screenshots and a live demo link. Deploy: web on Vercel, API on
  Railway/Fly/Render, Postgres on Neon.

### 3. Later phases (roadmap, roughly in order)
- Real-time booking updates and per-booking chat (SSE or WebSockets / Ably/Pusher); the FYP had chat screens.
- Maps and "near me": a PostGIS point on listings/profiles, Leaflet/MapLibre on web.
- Phone OTP sign-in (Better Auth `phoneNumber` plugin; SMS provider credentials from env, never hardcoded).
- Image uploads (avatars, listing photos) to Cloudflare R2/S3 via presigned URLs.
- Payments (Stripe test mode or a local gateway) and a provider payouts view.
- AI: "describe your problem" → suggested service and price range.
- OpenAPI docs (`hono-openapi`) and rate limiting on public routes.
- **Expo app** (`apps/mobile`): reuse `@dastaras/api/client` + `@dastaras/shared`, with the Better Auth `@better-auth/expo` plugin.
