# ReLOL 😂 — Laugh off the small stuff

ReLOL is a mobile-first web app that turns one daily frustration, annoyance, or tired moment
into a short, kind **humor reframe + perspective + practical action** — a "3-Minute Mood
Booster" you do once a day. It's built for working professionals, parents, students, and
anyone dealing with everyday stress, designed to feel like a wellness app with a sense of humor.

This repo contains two independent projects:

```
relol/
├── frontend/   React + Vite + Tailwind mobile-first web app
├── backend/    Node.js + Express API, MSSQL database
└── docs/       Product notes
```

---

## How the core flow works

1. User opens the app once a day and picks a prompt: *"What frustrated you today?"* / *angry* /
   *upset* / *tired* / *funny*, then writes a short entry and picks a mood (1–5).
2. User taps the **ReLOL** button.
3. The backend calls the Claude API twice:
   - **Cleanup pass** — fixes grammar, trims it down, keeps every real detail (no embellishing).
   - **Generation pass** — writes one humor line, one perspective, and one practical action,
     all scoped tightly to *not* mock the user and to stay workplace-appropriate.
4. Before saving, the new joke is compared against the **last 10,000 generated jokes**
   (`JokeHistory` table) using a token-overlap similarity score. If it's too similar
   (`JOKE_SIMILARITY_THRESHOLD`, default `0.55`), the backend asks Claude to try again
   (up to 3 attempts), explicitly telling it which recent jokes to avoid.
5. Result renders in a card under the button. The user can optionally share it anonymously
   to the **Relatable** community feed — names/companies are stripped by a second AI pass
   plus a regex backstop before anything is stored.

---

## Tech stack & why

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | Fast mobile-first dev, small bundle, easy to deploy as a static site |
| Backend | Node.js + Express | Simple, well understood, easy to debug |
| Database | **MSSQL** | Per your requirement — easy to debug with SSMS / Azure Data Studio, strong typing via stored schema |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) | Single API key powers cleanup, joke generation, and anonymization |
| Auth | JWT (access + refresh tokens), bcrypt password hashing | No extra infra required |

---

## Project setup

### 1. Backend

```bash
cd backend
cp .env.example .env     # fill in DB + JWT + ANTHROPIC_API_KEY
npm install
```

Create the database and run the schema once:

```sql
CREATE DATABASE ReLOL;
```

```bash
sqlcmd -S localhost -d ReLOL -i src/db/schema.sql
```

Run it:

```bash
npm run dev        # nodemon, auto-restart
# or
npm start
```

The API listens on `http://localhost:4000/api` by default. Health check: `GET /api/health`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env     # set VITE_API_BASE_URL if not localhost:4000
npm install
npm run dev
```

Open the printed local URL on your phone (same Wi-Fi) or in a mobile-width browser window —
the UI is designed mobile-first (max-width container, bottom tab bar, large tap targets).

### 3. Anthropic API key

Get a key at <https://console.anthropic.com/settings/keys> and put it in `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

No key is stored anywhere in the frontend — all AI calls happen server-side.

---

## API overview

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/entries/today` | Check if today's check-in is already done |
| POST | `/api/entries` | Submit today's entry → returns humor/perspective/action |
| GET | `/api/entries/history` | Paginated past entries |
| POST | `/api/community/share/:entryId` | Opt-in share to the anonymous feed |
| GET | `/api/community/feed` | Paginated anonymous feed |
| POST | `/api/community/feed/:postId/vote` | Vote: `funny` / `smile` / `not_funny` |
| GET | `/api/dashboard/summary` | Streak, mood trend, top categories |
| GET | `/api/dashboard/weekly` | Weekly report |
| GET | `/api/dashboard/monthly` | Monthly growth report |
| GET/PATCH | `/api/profile` | View/update settings |
| DELETE | `/api/profile` | Permanently delete account + personal data |

All routes except `/auth/*` and `/health` require `Authorization: Bearer <accessToken>`.

---

## Privacy, by design

- **Private by default.** Nothing is shared unless the user checks the box on that specific entry.
- **Anonymization before storage.** Shared content is rewritten to remove names, companies, and
  other identifiers (AI pass + regex backstop for emails/phones/handles/links) *before* it's
  written to `CommunityPosts`. The community feed never carries a `UserId`.
- **Account & data deletion.** `DELETE /api/profile` hard-deletes entries, streaks, votes, and
  refresh tokens, and disables the login row. Already-shared anonymous posts remain, since they
  never contained identifying data to begin with.
- See `frontend/src/pages/Privacy.jsx` and `Terms.jsx` (rendered as in-app tabs/pages).

---

## Design notes

Mobile-first, calm-but-funny "wellness app with a sense of humor": warm paper background, a
coral accent for humor, teal for grounded perspective, and a signature **dog-eared journal
card** used everywhere a result, history entry, or community post appears — it's meant to feel
like a page torn from a daily notebook, not a corporate dashboard. Typeface pairing: Fraunces
(display, has personality) + Inter (body) + Space Mono (small labels/streak numbers, stamped
feel).

---

## Deploying

This repo is *not* pushed to GitHub automatically — there's no GitHub access or API key
available in the environment this was built in. To publish it yourself:

```bash
cd relol
git remote add origin https://github.com/<your-username>/relol.git
git branch -M main
git push -u origin main
```

Suggested hosting:
- **Frontend** — Vercel/Netlify/GitHub Pages (`npm run build` → deploy `frontend/dist`).
- **Backend** — Render/Railway/Azure App Service (anything that runs Node + can reach your
  MSSQL instance). Azure SQL Database pairs naturally with MSSQL + Azure App Service if you
  want to keep everything in one cloud.
- Set `ANTHROPIC_API_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and DB credentials as environment
  variables/secrets on whichever host you pick — never commit `.env`.

---

## Assumptions made while building

- One check-in per calendar day (UTC date), enforced server-side.
- Similarity/dedupe uses a local token-overlap score rather than a paid embeddings API, to keep
  the project to a single Anthropic key (see comment in `backend/src/services/similarityService.js`
  for how to swap in Voyage AI embeddings later if you want smarter dedupe).
- Notification scheduling (the actual daily push/email) isn't wired to a delivery provider yet —
  the toggle and reminder time are stored (`Users.NotificationsOn`, `Users.ReminderTime`) and
  ready for a scheduler (e.g., a cron job + push service or email provider) to read from.
