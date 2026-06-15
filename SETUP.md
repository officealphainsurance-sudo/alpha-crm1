# Alpha Insurance CRM — Setup Guide

## Prerequisites

- Node.js 20+
- Supabase CLI (`npm install -g supabase`)
- Access to the Alpha Insurance Supabase project: `erfjiutywidyfylesjgn.supabase.co`

---

## 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Where to find it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `VITE_SB_PUBLISHABLE_KEY` | Supabase dashboard → Project Settings → API → anon/public key |
| `VITE_ATTACHMENTS_BUCKET` | Set to `attachments` (default) |

**Never commit `.env.local`.** It is listed in `.gitignore`.

---

## 2. Install Dependencies

```bash
make install
# or: npm install
```

---

## 3. Run the New Database Migration

The migration at `supabase/migrations/20260613000000_alpha_insurance_tables.sql` creates:
- `carriers`
- `pipeline`
- `follow_ups`
- `call_logs`

### Apply locally (if running local Supabase)

```bash
npx supabase migration up --local
```

### Apply to the remote Alpha Insurance project

```bash
npx supabase db push
```

> The migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Safe to re-run.

---

## 4. Start the Dev Server

```bash
make start
# Opens http://localhost:5173
```

For demo mode with fake data (no Supabase connection needed):

```bash
make start-demo
```

---

## 5. Log In

Use an existing Supabase Auth user from the Alpha Insurance project. If you need to create a new user, use the Supabase Dashboard → Authentication → Users → Invite User.

Team accounts:
- Amanda Frizell (owner/producer)
- Monica Ray (senior agent)
- Marlon (ops/tech)

---

## 6. Deploy to Netlify

### One-time setup

1. Connect the GitHub repo to a new Netlify site.
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify → Site Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SB_PUBLISHABLE_KEY`
   - `VITE_ATTACHMENTS_BUCKET`

### SPA routing

`public/_redirects` is already present:

```
/* /index.html 200
```

Netlify will pick this up automatically from the `dist/` folder.

### Build

```bash
make build
# Output: dist/
```

---

## 7. Navigation

| Sidebar Item | Route | Supabase Table |
|-------------|-------|---------------|
| Dashboard | `/` | aggregated from all tables |
| Clients | `/clients` | `clients` |
| Carriers | `/carriers` | `carriers` |
| Pipeline | `/pipeline` | `pipeline` |
| Follow-Ups | `/follow_ups` | `follow_ups` |
| Activity Log | `/contact_logs` | `contact_logs` |

---

## 8. Key Rules for All Users

- **Payment questions → Amanda Frizell** — never automated
- **Opt-out respected** — clients with `opt_out = true` must not receive automated outreach
- **No data in localStorage** — Supabase is the single source of truth
- **DRY_RUN** — any bulk automation defaults to preview mode unless explicitly confirmed

---

## 9. Development Notes

- TypeScript: `make typecheck` — must be zero errors before any PR
- Unit tests: `make test`
- Lint/format: `make lint`
- Registry (Shadcn): auto-runs on `git commit` via pre-commit hook
- New tables must always have RLS enabled with authenticated-only policies
