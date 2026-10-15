# NexGen Market Research Data Management System

A full-stack internal research management application for NexGen Market Research. Frontend and backend are separate root folders. Backend is **Node.js + Express**, database is **MySQL**.

## Features
- Admin and team-member accounts with role-based access
- Dashboard backed by live MySQL statistics
- Create, edit, list and (admin-only) delete research projects
- Create, edit, list and (admin-only) delete survey responses
- CSV import (up to 5,000 rows / 5 MB) and Excel export in the UI
- Reports with project/response summaries
- Light/dark theme switcher
- MySQL schema and optional sample records
- Password hashing with bcrypt, opaque random bearer tokens stored as SHA-256 hashes, prepared SQL statements, CORS allowlist, Helmet security headers and request limits

## Repository layout
- `frontend/` — React, TypeScript, Vite and Tailwind CSS
- `backend/` — Node.js 20+, Express REST API, MySQL driver and SQL scripts

## 1. Create the MySQL database
Create a MySQL 8-compatible database and a least-privilege application user at your MySQL provider. Import `backend/database/schema.sql` using the provider's SQL console or a MySQL client. Optionally import `backend/database/seed.sql` to add sample project and response records. Seed data is optional and contains no login credentials.

Example database names and user values are placeholders; use the credentials from your chosen MySQL host.

## 2. Run locally
Install Node.js 20 or newer and MySQL 8 or a compatible MySQL service.

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL connection details
npm install
npm run dev
```
The API runs on `http://localhost:8080` by default. Health check: `http://localhost:8080/api/health`.

Create the first admin account after configuring `.env`:
```bash
npm run create-admin -- admin@example.com "Your Name" "A-long-unique-password-12+"
```
The password must be at least 12 characters. Avoid putting real credentials in shell history on shared machines; use a private terminal and never commit `.env`.

### Frontend
In a second terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Set `VITE_API_BASE_URL=http://localhost:8080/api` in `frontend/.env`. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## 3. Deploy on Render
Render's managed relational database is PostgreSQL, not MySQL. To keep this project on MySQL, use an external MySQL-compatible provider and confirm it allows secure connections from Render. Use TLS/SSL when the provider supports it.

### Deploy backend as a Docker Web Service
1. Push this repository to GitHub.
2. In Render, create **New → Web Service**, connect the repository and choose **Docker** as the runtime.
3. Set the Dockerfile path to `backend/Dockerfile` (root directory can remain the repository root).
4. Add these environment variables in Render's dashboard:
   - `NODE_ENV=production`
   - `DB_HOST` — MySQL hostname
   - `DB_PORT=3306` (or the provider's port)
   - `DB_NAME` — database name
   - `DB_USER` — database user
   - `DB_PASSWORD` — database password
   - `DB_SSL=true` if required by your provider and its certificate chain is valid
   - `CORS_ORIGINS=https://YOUR-FRONTEND-DOMAIN`
   - `TOKEN_TTL_DAYS=7`
5. Render supplies `PORT`; the service listens on it. Once deployed, check `https://YOUR-BACKEND.onrender.com/api/health`.
6. Import `backend/database/schema.sql` into the external MySQL database before testing the API.

### Create the first admin account
Run the CLI script in a controlled environment with the same DB environment variables. You can do this locally with a secure `.env` configured for the production database, or use Render Shell if available for the service:
```bash
npm run create-admin -- admin@example.com "Admin Name" "A-long-unique-password-12+"
```
Do not create predictable demo passwords and do not expose the password in screenshots or logs.

### Deploy frontend as a Render Static Site
1. Create **New → Static Site** and connect the same repository.
2. Set root directory to `frontend`.
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Set `VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com/api` as a build-time environment variable.
6. Set the backend `CORS_ORIGINS` to the exact deployed frontend origin, then redeploy the backend if changed.

Use HTTPS for both services. Never put backend secrets in `frontend/.env` or any `VITE_` variable. `VITE_` values are public in the browser bundle.

## Roles
- **Admin:** dashboard, project/response operations, user management and destructive deletes.
- **Team:** view dashboard, create/edit projects and responses, import/export records and view reports; cannot delete projects/responses or manage accounts.

## CSV import format
Required headers: `project_id,respondent_code,response_date`. Optional headers: `channel,answers,notes`. `project_id` must reference an existing project. `response_date` uses `YYYY-MM-DD`. `answers` should be a JSON object string, for example `"{\"satisfaction\":5}"`. Duplicate respondent codes within the same project are skipped and returned as row errors.

## Before using real research data
- Configure database TLS and least-privilege credentials.
- Use a long unique database password and restrict database network access where possible.
- Back up the database and test restore procedures.
- Verify CORS uses only the exact frontend origin.
- Test role permissions, login/logout, CRUD, import edge cases and deployment health with non-sensitive sample data.
- The starter uses bearer tokens in browser local storage to match the current frontend; for higher-risk production use, consider a security review and an HttpOnly secure-cookie design.
