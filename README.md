# NexGen Market Research Data Management System

A full-stack internal research management application for NexGen Market Research. Frontend and backend are separate root folders. Backend: **Node.js + Express**. Database: **MongoDB Atlas**.

## Features
- Admin and team-member accounts with role-based access
- Dashboard backed by live MongoDB statistics
- Create, edit, list and (admin-only) delete research projects
- Create, edit, list and (admin-only) delete survey responses
- CSV import (up to 5,000 rows / 5 MB) and Excel export in the UI
- Reports with project/response summaries
- Light/dark theme switcher
- Password hashing with bcrypt, opaque random bearer tokens stored as SHA-256 hashes, Mongoose validation, CORS allowlist, Helmet security headers and request limits

## Repository layout
- `frontend/` — React, TypeScript, Vite and Tailwind CSS
- `backend/` — Node.js 20+, Express REST API, Mongoose models and admin setup script

## 1. Create MongoDB Atlas database
1. Open https://cloud.mongodb.com/ and create a project if needed.
2. Create a free/shared MongoDB cluster if the option is available for your account and region.
3. Under **Database Access**, create a database user with a strong password.
4. Under **Network Access**, allow the Render service to connect. For quick local testing, add your current IP. Avoid `0.0.0.0/0` for production unless you understand the security trade-off and use a dedicated least-privilege database user.
5. Click **Connect → Drivers**, choose Node.js, and copy the connection string.
6. Replace the username/password placeholders and include a database name, for example `nexgen_research`:

```text
mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/nexgen_research?retryWrites=true&w=majority
```

If your password contains reserved URL characters, percent-encode them. Never share or commit the connection string.

The application creates its collections and indexes through Mongoose when the API runs. There are no SQL files to execute.

## 2. Run locally
Install Node.js 20 or newer.

### Backend
```bash
cd backend
cp .env.example .env
```
Set `MONGODB_URI` in `backend/.env` to your Atlas connection string. Then run:

```bash
npm install
npm run dev
```

The API runs at `http://localhost:8080` by default. Health check: `http://localhost:8080/api/health`. It should return `{ "status": "ok", "database": "connected" }` after MongoDB connects.

### Create the first admin account
Run this from the `backend` folder after configuring `.env`:

```bash
npm run create-admin
```

Follow the prompts for email, full name and a password of at least 12 characters. The script creates the admin record in MongoDB. If the email already exists, use a different email or manage the existing account; do not create duplicate admins. Avoid putting real credentials in shell history and never commit `.env`.

### Frontend
Open a second terminal:

```bash
cd frontend
cp .env.example .env
```
Set this in `frontend/.env`:

```text
VITE_API_BASE_URL=http://localhost:8080/api
```

Then run:

```bash
npm install
npm run dev
```
Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## 3. Deploy backend on Render
1. Push the repository to GitHub. Ensure no `.env` file or secrets are committed.
2. In Render, select **New → Web Service** and connect the repository.
3. Choose **Docker** runtime. Use `backend/Dockerfile` as the Dockerfile path and keep the repository root as the Docker context.
4. Add these environment variables in Render:
   - `NODE_ENV=production`
   - `MONGODB_URI` — full MongoDB Atlas connection string
   - `CORS_ORIGINS` — exact frontend origin, e.g. `https://YOUR-PROJECT.vercel.app` (temporarily use `http://localhost:5173` for local development)
   - `TOKEN_TTL_DAYS=7`
5. In Atlas **Network Access**, configure access for the Render service. Render outbound IP ranges can vary by plan; consult the current Render networking details for your service. Do not assume the local computer IP is sufficient for Render.
6. Deploy and open `https://YOUR-BACKEND.onrender.com/api/health`. Confirm the response reports `database: connected`.

`render.yaml` is a starter template; review the service name and frontend origin before using it. The app listens on Render's supplied `PORT`.

## 4. Create admin account for production
The recommended approach is to run the admin script from a trusted local terminal with the production `MONGODB_URI` set in a private `backend/.env`, or use a secure Render Shell if available. Run:

```bash
npm run create-admin
```
Use a strong unique password. Do not place the password in screenshots, source code, frontend environment variables or logs. Remove the production URI from local files when finished and never commit `.env`.

## 5. Deploy frontend on Vercel
1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite**.
4. Build command: `npm run build` (Vercel will install dependencies; if not, use `npm install && npm run build`).
5. Output directory: `dist`.
6. Add the build-time environment variable:

```text
VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com/api
```

7. Deploy. Copy the exact Vercel origin and set it as `CORS_ORIGINS` on Render. Redeploy the backend after changing CORS.

Never put `MONGODB_URI`, passwords or other backend secrets in `VITE_` variables; frontend variables are public in the browser bundle.

## Roles
- **Admin:** dashboard, project/response operations, user management and destructive deletes.
- **Team:** view dashboard, create/edit projects and responses, import/export records and view reports; cannot delete projects/responses or manage accounts.

## CSV import format
Required headers: `project_id,respondent_code,response_date`. Optional headers: `channel,answers,notes`. `project_id` must be the MongoDB ObjectId of an existing project (copy it from the exported project ID column or database records). `response_date` uses `YYYY-MM-DD`. `answers` should be a JSON object string, for example `"{\"satisfaction\":5}"`. Duplicate respondent codes within the same project are skipped and returned as row errors.

## Before using real research data
- Use a strong, unique Atlas database password and restrict network access where possible.
- Enable/confirm TLS; MongoDB Atlas uses TLS for its standard SRV connection string.
- Back up the database and test restore procedures.
- Verify CORS uses only the exact frontend origin.
- Test role permissions, login/logout, CRUD, import edge cases and deployment health with non-sensitive sample data.
- The starter uses bearer tokens in browser local storage to match the current frontend; for higher-risk production use, consider a security review and an HttpOnly secure-cookie design.
