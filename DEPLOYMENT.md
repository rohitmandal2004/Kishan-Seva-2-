# Kishan Seva — Complete Deployment Guide

> **Three-tier production deployment**: Supabase (Backend/DB) → Render (ML Service) → Vercel (Frontend)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1 — Backend (Supabase)](#phase-1--backend-supabase)
4. [Phase 2 — ML Service (Render.com)](#phase-2--ml-service-rendercom)
5. [Phase 3 — Frontend (Vercel)](#phase-3--frontend-vercel)
6. [Phase 4 — Connect Everything](#phase-4--connect-everything)
7. [Phase 5 — Post-Deployment Checklist](#phase-5--post-deployment-checklist)
8. [Alternative Platforms](#alternative-platforms)
9. [Troubleshooting](#troubleshooting)
10. [Cost Summary](#cost-summary)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     PRODUCTION STACK                     │
├──────────────┬──────────────────┬────────────────────────┤
│   FRONTEND   │   ML SERVICE     │       BACKEND          │
│   (Vercel)   │   (Render.com)   │     (Supabase)         │
│              │                  │                        │
│  React+Vite  │  FastAPI+RF      │  PostgreSQL + Auth     │
│  PWA (SPA)   │  /predict_wait   │  RLS + RPCs + Realtime │
│  Clerk Auth  │  scikit-learn    │  Storage + Edge Fns    │
│              │                  │                        │
│  *.vercel.app│  *.onrender.com  │  *.supabase.co         │
└──────┬───────┴────────┬─────────┴───────────┬────────────┘
       │                │                     │
       │  VITE_ML_      │  VITE_SUPABASE_     │
       │  SERVICE_URL   │  URL / ANON_KEY     │
       └────────────────┴─────────────────────┘
```

**Data flow:**
1. User opens the Vercel-hosted frontend → authenticates with Clerk
2. Frontend reads/writes data to Supabase (PostgreSQL) via the JS client
3. For wait-time predictions, frontend calls the Render-hosted ML API
4. ML API logs predictions back to Supabase for analytics

---

## Prerequisites

Before you begin, ensure you have:

| Requirement | Where to get it |
|---|---|
| **GitHub account** | [github.com](https://github.com) |
| **Supabase account** (free) | [supabase.com](https://supabase.com) |
| **Clerk account** (free) | [clerk.com](https://clerk.com) |
| **Vercel account** (free) | [vercel.com](https://vercel.com) |
| **Render account** (free) | [render.com](https://render.com) |
| **Node.js 20+** (local) | [nodejs.org](https://nodejs.org) |
| **Python 3.11+** (local) | [python.org](https://python.org) |
| **Git** (local) | [git-scm.com](https://git-scm.com) |

### Push your code to GitHub first

```bash
git add -A
git commit -m "chore: prepare for production deployment"
git push origin main
```

---

## Phase 1 — Backend (Supabase)

Supabase provides the **PostgreSQL database**, **Row Level Security (RLS)**, **RPCs**, **Realtime**, and **Storage**. There is no separate backend server to deploy — Supabase IS the backend.

### Step 1.1 — Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - **Name**: `kishan-seva`
   - **Database Password**: Use a strong password (save it securely)
   - **Region**: Choose the closest to your users (e.g., `South Asia (Mumbai)`)
4. Click **Create new project** and wait ~2 minutes

### Step 1.2 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `supabase/complete_setup.sql` from your project
4. Copy the **entire contents** and paste into the SQL Editor
5. Click **Run** (▶)
6. You should see `Success. No rows returned` — this is correct

> **What this does:** Creates all tables (users, farmer_profiles, bookings, slots, procurement_centres, etc.), RPCs, RLS policies, triggers, and seed data.

### Step 1.3 — Apply Incremental Migrations (if needed)

If `complete_setup.sql` is already up to date with all migrations, skip this step.
Otherwise, run each migration file from `supabase/migrations/` **in order**:

```
20260904000000_initial_schema.sql
20260905000000_production_schema.sql
20260905000001_add_clerk_user_id.sql
20260906000000_backend_optimizations.sql
20260906000001_auth_fix.sql
20260906000002_fix_permissions_and_rpcs.sql
20260907000000_ml_tables.sql
20260907000001_strict_rls.sql
20260907000002_add_operational_timestamps.sql
20260912000000_auth_identity_refactor.sql
20260912000002_fix_overloaded_rpc.sql
20260912000003_add_reschedule_deadline.sql
20260913000000_clerk_jwt_rls.sql
20260913000001_fix_rpc_auth.sql
20260913000004_booking_concurrency_fix.sql
20260913000005_receipt_flags.sql
20260913000006_centre_feedback.sql
20260913000007_link_farmer_profile.sql
20260913000007_quality_disputes.sql
20260913000008_lock_users_role.sql
20260913000009_strict_clerk_id.sql
20260913000010_strict_rpc_identity.sql
20260913000011_remove_fake_defaults.sql
20260913000012_admin_farmer_approval.sql
20260914000000_registration_rpc.sql
20260914000001_link_or_fetch_farmer_profile.sql
```

### Step 1.4 — Collect Your API Keys

1. Go to **Settings → API** in your Supabase dashboard
2. Copy these values (you'll need them later):

| Key | Where to find | Example |
|---|---|---|
| **Project URL** | `URL` field | `https://wxmxiaiy.supabase.co` |
| **Anon/Public Key** | `anon` / `public` key | `eyJhbGci...` or `sb_publishable_...` |
| **Service Role Key** | `service_role` key | `eyJhbGci...` (⚠️ **KEEP SECRET**) |

### Step 1.5 — Configure Clerk as Third-Party Auth (Critical)

Kishan Seva uses **Clerk** for authentication and sends a **Clerk JWT** to Supabase for RLS.

1. Go to [clerk.com/setup/supabase](https://clerk.com/setup/supabase) and follow the integration guide
2. In **Clerk Dashboard → JWT Templates**, create a template named `supabase` with:
   ```json
   {
     "role": "authenticated",
     "aud": "authenticated",
     "email": "{{user.primary_email_address}}",
     "user_metadata": {
       "clerk_id": "{{user.id}}"
     }
   }
   ```
   > **Note:** Do NOT add `iss` or `sub` — Clerk sets those automatically as reserved claims.
3. Copy the **JWKS endpoint** from Clerk (format: `https://your-instance.clerk.accounts.dev/.well-known/jwks.json`)
4. In Supabase → **Settings → Authentication → JWT Settings**:
   - Add the Clerk JWKS endpoint under third-party providers
   - Or configure the JWT secret from Clerk

### Step 1.6 — Configure Supabase Auth URLs

1. Go to **Authentication → URL Configuration** in Supabase
2. Set **Site URL** to your future production domain (e.g., `https://kishan-seva.vercel.app`)
3. Add to **Redirect URLs**:
   - `https://kishan-seva.vercel.app`
   - `https://kishan-seva.vercel.app/**`
   - `http://localhost:5173` (for local development)

---

## Phase 2 — ML Service (Render.com)

The ML service is a **FastAPI** application that serves a trained **Random Forest** model for wait-time predictions.

### Step 2.1 — Train the Model Locally (One-Time)

Before deploying, you need a trained model file:

```bash
# Navigate to the ml-service directory
cd ml-service

# Create a virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Build the merged training dataset
python training/build_dataset.py

# Train the Random Forest model
python training/train_random_forest.py

# Verify the model was created
dir models\
# You should see:  rf_model.pkl  (~5 MB)  and  metrics.json
```

Expected output:
```
Loaded 1000 rows for training.
Model trained! MAE: 3.42 mins, R2: 0.89
Model saved to models/rf_model.pkl
```

### Step 2.2 — Deploy to Render.com (Recommended — Free Tier)

#### Option A: One-Click Blueprint Deploy

1. Go to [render.com/deploy](https://render.com/deploy)
2. Connect your GitHub repo
3. Render will detect the `ml-service/render.yaml` blueprint
4. Set the **Root Directory** to `ml-service`
5. Configure environment variables (see Step 2.3)
6. Click **Deploy**

#### Option B: Manual Setup

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `kishan-ml` |
| **Region** | Singapore (closest to India) |
| **Branch** | `main` |
| **Root Directory** | `ml-service` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free |

4. Click **Create Web Service**

### Step 2.3 — Set ML Service Environment Variables

In Render Dashboard → your service → **Environment**:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL from Phase 1 |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key from Phase 1 |
| `PYTHON_VERSION` | `3.11.9` |

### Step 2.4 — Upload the Trained Model

Since `.pkl` files are excluded from git (correctly), you need to include the model in deployment:

**Option A (Recommended for Render): Include model in deploy**

Temporarily un-ignore the model for the deployment commit:

```bash
# From the project root
git add -f ml-service/models/rf_model.pkl
git add -f ml-service/models/metrics.json
git commit -m "chore: include trained model for deployment"
git push origin main
```

> After deployment, you can remove these from tracking again if desired.

**Option B: Download at build time**

Add this to Render's **Build Command**:
```bash
pip install -r requirements.txt && python training/train_random_forest.py
```
This retrains the model from CSV data during each deploy.

### Step 2.5 — Verify ML Service is Running

After deployment, Render gives you a URL like `https://kishan-ml.onrender.com`.

1. Open `https://kishan-ml.onrender.com/` — should show:
   ```json
   {"service": "Kishan Seva ML Prediction Service", "status": "running", "version": "2.0.0"}
   ```
2. Open `https://kishan-ml.onrender.com/health` — should show:
   ```json
   {"status": "healthy", "model_loaded": true}
   ```
3. Open `https://kishan-ml.onrender.com/docs` — interactive Swagger UI for testing

**Save this URL** — you'll need it for the frontend in Phase 3.

> ⚠️ **Free tier note:** Render free services spin down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds. This is fine for SIH demos. Upgrade to a $7/month plan for always-on.

---

## Phase 3 — Frontend (Vercel)

The frontend is a **React + Vite** SPA with **PWA** support, deployed as static files.

### Step 3.1 — Deploy to Vercel (Recommended)

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Click **Import** next to your GitHub repository
3. Vercel auto-detects the Vite framework
4. **Do NOT change** the build settings — they're pre-configured in `vercel.json`:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Step 3.2 — Set Frontend Environment Variables

In Vercel → your project → **Settings** → **Environment Variables**, add:

| Variable | Value | Environment |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` or `eyJhbGci...` | Production |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` (use `pk_test_...` for staging) | Production |
| `VITE_ENABLE_DEMO_MODE` | `false` | Production |
| `VITE_ML_SERVICE_URL` | `https://kishan-ml.onrender.com` | Production |

> ⚠️ **Critical:** Set `VITE_ENABLE_DEMO_MODE` to `false` in production. When `true`, it allows anyone to switch roles without authentication.

### Step 3.3 — Deploy

1. Click **Deploy** in Vercel
2. Wait for the build to complete (~1-2 minutes)
3. Vercel gives you a URL like `https://kishan-seva.vercel.app`

### Step 3.4 — Custom Domain (Optional)

1. Go to **Settings → Domains** in your Vercel project
2. Add your domain (e.g., `kishan-seva.in`)
3. Follow the DNS configuration instructions (add CNAME record)
4. SSL is automatic via Let's Encrypt

---

## Phase 4 — Connect Everything

After all three services are deployed, wire them together:

### Step 4.1 — Update Clerk Allowed Origins

1. Go to **Clerk Dashboard → Settings → Domains**
2. Add your Vercel domain to the allowed origins:
   - `https://kishan-seva.vercel.app`
   - Your custom domain (if any)

### Step 4.2 — Update Supabase Redirect URLs

1. Go to Supabase → **Authentication → URL Configuration**
2. Update **Site URL** to: `https://kishan-seva.vercel.app`
3. Add to **Redirect URLs**:
   - `https://kishan-seva.vercel.app`
   - `https://kishan-seva.vercel.app/**`

### Step 4.3 — Verify End-to-End Flow

Test the complete flow:

| Step | What to test | Expected result |
|---|---|---|
| 1 | Open `https://kishan-seva.vercel.app` | Landing page loads with PWA prompt |
| 2 | Click "Farmer Login" → Sign up with Clerk | Redirects to Clerk auth → creates account |
| 3 | Complete farmer registration | Profile saved in Supabase `farmer_profiles` |
| 4 | Browse procurement centres | Map loads with Supabase centre data |
| 5 | Book a slot | Booking created in Supabase `bookings` |
| 6 | View live queue | Wait-time prediction appears (ML or heuristic) |
| 7 | Install PWA | App installs as standalone app on mobile |

---

## Phase 5 — Post-Deployment Checklist

### Security

- [ ] `VITE_ENABLE_DEMO_MODE` is set to `false` in production
- [ ] `.env` file is NOT committed to git (verify with `git status`)
- [ ] Supabase RLS policies are active on all tables
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the frontend
- [ ] Clerk publishable key is `pk_live_...` (not `pk_test_...`) in production
- [ ] CORS on the ML service is configured (currently allows `*` — tighten if needed)

### Performance

- [ ] Vercel caching headers are active (`Cache-Control: immutable` for `/assets/*`)
- [ ] PWA service worker is registering correctly
- [ ] Code splitting is working (check network tab for `vendor-clerk.js`, `vendor-charts.js`, etc.)
- [ ] ML service health endpoint responds < 500ms

### Monitoring

- [ ] Set up Vercel Analytics (free) → **Settings → Analytics → Enable**
- [ ] Set up Supabase alerts → **Settings → Alerts**
- [ ] Monitor Render logs → **Logs** tab in Render dashboard
- [ ] Check Supabase `ml_predictions` table for logged predictions

### Supabase Production Settings

- [ ] Enable **Email Confirmations** in Auth settings (optional for SIH demo)
- [ ] Set **Rate Limiting** appropriately
- [ ] Review **Database → Extensions** — disable unused ones
- [ ] Enable **Point-in-Time Recovery** (Pro plan, recommended for real production)

---

## Alternative Platforms

### Frontend Alternatives

#### Netlify (instead of Vercel)

A `netlify.toml` is already included in the project.

1. Go to [netlify.com](https://www.netlify.com/) → **Add new site** → **Import from Git**
2. Connect your GitHub repo
3. Netlify auto-reads `netlify.toml` for build settings
4. Add the same environment variables as in Phase 3.2
5. Click **Deploy site**

#### GitHub Pages (free, static only)

```bash
# Install gh-pages
npm install -D gh-pages

# Add to package.json scripts:
# "deploy": "npm run build && gh-pages -d dist"

# Deploy
npm run deploy
```
> Note: GitHub Pages doesn't support environment variables at build time — you'd need to hard-code values or use a CI build step.

### ML Service Alternatives

#### Railway.app

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Set Root Directory to `ml-service`
3. Railway auto-detects Python + `requirements.txt`
4. Add environment variables
5. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

#### Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Navigate to ml-service
cd ml-service

# Launch (creates fly.toml)
fly launch --name kishan-ml --region maa  # maa = Chennai, India

# Set secrets
fly secrets set VITE_SUPABASE_URL=https://your-project.supabase.co
fly secrets set VITE_SUPABASE_ANON_KEY=your-anon-key

# Deploy
fly deploy
```

#### Docker (any cloud / VPS)

A `Dockerfile` is included in `ml-service/`:

```bash
cd ml-service

# Build
docker build -t kishan-ml .

# Run locally
docker run -p 8000:8000 \
  -e VITE_SUPABASE_URL=https://your-project.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your-anon-key \
  kishan-ml

# Test
curl http://localhost:8000/health
```

Deploy the Docker image to **Google Cloud Run**, **AWS ECS**, **Azure Container Apps**, or any VPS.

### Backend Alternatives

Supabase is the only supported backend for this project. The frontend, RLS policies, RPCs, and migrations are all tightly coupled to Supabase's PostgreSQL + PostgREST + Realtime stack.

If you need to self-host Supabase, see: [supabase.com/docs/guides/self-hosting](https://supabase.com/docs/guides/self-hosting)

---

## Troubleshooting

### Frontend Issues

| Problem | Solution |
|---|---|
| **Blank page after deploy** | Check Vercel build logs. Ensure all `VITE_*` env vars are set. |
| **404 on page refresh** | Verify `vercel.json` rewrites rule: `"/(.*)"` → `/index.html` |
| **Clerk login fails** | Ensure `VITE_CLERK_PUBLISHABLE_KEY` is set and domain is whitelisted in Clerk |
| **"Supabase not configured"** | `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing or has the placeholder value |
| **PWA not installing** | Must be served over HTTPS (Vercel does this automatically) |
| **Maps not loading** | Leaflet tile server may be slow — this is an external dependency |

### ML Service Issues

| Problem | Solution |
|---|---|
| **"Model could not be loaded"** | `rf_model.pkl` is missing. Either push it to git or retrain during build. |
| **CORS error** | Verify `CORSMiddleware` is configured in `app/main.py` (already done) |
| **503 after idle** | Free-tier Render spins down after 15 min. First request takes ~30s to cold-start. |
| **Import errors** | Ensure `requirements.txt` includes all dependencies (`fastapi`, `uvicorn`, `scikit-learn`, etc.) |
| **Port binding error** | Use `$PORT` env var (Render sets this automatically). Don't hardcode `8000`. |

### Supabase Issues

| Problem | Solution |
|---|---|
| **RLS blocking queries** | Run `SELECT * FROM pg_policies;` to inspect. Ensure Clerk JWT is being sent. |
| **RPC not found** | Run all migration files in order. Check `supabase/complete_setup.sql`. |
| **"permission denied"** | Verify RLS policies grant access to the `authenticated` role with correct `clerk_id` claims. |
| **Realtime not working** | Enable Realtime on the specific table in Supabase → Database → Replication. |
| **Connection limit reached** | Free tier: 500 connections. Enable connection pooling in project settings. |

---

## Cost Summary

| Service | Free Tier | Paid Upgrade |
|---|---|---|
| **Supabase** | 500 MB DB, 1 GB file storage, 50K monthly active users | $25/month Pro plan |
| **Vercel** | 100 GB bandwidth, unlimited deploys | $20/month Pro plan |
| **Render** | 750 hours/month, sleeps after 15 min idle | $7/month for always-on |
| **Clerk** | 10,000 MAU, unlimited orgs | $25/month Growth plan |
| **Total (Free)** | **$0/month** — perfect for SIH 2026 demo | ~$77/month for production |

---

## Quick Reference — All URLs

After deployment, bookmark these:

| Service | URL |
|---|---|
| **Frontend (Live App)** | `https://kishan-seva.vercel.app` |
| **ML Service** | `https://kishan-ml.onrender.com` |
| **ML API Docs** | `https://kishan-ml.onrender.com/docs` |
| **ML Health Check** | `https://kishan-ml.onrender.com/health` |
| **Supabase Dashboard** | `https://supabase.com/dashboard/project/YOUR_PROJECT_REF` |
| **Clerk Dashboard** | `https://dashboard.clerk.com` |
| **Vercel Dashboard** | `https://vercel.com/dashboard` |
| **Render Dashboard** | `https://dashboard.render.com` |
| **GitHub CI/CD** | `https://github.com/rohitmandal2004/Kishan-Seva/actions` |

---

## File Reference — Deployment Config Files

| File | Purpose |
|---|---|
| `vercel.json` | Vercel SPA routing, caching, security headers |
| `netlify.toml` | Netlify SPA routing, caching, security headers |
| `ml-service/Dockerfile` | Docker container for the ML service |
| `ml-service/.dockerignore` | Excludes dev files from Docker image |
| `ml-service/render.yaml` | Render.com Infrastructure-as-Code blueprint |
| `ml-service/.env.example` | ML service environment variable template |
| `.env.example` | Frontend environment variable template |
| `.github/workflows/ci.yml` | GitHub Actions CI pipeline |
| `supabase/config.toml` | Supabase local development config |
| `supabase/complete_setup.sql` | Full database schema + RPCs + RLS + seeds |
