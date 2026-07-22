# ReLOL 😂 — Your 3-Minute Mood Booster

Turn today's frustration into a laugh, a fresh perspective, and one small action.

**Stack: React + Vite (Vercel) · Node/Express (Vercel) · Supabase PostgreSQL · Claude API**
All free. No credit card needed anywhere.

---

## Deploy in 4 steps (all free, ~20 minutes)

### Step 1 — Set up Supabase (free database)

1. Go to **[supabase.com](https://supabase.com)** → Create account (no card)
2. Click **New Project** → name it `relol` → set a database password → Create
3. Wait ~2 minutes for it to spin up
4. Go to **SQL Editor** (left sidebar) → paste the entire contents of `backend/src/db/schema.sql` → click **Run**
5. Go to **Project Settings → Database → Connection string → URI** → copy the URL  
   It looks like: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`

---

### Step 2 — Deploy Backend on Vercel (free)

1. Go to **[vercel.com](https://vercel.com)** → Sign up with GitHub (no card)
2. Click **Add New Project** → import `vsara54444/mood_booster`
3. Change **Root Directory** to `backend`
4. Add these **Environment Variables:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase connection string from Step 1 |
| `JWT_SECRET` | Any random string, e.g. `xK9mP2qR7nL4wZ8vB3cF6hJ1` |
| `JWT_REFRESH_SECRET` | A different random string, e.g. `aM5tY0uE2sD9gH7jN4kQ6rW8` |
| `ANTHROPIC_API_KEY` | Your key from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |
| `CORS_ORIGIN` | `*` (update after Step 3 with your frontend URL) |
| `JOKE_SIMILARITY_THRESHOLD` | `0.55` |

5. Click **Deploy** → copy the backend URL, e.g. `https://mood-booster-api.vercel.app`

---

### Step 3 — Deploy Frontend on Vercel (free)

1. In Vercel → **Add New Project** → import `vsara54444/mood_booster` again
2. Change **Root Directory** to `frontend`
3. Add one **Environment Variable:**

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://your-backend-url.vercel.app/api` (from Step 2) |

4. Click **Deploy** → copy the frontend URL, e.g. `https://mood-booster.vercel.app`

---

### Step 4 — Connect them (2 minutes)

1. Go to your **backend** Vercel project → Settings → Environment Variables
2. Update `CORS_ORIGIN` to your frontend URL: `https://mood-booster.vercel.app`
3. Go to **Deployments** → click the three dots on the latest deploy → **Redeploy**

✅ **Done!** Your app is live and shareable.

---

## Local development

```bash
# Backend
cd backend
cp .env.example .env    # fill in DATABASE_URL and other values
npm install
npm run dev             # starts on http://localhost:4000

# Frontend (separate terminal)
cd frontend
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:4000/api
npm install
npm run dev             # starts on http://localhost:5173
```

---

## Project structure

```
relol/
├── backend/
│   ├── api/index.js          ← Vercel serverless entry point
│   ├── src/
│   │   ├── server.js         ← Express app
│   │   ├── config/db.js      ← PostgreSQL pool (pg)
│   │   ├── db/schema.sql     ← Run once in Supabase SQL Editor
│   │   ├── middleware/auth.js
│   │   ├── routes/           ← auth, entries, community, dashboard, profile
│   │   └── services/         ← aiService, anthropicClient, similarityService, anonymizer
│   ├── vercel.json
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/            ← Home, StorySoFar, Relatable, Profile, Login, Signup, Privacy, Terms
    │   ├── components/       ← BottomNav, ResultCard, MoodSelector, CategoryChips, Toggle...
    │   ├── api/client.js     ← All API calls
    │   └── context/AuthContext.jsx
    ├── vercel.json
    └── package.json
```

---

## How the AI works

Every check-in runs two Claude API calls:

1. **Cleanup** — grammar fix, makes it concise, keeps every real detail
2. **Generation** — humor line (warm, about the situation, never mocks the user) + perspective + action

Before saving, the new joke is checked against the last 10,000 generated jokes using a
token-overlap similarity score. If too similar (>0.55), Claude is asked to try again (up to
3 times) with instructions to avoid the similar ones. This keeps the content feeling fresh.

---

## Cost estimate

| Service | Free tier | Paid if you exceed |
|---|---|---|
| Vercel (frontend) | Unlimited | — |
| Vercel (backend) | 100GB bandwidth, 100k invocations/month | ~$20/mo |
| Supabase | 500MB database, 2GB bandwidth | ~$25/mo |
| Anthropic API | Pay per use | ~$0.001 per check-in |

For the first few hundred users you'll stay on free tiers everywhere.
