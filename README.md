# [YOUR APP NAME]

Marketing automation SaaS starter built with Next.js 14 (App Router), TypeScript, Tailwind, Supabase, Zustand, and shadcn-style components.

Quick start

1. Copy .env.local from the template and fill in your keys.
2. Install dependencies:

```powershell
npm install
```

3. Run dev:

```powershell
npm run dev
```

Files of interest

- `app/` - Next.js App Router pages and API routes
- `app/api/` - server routes for AI, email, workflows
- `lib/supabase.ts` - Supabase client
- `middleware.ts` - protects /dashboard routes

Notes

- All secrets are read from environment variables. Do not commit real secrets.
- This repository contains minimal implementations and helpers; extend and secure appropriately for production.
