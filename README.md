# Dastaras

Book trusted home-service professionals across Pakistan (electricians, cleaners, AC techs, plumbers, carers)
by the hour. A full-stack TypeScript monorepo: a Hono API shared by web and (soon) mobile, a Next.js web app,
and Postgres via Drizzle.

> Rebuilt from my university final-year project (React Native + Express) as a production-grade web app.

## Stack
Hono · Better Auth · Drizzle ORM · PostgreSQL · Zod · Next.js 16 · React 19 · Tailwind v4 · Turborepo · Vitest · Biome

## Highlights
- **End-to-end type safety**: the web app calls the API through a Hono RPC client inferred from the server routes.
- **Booking state machine** shared by client and server, with row-locked transitions, an audit trail
  and double-booking protection.
- **Role-based auth** (client/provider) with secure session cookies.
- Integration tests run against a real Postgres database.

## Getting started
```bash
cp .env.example .env        # set BETTER_AUTH_SECRET
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev
```
Demo logins: `client@dastaras.dev` / `provider@dastaras.dev`, password `password123`.

See [CLAUDE.md](./CLAUDE.md) for architecture notes and the roadmap.
