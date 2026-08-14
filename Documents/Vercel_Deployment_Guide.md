# Vercel Deployment Guide

I have configured your project for deployment on Vercel. Since you have a Frontend and a Backend in separate folders, the best approach is to deploy them as **two separate Vercel projects**.

## 1. Backend Deployment

1.  Push your latest changes to GitHub.
2.  Go to [Vercel Dashboard](https://vercel.com/dashboard) -> **Add New Project**.
3.  Import your repository `CEF345GROUP16`.
4.  **Configure Project**:
    - **Root Directory**: Edit and select `Backend`.
    - **Framework Preset**: Select `Other`.
    - **Build Command**: Leave empty (Vercel will run `npm install`).
    - **Output Directory**: Leave empty.
    - **Environment Variables**: Add your `.env` variables here:
      - `DB_HOST`
      - `DB_USER`
      - `DB_PASS`
      - `DB_NAME`
      - `JWT_SECRET`
      - `CORS_ORIGIN`: Set this to your **Frontend URL** (once deployed) or `*` for testing.
5.  Click **Deploy**.
6.  **Copy the Domain**: Once deployed, copy the new backend URL (e.g., `https://buildright-backend.vercel.app`).

## 2. Frontend Deployment

1.  Go to [Vercel Dashboard](https://vercel.com/dashboard) -> **Add New Project**.
2.  Import the **same repository** `CEF345GROUP16` again.
3.  **Configure Project**:
    - **Root Directory**: Edit and select `Frontend`.
    - **Framework Preset**: Vercel should auto-detect `Vite`.
    - **Build Command**: `npm run build`
    - **Output Directory**: `dist`
    - **Environment Variables**:
      - Add `VITE_API_URL` and set it to your **Backend URL** from step 1 (e.g., `https://buildright-backend.vercel.app`).
4.  Click **Deploy**.

## Configuration Files Added

I added `vercel.json` files to help Vercel understand your project structure:

- **Backend/vercel.json**: Configures the Express app to run as a Serverless Function.
- **Frontend/vercel.json**: Ensures that all routes (like `/login`, `/dashboard`) rely on `index.html` (Client-Side Routing).
