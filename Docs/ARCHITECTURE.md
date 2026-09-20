# Repository architecture

| Folder | Purpose | Local URL |
|---|---|---|
| Laundry_Web_Portal | Staff / office billing | http://localhost:3000 |
| Laundry_Web_Admin_Portal | Owner administration | http://localhost:3001 |
| Laundry_Web_Portal_BE | API and database | http://localhost:4000 |
| Laundry_Web_App | Public shop website | http://localhost:3002 |


## Data flow

Office browser → office same-origin proxy → platform API → D1. Admin follows the same pattern with a separate cookie/audience. The public website reads only the explicit public catalog projection. SMTP is server-side in the website. No frontend has a database binding.

Each repository has its own lockfile, environment template and CI. No source import may point outside its repository. Copies of frontend contracts/shared operations are versioned in their own repositories; coordinate API contract changes across releases. Publishing these as a shared versioned package is a future option, not a runtime dependency now.

The backend's service folders describe future extraction boundaries. The present platform API keeps invoice, ledger, notification and audit writes in atomic D1 batches. Splitting those writes into separate deployed services requires an outbox/idempotent messaging design first; do not pretend current transactions cross service boundaries.

## Security boundaries

JWTs are signed with a required configured secret. Office/admin audiences and cookies are distinct. Admin authentication rejects staff users; protected operations reload the user's active role from the DB. User-specific capabilities and date windows are checked by the API, not just by hidden buttons.

Hotels and walk-in billing use separate tables. Monetary values, optimistic versions, request keys and immutable invoice/audit records protect integrity. Migration 0007 preserves legacy monthly invoices and enables new per-delivery invoices.

Public contact messages are validated and sent as plain text, using a fixed configured sender and recipient with the visitor as Reply-To. No credentials are client-exposed. Deploy behind HTTPS and trusted ingress with durable rate limiting, monitoring and encrypted backups.

## Local state and migration

The original active shop database is preserved when moved to the backend's ignored .wrangler folder. Old monorepo files and attachments are archived outside the four-folder parent. Never commit that archive. Existing accounts retain their passwords; no customer data is shipped in repository seed files.

