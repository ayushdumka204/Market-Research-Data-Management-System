# NexGen Market Research — Project & Team Management System

This is a page-wise full-stack application starter for NexGen Market Research. It separates each screen and reusable component instead of placing all UI in `App.tsx`.

## Folder structure

```text
nexgen-project-operations/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── forms/Field.tsx
│   │   │   ├── layout/{Header,PageTitle,Sidebar,Toast}.tsx
│   │   │   ├── tables/DataTable.tsx
│   │   │   └── ui/{Button,EmptyState,Modal,StatusBadge}.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Projects.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── ProjectFiles.tsx
│   │   │   ├── SurveyData.tsx
│   │   │   ├── DataRecords.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── TeamWorkload.tsx
│   │   │   ├── TeamUsers.tsx
│   │   │   ├── Notifications.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/api.ts
│   │   ├── types/index.ts
│   │   ├── utils/format.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
└── backend/
    ├── scripts/create-admin.js
    ├── src/models.js
    ├── src/server.js
    ├── .env.example
    └── package.json
```

## Features included

- Role-aware authentication: admin, project leader and team member.
- Admin project creation and leader assignment.
- Project-wise team assignment and workload view.
- Tasks, daily work updates, leader approval and correction requests.
- Project files with permission-checked download and deletion.
- Survey instruments and data-record metadata, including spreadsheet import and CSV export.
- Notifications, basic audit trail, project delivery reports.
- Responsive compact UI, Inter font, slate/blue palette and persistent light/dark theme.
- MongoDB Atlas models, password hashing, JWT authentication, role checks, request size limits, file type/size checks, CORS and security headers.

## Existing deployment URLs

- Frontend: https://market-research-data-management-sys.vercel.app/login
- Backend: https://market-research-data-management-system.onrender.com
- Health check: https://market-research-data-management-system.onrender.com/api/health

These URLs are provided as configuration/reference only; this ZIP has not been deployed to them.

## Local setup

Prerequisites: Node.js 20+ recommended, MongoDB Atlas or a local MongoDB instance.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters. Set `CORS_ORIGINS` to the exact local and deployed frontend origins.
3. In a terminal: `cd backend`, `npm install`, then `npm run dev`.
4. Create the first administrator from `backend/`:
   `npm run create-admin -- "NexGen Admin" admin@example.com "Use-A-Long-Unique-Password"`
5. Copy `frontend/.env.example` to `frontend/.env`. Set `VITE_API_BASE_URL=http://localhost:5000/api` for local development.
6. In a second terminal: `cd frontend`, `npm install`, `npm run dev`.

## Deployment setup

- Render backend: configure `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `UPLOAD_DIR` and optional `MAX_FILE_SIZE_MB` as environment variables. Start command: `npm start`.
- Vercel frontend: set `VITE_API_BASE_URL=https://market-research-data-management-system.onrender.com/api`, then redeploy.
- CORS must include `https://market-research-data-management-sys.vercel.app` exactly.
- Never put MongoDB URI, JWT secrets, passwords or other secrets in Vercel's `VITE_` variables or commit `.env` files.

## Important operational notes

1. **Persistent uploads:** The included backend uses local disk storage for uploaded files. Render's ephemeral filesystem can lose files on redeploy/restart. For real production use, replace local disk uploads with persistent object storage (e.g. S3-compatible storage) before relying on the file archive.
2. **Spreadsheet import mapping:** Import rows should include a valid `project_id` field for each row; invalid or inaccessible project rows are skipped. Export downloads are generated client-side.
3. **Authentication:** JWT sessions expire after 12 hours. The logout route is client-side token removal; JWT revocation is not implemented.
4. **Scope:** The UI has core project/task/data workflows, but does not yet implement every advanced requirement such as multi-step project wizard, milestone-weighted progress calculation, versioned file replacement, comprehensive activity log screen, notifications polling, or automated deadline emails.
5. **Testing:** Review API route compatibility, run frontend `npm run build`, and test each role against a non-production database before deploying. This ZIP is not a security or production audit and no live deployment has been verified.
