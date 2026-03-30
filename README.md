# Attendance System

A modernized school attendance system using QR codes.

## Project Structure (Monorepo)

- `backend/` — NestJS API server (port 3001)
- `frontend/` — Next.js web app (port 3000)
- `apps/mobile/` — React Native (Expo) mobile app

## Tech Stack

- Frontend: Next.js + TypeScript + Tailwind CSS
- Mobile: React Native (Expo)
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- Authentication: JWT (HttpOnly cookies)
- Real-time: Socket.io
- Deployment: Docker on Railway

## Local Development

```bash
# Install all dependencies
npm install

# Run backend
npm run dev:backend

# Run frontend
npm run dev:frontend

# Run both
npm run dev
```

## Deploy to Railway (Monorepo)

This project deploys as **two separate Railway services** from one repo:

### 1. Create a Railway Project

In [Railway](https://railway.app), create a new project.

### 2. Add a PostgreSQL Database

Add a PostgreSQL plugin/service to your project.

### 3. Backend Service

- Click **"New Service" → "GitHub Repo"** → select this repo
- Go to **Settings → General → Root Directory** → set to `backend`
- Railway will auto-detect the `Dockerfile` and `railway.json`
- Add environment variables:
  - `DATABASE_URL` — reference the PostgreSQL service variable
  - `JWT_SECRET` — a secure random string
  - `CORS_ORIGINS` — your frontend Railway URL (e.g. `https://your-frontend.up.railway.app`)
  - Any other env vars your backend needs (`SENDGRID_API_KEY`, `TWILIO_*`, etc.)

### 4. Frontend Service

- Click **"New Service" → "GitHub Repo"** → select this repo
- Go to **Settings → General → Root Directory** → set to `frontend`
- Railway will auto-detect the `Dockerfile` and `railway.json`
- Add environment variables:
  - `NEXT_PUBLIC_API_URL` — your backend Railway URL (e.g. `https://your-backend.up.railway.app`)

### 5. Networking

- Both services get public URLs via Railway's **Settings → Networking → Generate Domain**
- The frontend proxies `/api/*` requests to the backend via Next.js rewrites

## Features

- Teacher dashboard with QR scanning
- Offline support
- Real-time updates
- Admin analytics
- Student portal
- Parent notifications