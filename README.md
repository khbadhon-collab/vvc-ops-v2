# VVC Ops — Deployment Guide
## Your all-in-one document intelligence platform

---

## Step 1 — Set up Supabase (your database) — 10 minutes

1. Go to **supabase.com** → Sign up free → Create new project
2. Name it: `vvc-ops` · Password: choose a strong one · Region: Singapore (closest to BD)
3. Wait ~2 minutes for it to set up
4. Go to **SQL Editor** (left sidebar) → paste the contents of `supabase-schema.sql` → click Run
5. Go to **Authentication → Users** → Add user → enter your email + password (this is your login)
6. Go to **Settings → API** → copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

---

## Step 2 — Set up GitHub — 5 minutes

1. Go to **github.com** → Sign up free → New repository
2. Name it: `vvc-ops` → Public → Create
3. Upload all files from this folder to the repository

---

## Step 3 — Deploy to Netlify — 5 minutes

1. Go to **netlify.com** → Sign up free (use GitHub login)
2. Click **Add new site → Import from Git → GitHub → vvc-ops**
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
4. Before deploying, go to **Site settings → Environment variables** → Add:
   - `REACT_APP_SUPABASE_URL` = your Project URL from Step 1
   - `REACT_APP_SUPABASE_ANON_KEY` = your anon key from Step 1
5. Click **Deploy site** — wait ~3 minutes
6. Your live URL will be something like `vvc-ops.netlify.app`
7. Optional: Go to **Domain settings** → add custom domain

---

## Step 4 — First login

1. Open your Netlify URL on laptop or phone
2. Login with the email/password you created in Supabase
3. Go to **Settings** → enter your Claude API key, Gemini API key, bKash/Nagad numbers
4. You're live!

---

## How to update the app

1. Edit any file in GitHub (click the file → pencil icon → edit → commit)
2. Netlify auto-deploys in ~2 minutes
3. Refresh your browser — done

---

## Add to phone home screen (Android)

1. Open your Netlify URL in Chrome on your Android phone
2. Tap the 3-dot menu → "Add to Home screen"
3. It installs like an app — works offline for viewing

---

## Support

- Supabase dashboard: view/edit all your data at supabase.com
- Netlify dashboard: manage deployments at netlify.com
- All case data, invoices, expenses stored securely in Supabase
