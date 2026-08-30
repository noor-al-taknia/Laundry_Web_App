# Laundry Operations Platform — implementation guide

Updated: 30 August 2026

## Office portal

The Office portal has no side navigation. Its top bar contains **Sales** and
**Expenses**, token search, and a profile menu.

Sales uses the complete screen: select/search a customer, choose a large
category button on the right, tap its category-colored service buttons, adjust
quantity/discount/received amount, select cash or card, and save. The server
reloads authoritative prices, calculates 15% VAT, stores immutable line
snapshots, derives paid/partial/unpaid, and allocates a token such as
`T-260830-0007`.

There is no onscreen bill preview. **Save & print** renders only the exact 80 mm
receipt into the browser print dialog. Every saved bill contains the VAT TLV QR.

Expenses displays today's entries in a table and provides an Add Expense form.
Staff can create/change only today's expenses. Historical access follows the
three-day/grant rules.

## Admin portal

`admin` is the shop owner. `super_admin` is reserved for the technical team.
Authorization is enforced by APIs, not by hidden navigation.

- Dashboard: sales, collections, expenses, net, cash/card mix and outstanding.
- Reports: pagination, sorting/filtering, PDF/Excel-compatible/CSV export.
- Expense history and void control.
- Category, item, effective price, customer, import, user, permission and shop
  setting CRUD.
- Customer purchase drill-down and audited order-payment changes.
- Super-admin-only platform and technical-account controls.

| Capability | Office staff | Admin | Super-admin |
|---|---:|---:|---:|
| Sales, print and token lookup | Yes | Yes | Yes |
| Today's expenses | Yes | Yes | Yes |
| Read today + previous two days | Yes | Yes | Yes |
| Older staff access | Explicit grant | All | All |
| Business CRUD/settings/reports | No | Yes | Yes |
| Technical accounts/platform | No | No | Yes |

Older staff order writes require `orders_history_write`; older reads require
`reports_history`.

## Architecture and integrity

The target uses database-per-service ownership; see `docs/ARCHITECTURE.md`.
The root Vinext app is a migration compatibility composition that runs the
complete implementation against one local D1 database. Root `app/api` routes
are not the final cross-service integration layer.

- Usernames, invoices and tenant-scoped tokens are unique.
- Tokens are date-scoped and use an atomic daily sequence.
- Category → item → effective-dated price is the catalog hierarchy.
- Orders own customer/catalog snapshots, so historical invoices never mutate.
- Money/status/method fields are constrained and updates use optimistic versions.
- Deletes of financial/linked data are void or deactivate operations.
- Order/Expense writes pair aggregate and outbox event in one transaction;
  Reporting deduplicates events with its inbox.
- Extracted service queries must always include tenant scope.

## Security

- PBKDF2-SHA-256 password hashes, random salt, 150,000 iterations.
- HS256 JWT, HttpOnly SameSite=Strict cookie, Secure over HTTPS, 8-hour expiry.
- JWT algorithm/type/expiry/role claims and current active user are verified.
- Mutations require same origin and prepared SQL bindings.
- Prices, VAT, status and balance are computed server-side.
- Only super-admin can grant or modify super-admin access.
- Production should add edge rate limiting, account backoff, secret rotation,
  central audit logs and super-admin MFA.

## Database and state

The transition schema is `db/schema.ts` with generated migrations in `drizzle/`.
Each backend owns `services/<name>/db/schema.ts`, `drizzle/`,
`drizzle.config.ts`, `wrangler.toml`, and local migration scripts. Never create
cross-service foreign keys; use IDs, APIs and events.

Zustand owns the Office section, active category, customer and sale cart. Only
the non-sensitive draft is session-persisted. Server data remains authoritative
and is refreshed after writes.

Both portals persist the `en`/`ar` choice and switch the portal root between LTR
and RTL. The Admin shell adapts from full navigation on desktop to compact
tablet navigation and a mobile drawer. Tables are contained and horizontally
scrollable on small screens, while cards/forms collapse to one column with
touch-size actions.

## Printing

Use 80 mm paper, 100% scale, no margins, browser headers/footers off and high
print density. Print CSS outputs only `#invoice-receipt` with black rules,
strong system fonts and a 30 mm QR.

## Quality and release

`npm run ci` runs types, lint, VAT/TLV/CSV/token tests and a production build.
Apply migrations before dependent code. Verify health/readiness, error rate,
event lag, token uniqueness and invoice totals during progressive rollout.
