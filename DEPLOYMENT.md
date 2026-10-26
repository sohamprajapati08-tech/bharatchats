# Bharat Chat - Deployment & Free-Tier Hosting Guide
# ભારત ચેટ - હોસ્ટિંગ અને ડિપ્લોયમેન્ટ ગાઇડ

This guide explains how to deploy Bharat Chat publicly using generous free-tier services.

---

## 1. Free-Tier Architecture Overview

| Component | Recommended Provider | Free Tier Specification | Cost / Limitations |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | **Vercel** or **Render Static** | Unlimited bandwidth, automatic SSL, CDN edge network | Free ($0). Fast worldwide CDN. |
| **Backend & WebSockets** | **Render.com** (Web Service) | 512 MB RAM, Node.js + WebSocket support | Free ($0). Sleeps after 15 min of inactivity; 30s cold start. |
| **Database** | **Neon.tech** or **Render PostgreSQL** | 0.5 GB storage, serverless PostgreSQL with branch support | Free ($0). Direct connection string (`DATABASE_URL`). |
| **Media / File Storage** | Local Disk or **Cloudinary / AWS S3 Free Tier** | 25 GB free storage / bandwidth | Free ($0). |
| **Android APK Compilation** | **GitHub Actions CI** | 2,000 free runner minutes / month | Free ($0). Auto-builds APK on git push. |

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Managed PostgreSQL Database (Neon or Render)
1. Go to [https://neon.tech](https://neon.tech) and create a free account.
2. Create a project named `bharatchat`.
3. Copy the PostgreSQL connection string:
   `postgresql://user:password@ep-something.neon.tech/bharatchat?sslmode=require`

### Step 2: Deploy Backend Web Service (Render.com)
1. Fork or push this repository to GitHub.
2. Sign in to [https://render.com](https://render.com).
3. Click **New +** -> **Web Service**.
4. Select your `bharatChat` repository.
5. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
6. Add Environment Variables:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Your Neon/Render PostgreSQL URL from Step 1)*
   - `JWT_ACCESS_SECRET`: *(Generate 64-char random string)*
   - `JWT_REFRESH_SECRET`: *(Generate 64-char random string)*
   - `CORS_ORIGINS`: `https://bharatchat.vercel.app,*`
7. Click **Deploy Web Service**. You will receive your public backend URL: `https://bharatchat-server.onrender.com`.

### Step 3: Deploy Frontend Web Application (Vercel)
1. Go to [https://vercel.com](https://vercel.com).
2. Click **Add New** -> **Project** -> Select `bharatChat` repository.
3. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy! Your app will be live at `https://your-app.vercel.app` with automatic HTTPS.

---

## 3. Free-Tier Limitations & Disclosures

1. **Render Free Tier Spin-Down**:
   - If no requests are received for 15 minutes, the backend service sleeps.
   - The first request after sleeping will take ~30 seconds to wake up (cold start). Once awake, it runs at full speed with real-time WebSockets.
2. **Neon Storage Quota**:
   - Free tier includes 500 MB of storage, which easily holds hundreds of thousands of chat messages and user profiles.
3. **No Hidden Costs**:
   - None of the services listed above require a credit card to deploy under free tier limits.
