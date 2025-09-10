Meld is a Next.js 15 app for collaborative, jar‑based personal finance. It models “jars” (accounts/buckets), categories, budgets, transactions (income/expense/transfer), goals, invites, and recurring transactions. The backend uses Prisma with PostgreSQL and Supabase Auth; the UI is Tailwind CSS with the App Router.

## Quick Start

Prerequisites
- Node.js 18+ and npm
- Supabase CLI installed and logged in (`supabase --version`)

1) Install dependencies
- `npm install`

2) Start local Supabase (DB + Auth)
- From the project root, run: `supabase start`
- Copy the local project URL and anon key from the Supabase CLI output.
- Create `.env.local` and add your Supabase URL and anon key so the app can authenticate and talk to the local Postgres provided by Supabase.

3) Prepare the database
- Generate Prisma client: `npm run db:gen`
- Apply migrations: `npm run db:migrate:dev`
- (Optional) Seed demo data: `APP_ENV=dev npm run db:seed:dev`

4) Run the app
- `npm run dev` then open `http://localhost:3000`

## Testing
- Run tests with `npm test` (Vitest + JSDOM).

Notes
- This project expects to use the Postgres instance started by the local Supabase stack (no Docker Compose is required for the database).
- Auth integrations rely on Supabase’s local JWTs; sign in via the app or pass a bearer token when calling server APIs.
