# Deploying Enterprise-AI for Free (GitHub-connected)

Your stack has 4 pieces. Here's the free, GitHub-repo-based service for each:

| Piece | Free service | Why |
|---|---|---|
| Vector DB (Qdrant) | **Qdrant Cloud** free cluster | 1GB free forever, managed |
| Postgres | **Neon** free tier | Serverless Postgres, doesn't expire, generous free limits |
| FastAPI backend | **Render** free web service | Auto-deploys from GitHub on every push |
| Expo web frontend | **Vercel** free tier | Auto-deploys static export from GitHub on every push |

Mobile builds (actual iOS/Android apps via EAS + app stores) are a separate, non-free path (Apple charges $99/yr, EAS free tier is limited) — this guide covers the **web** version of the Expo app, which is genuinely free.

**Order matters**: set up Qdrant and Neon first (steps 1–2), since the backend needs their URLs as environment variables.

---

## Step 1 — Qdrant Cloud (vector DB)

1. Go to https://cloud.qdrant.io and sign up.
2. Create a **free cluster** (1GB tier).
3. Once it's provisioned, copy:
   - The **cluster URL** (looks like `https://xxxxxxxx-xxxx-xxxx.cloud.qdrant.io`)
   - An **API key** (generate one from the cluster's dashboard)
4. Keep both handy — you'll set them as `QDRANT_HOST` (the full URL, including `https://`) and `QDRANT_API_KEY` in Render.

## Step 2 — Neon (Postgres)

1. Go to https://neon.tech and sign up (GitHub login works).
2. Create a new project → it gives you a connection string immediately, e.g.:
   ```
   postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require
   ```
3. Your app builds its own connection string from separate `POSTGRES_*` fields rather than one URL, and it uses the **asyncpg** driver. So instead of using Neon's string directly, split it into the pieces below (used in Step 3):
   - `POSTGRES_SERVER` = `ep-xxxx.region.aws.neon.tech`
   - `POSTGRES_USER` = `user`
   - `POSTGRES_PASSWORD` = `password`
   - `POSTGRES_DB` = `dbname`
   - You'll also need `?ssl=require` — Neon requires SSL. The cleanest way is to instead set the single override variable `SQLALCHEMY_DATABASE_URI` directly to:
     ```
     postgresql+asyncpg://user:password@ep-xxxx.region.aws.neon.tech/dbname?ssl=require
     ```
     (note: `asyncpg` uses `ssl=require`, not `sslmode=require` — drop the `sslmode` param Neon gives you and use `ssl=require` instead)

## Step 3 — Backend on Render

1. Go to https://render.com, sign up, and click **New → Web Service**.
2. Connect your GitHub account and pick the `Enterprise-AI` repo.
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Docker (Render will detect the `Dockerfile` automatically)
   - **Instance type**: Free
4. Add these **Environment Variables** in the Render dashboard:
   | Key | Value |
   |---|---|
   | `SQLALCHEMY_DATABASE_URI` | the Neon URI from Step 2 (asyncpg form) |
   | `QDRANT_HOST` | your Qdrant Cloud cluster URL (with `https://`) |
   | `QDRANT_API_KEY` | your Qdrant Cloud API key |
   | `GEMINI_API_KEY` | a key from https://aistudio.google.com/apikey |
   | `SECRET_KEY` | any long random string (used to sign JWTs) |
5. Deploy. Render builds the Docker image and starts it. Watch the logs — on first boot the app auto-creates all Postgres tables and the Qdrant collection itself (no manual migration step needed; there are no Alembic migration files in the repo yet, so `Base.metadata.create_all` on startup handles it).
6. Once live, note your backend URL, e.g. `https://enterprise-ai-xxxx.onrender.com`. Test it: open `https://enterprise-ai-xxxx.onrender.com/docs` — you should see the FastAPI Swagger UI.
7. **Auto-deploy**: Render redeploys automatically on every push to your default branch — this is already "GitHub-repo based" out of the box, nothing extra to configure.

⚠️ **Free-tier caveats to know about:**
- The service **spins down after ~15 min of inactivity** and takes 30–50s to wake up on the next request (first request after idle will be slow).
- Render's free plan has **no persistent disk**. Your code saves uploaded files to a local `uploads/` folder on disk — those files will be **wiped on every restart/redeploy**. The extracted text chunks and embeddings already stored in Postgres/Qdrant at upload time are unaffected, but "download original file" or "retry" on an old upload after a restart won't find the file. If this matters to you, the fix is swapping local disk storage for something like Cloudflare R2 (free tier) — happy to help with that if you hit it.

## Step 4 — Frontend (Expo web) on Vercel

Your `app.json` is already configured for static web export (`"output": "static"`), so this is straightforward.

1. Go to https://vercel.com, sign up with GitHub, **Add New → Project**, pick the same repo.
2. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npx expo export --platform web`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. Add an **Environment Variable**:
   | Key | Value |
   |---|---|
   | `EXPO_PUBLIC_API_URL` | your Render backend URL from Step 3, e.g. `https://enterprise-ai-xxxx.onrender.com` |

   This has to be set at **build time** (Expo bakes it into the static bundle), so if you ever change the backend URL, you need to redeploy the frontend, not just the backend.
4. Deploy. Vercel gives you a URL like `https://frontend-xxxx.vercel.app`.
5. **Auto-deploy**: like Render, Vercel redeploys on every push automatically.

## Step 5 — Verify end to end

1. Open the Vercel URL, register a user, log in.
2. Upload a small PDF, start a chat, ask a question about it.
3. If the first request is slow, that's Render's free instance waking up — normal.

## Troubleshooting quick reference

- **CORS errors**: shouldn't happen — `main.py` already allows all origins.
- **500 on startup / DB connection refused**: double check `SQLALCHEMY_DATABASE_URI` uses `postgresql+asyncpg://` (not `postgresql://`) and `ssl=require` (not `sslmode=require`).
- **Qdrant connection errors**: make sure `QDRANT_HOST` includes the `https://` scheme, and `QDRANT_API_KEY` is set — Qdrant Cloud rejects unauthenticated connections.
- **Gemini errors**: confirm the key starts with `AIza` and has Gemini API access enabled in Google AI Studio.
