# Laundry Operations Platform

Production-oriented bilingual laundry POS and administration system. The source is physically divided into a frontend tree and a backend tree so they can run in separate terminals and later become separate repositories.

## Folder layout

```text
FE/
  office-portal/       Counter sales, printing, expenses and collections
  admin-portal/        Responsive owner/technical administration portal
  app/                 Frontend composition and backend proxy
  contracts/           Frontend API types
BE/
  platform-api/        Runnable compatibility API and database migrations
  services/            Eight independently owned target microservices
  contracts/           Backend contract package
app/                   Thin combined-host deployment adapter only
docs/                  Architecture, split and CSV guidance
```

Day-to-day development happens only in `FE/` and `BE/`. The small root `app/` adapter keeps the current single-site deployment compatible while the service extraction is completed.

## Run locally in two terminals

Requires Node.js 22.13 or later. Install once from the repository root:

```bash
npm install
```

Terminal 1 — backend:

```bash
cd BE/platform-api
npm run dev
```

Terminal 2 — frontend:

```bash
cd FE
npm run dev
```

Open:

- Office: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- Backend API: `http://localhost:4000` (normally not opened directly)

If a port is occupied, use the replacement URL printed by the terminal.

## Development credentials

| Role | Username | Password | Portal |
|---|---|---|---|
| Staff | `staff` | `Staff@123` | Office |
| Shop admin | `admin` | `Admin@123` | Admin |
| Technical super-admin | `superadmin` | `SuperAdmin@123` | Admin |

These are development seeds. Change every password and configure a private `JWT_SECRET` of at least 32 random bytes before production.

## Open from another device on the same Wi-Fi

Both development commands listen on `0.0.0.0`. Find the frontend terminal's **Network** URL, such as `http://192.168.8.192:3000`, and enter that URL in Chrome on the second device. For Admin, append `/admin`. Do not use `localhost` on the second device: it refers to that second device itself.

Both devices must be on the same non-guest Wi-Fi and the host firewall must allow Node.js. Keep both terminals open.

## Quality checks

```bash
npm run ci
```

This validates frontend types/lint/build, backend types/lint/tests/build, and the combined deployment build. GitHub Actions runs the same command on `main` and `Dev`.

## Documentation

- [Developer and user implementation guide](./IMPLEMENTATION.md)
- [Architecture and data ownership](./docs/ARCHITECTURE.md)
- [Repository split runbook](./docs/REPOSITORY_SPLIT.md)
- [CSV import rules](./docs/CSV_IMPORT.md)
- [Simple portal user guide](./docs/PORTAL_USER_GUIDE.md)
