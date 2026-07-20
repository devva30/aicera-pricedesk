# PriceDesk

Enterprise pricing approval workflow platform for B2B sales teams.

## Start here

| Goal | Guide |
|------|--------|
| **First time + Supabase setup** | **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** ← step-by-step for beginners |
| Quick try without database | Demo mode below |

## Demo mode (2 minutes)

```bash
cd pricedesk
npm install
npm run dev
```

Open http://localhost:5173 → **Quick demo access** on login (no `.env` needed).

## Production with Supabase

1. Follow **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** completely.
2. Copy `.env.example` → `.env` with your Project URL and anon key.
3. Run SQL migrations `001` through `004` in the Supabase SQL Editor.
4. Sign up (Sales Rep) → promote yourself to admin → invite your team.

## Roles

| Role | How to get it |
|------|----------------|
| **Sales Rep** | Public sign up |
| **Finance, Technical, Sales Head, Admin** | Admin **Invite user** only |
| **First Admin** | Sign up + `promote_user_to_admin('your@email.com')` in SQL (see setup guide) |

## Features

- Approval pipeline: Draft → Finance → Technical (optional) → Sales Head → Approved
- Deal builder with live margin intelligence
- Admin invite links with server-side role assignment
- Row Level Security (RLS) on PostgreSQL
- Enterprise UI: dark/light mode, command palette (⌘K), dashboards per role

## Scripts

```bash
npm run dev       # http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
npm run typecheck # TypeScript check
```

## Project layout

```
pricedesk/
├── SUPABASE_SETUP.md      # Beginner Supabase guide
├── supabase/migrations/   # Run 001 → 004 in SQL Editor
├── src/                   # React application
└── .env                   # Your Supabase keys (not committed)
```

## License

Proprietary — Internal enterprise use.
