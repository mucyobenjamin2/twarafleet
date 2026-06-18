# TwaraFleet

A web app + installable PWA for managing a motorcycle-taxi fleet: daily collections (versements), debts, expenses, driver assignments, savings goals, and compliance documents (insurance, tax, inspections), with automatic debt creation and due-date notifications.

Built with React + Vite, Tailwind CSS v4, and Supabase (Postgres, Auth, Storage, Realtime).

## 1. Set up the database

1. Open your Supabase project → **SQL Editor** → New query.
2. Paste the contents of `sql/001_schema.sql` and run it. This creates all 16 tables, enums, the `set_updated_at` trigger, the debt-automation triggers, the `generate_due_notifications()` function, and row-level security policies, plus a trigger that creates a `public.users` row whenever someone signs up.
3. In **Storage**, create a new bucket named exactly `twarafleet` and mark it **Public** (the app uploads photos, receipts, and documents here and stores their public URL).
4. (Optional, recommended) Schedule the notification check to run daily. Easiest option: Supabase → **Database → Cron Jobs** → new job running once a day with:
   ```sql
   select generate_due_notifications();
   ```
   Without this, you can still trigger the same check manually from the **Notifications** page in the app ("Check due dates now").

## 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and fill in your project's URL and anon key (Supabase dashboard → Project Settings → API):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

## 3. Run it locally

```bash
npm install
npm run dev
```

Open the printed local URL. Sign up for the first owner account on the login screen — this creates your `public.users` row automatically.

## 4. Build for production / deploy

```bash
npm run build
```

This outputs a static site to `dist/` (including the service worker and manifest), deployable to any static host — Vercel, Netlify, Cloudflare Pages, or your own server. No server-side runtime is required; all data access goes directly to Supabase from the browser.

## 5. Install as a PWA

Once deployed over HTTPS, open the site on a phone or desktop Chrome/Edge and use "Add to Home Screen" / the install icon in the address bar. The app will then launch full-screen like a native app and cache itself for fast repeat loads (data still requires a connection; Supabase Storage assets are cached for offline viewing).

## How the business rules are implemented

- **Daily target (6,000 RWF default, per-motorcycle override)** — `motorcycles.daily_target`, used by the Collections quick-entry panel to compute shortfall live.
- **Saturdays are never expected to collect** — the `handle_versement_debt()` Postgres trigger checks `extract(isodow from collection_date) = 6` and skips debt creation; the Collections page also shows a banner instead of the entry grid on Saturdays.
- **Missed/short collections auto-create a debt** — same trigger, fires after every insert/update on `versements`.
- **Debts carry forward until cleared** — `debt_payments` inserts reduce `debts.remaining_amount` via `handle_debt_payment()` and only flip status to `paid` once it reaches zero; unpaid debts simply remain `active` indefinitely.
- **Real-time dashboard** — `Dashboard.jsx` subscribes to Postgres changes on `versements`, `debts`, and `motorcycles` via Supabase Realtime and refreshes automatically.
- **Automatic notifications** — `generate_due_notifications()` checks insurance, tax, inspections, reminders, and savings-goal deadlines within their respective windows and inserts rows into `notifications`; run it on a schedule (step 1.4) or on demand from the Notifications page.
- **Files in Supabase Storage** — `FileUpload.jsx` uploads to the `twarafleet` bucket and stores the public URL on the record (driver photos, receipts, policy documents, etc).
- **Activity log** — every create/update/delete through the app writes a row to `activity_logs` (visible, read-only, on the Activity Log page).

## Project structure

```
sql/001_schema.sql      Full database schema + business-rule functions
src/lib/                 Supabase client, formatting helpers, activity logging
src/contexts/            Auth state (Supabase Auth + linked profile)
src/hooks/               Generic CRUD hook, dashboard stats, today's collections
src/components/          Shared UI: layout, data table, form renderer, modals
src/config/              Field/column definitions for each resource (drives the generic CRUD pages)
src/pages/               One page per feature; Dashboard, Collections, and Debts are custom-built, the rest are config-driven
```

## Notes & things to revisit before scaling up

- **Multi-tenancy**: row-level security currently allows *any authenticated user* to read/write *all* data (a single-fleet model). If you'll have multiple independent fleet owners sharing one Supabase project, tighten the RLS policies in `sql/001_schema.sql` to scope rows by `owner_id`.
- **Bundle size**: the production build is one ~500KB JS chunk. Fine for this app's scope; if it grows substantially, consider route-based code-splitting with `React.lazy`.
