# Team Travel Expense Tracker

A React and Supabase travel expense tracker with team collaboration, admin visibility, private receipt storage, and downloadable PDF or Excel reports.

## What it includes

- Email/password auth with Supabase Auth
- Team-aware access using `teams` and `team_members`
- Admin dashboard for team-wide filtering by user, trip, and date
- Member dashboard limited to the signed-in user's own trips and expenses
- Receipt uploads to the private `receipts` bucket using `team_id/user_id/trip_id/filename`
- Trip and expense CRUD with remarks and receipt previews
- Statement-style PDF and `.xlsx` report export
- Supabase SQL for schema, trigger-based team bootstrap, RLS, and storage policies

## Project structure

- [src/App.jsx](/C:/Users/leosy/OneDrive/Documents/test%20web/src/App.jsx)
- [src/components/AuthForm.jsx](/C:/Users/leosy/OneDrive/Documents/test%20web/src/components/AuthForm.jsx)
- [src/components/TripForm.jsx](/C:/Users/leosy/OneDrive/Documents/test%20web/src/components/TripForm.jsx)
- [src/components/ExpenseForm.jsx](/C:/Users/leosy/OneDrive/Documents/test%20web/src/components/ExpenseForm.jsx)
- [src/components/ExpenseGrid.jsx](/C:/Users/leosy/OneDrive/Documents/test%20web/src/components/ExpenseGrid.jsx)
- [src/utils/reports.js](/C:/Users/leosy/OneDrive/Documents/test%20web/src/utils/reports.js)
- [supabase/schema.sql](/C:/Users/leosy/OneDrive/Documents/test%20web/supabase/schema.sql)

## Setup

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in your Supabase URL and anon key.
4. Run the SQL in [supabase/schema.sql](/C:/Users/leosy/OneDrive/Documents/test%20web/supabase/schema.sql) inside the Supabase SQL Editor.
5. Enable email/password auth in Supabase Auth.
6. Start the app with `npm run dev`.

## Notes

- New signups create a team automatically and mark that first user as the team admin through the SQL trigger in the schema file.
- Additional users can be inserted into `team_members` manually now; invite flows and role management UI are not yet built.
- Receipt references are stored as private storage paths in `receipt_url`, and the app generates fresh signed URLs for previews and downloads.

## Validation limits

- I could not run `npm install`, `npm run dev`, or a production build in this environment because Node and npm are not installed here.
