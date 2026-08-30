# Laundry Operations Platform

A blue-and-white laundry point-of-sale and administration platform organized
around independently owned frontend and backend domains. This is a transition
workspace: it runs both portals against a compatibility API today, while every
target repository has its own folder, schema, migration, runtime configuration,
and README.

## Applications

| Folder | Purpose | Local address/port |
|---|---|---|
| `office-portal/` | Full-screen Sales and Expenses workspace | `http://localhost:3000/` |
| `admin-portal/` | Owner analytics, reports, CRUD and access control | `http://localhost:3000/admin` |
| `services/identity-service/` | JWT identities, roles and grants | `4101` after extraction |
| `services/catalog-service/` | Categories, items and effective prices | `4102` |
| `services/customer-service/` | Customer master data | `4103` |
| `services/order-service/` | Orders, unique tokens and invoice snapshots | `4104` |
| `services/expense-service/` | Operating expenses | `4105` |
| `services/reporting-service/` | Read models and analytics | `4106` |
| `services/settings-service/` | Shops, branches and invoice identity | `4107` |
| `contracts/` | Versioned API contracts | published package |

## Run locally

Requires Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for Office and `http://localhost:3000/admin` for
Admin. If 3000 is occupied, use the alternate port printed in the terminal.

Development accounts:

- Super-admin: `admin` / `Admin@123`
- Office staff: `staff` / `Staff@123`

Change both passwords and set a private `JWT_SECRET` of at least 32 random
bytes before production.

### Another device on the same Wi-Fi

The command listens on `0.0.0.0`. Open the Network URL printed by the terminal,
for example `http://192.168.8.192:3000`, on the other device. Do not use
`localhost` there. Both devices must use the same non-guest network, and the
host firewall must allow Node.js.

## Validate

```bash
npm run ci
```

Each extracted backend is independently runnable:

```bash
cd services/order-service
npm install
npm run db:migrate:local
npm run dev
```

Replace the placeholder D1 ID in `wrangler.toml` before deployment.

## Documentation

- [Implementation guide](./IMPLEMENTATION.md)
- [Architecture and ownership](./docs/ARCHITECTURE.md)
- [Repository split runbook](./docs/REPOSITORY_SPLIT.md)
- [CSV import rules](./docs/CSV_IMPORT.md)
