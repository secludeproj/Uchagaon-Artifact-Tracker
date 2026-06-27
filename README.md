# Seclude Heritage Inventory Manager
## Stack: React + TypeScript + Supabase + Netlify

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Database**: Supabase PostgreSQL (with Row Level Security)
- **Auth**: Supabase Auth (Google OAuth + Email)
- **Realtime**: Supabase Realtime subscriptions
- **Hosting**: Netlify

### Setup
1. Run `supabase_schema.sql` in your Supabase SQL Editor
2. Enable Google OAuth in Supabase Auth settings
3. Set `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` in GitHub Secrets
4. Push to main branch — auto deploys via GitHub Actions

### Environment
No `.env` needed — Supabase credentials are in `src/lib/supabase.ts`
