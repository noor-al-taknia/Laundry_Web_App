# Laundry Operations Platform — implementation guide

Updated: 1 September 2026

## Roles and authentication

JWT authentication uses an HttpOnly, SameSite=Strict cookie with an eight-hour expiry. Passwords use PBKDF2-SHA-256 with a per-user random salt and 150,000 iterations. Every API verifies the live user and role; navigation visibility is never treated as authorization.

- `office_staff`: sales, exact invoice printing, today's expenses and collections, and read-only collection history for today plus the previous two days.
- `admin`: shop-owner control of business data, settings, reports, approvals and staff password requests.
- `super_admin`: all admin rights plus technical accounts/platform controls.

Login inputs include a show/hide password control. A staff reset/forgot-password action creates an admin inbox request without revealing whether a username exists. An admin sets a temporary password or denies the request. Production should require the staff member to change the temporary password at first login.

In the Office login, Reset Password switches to a dedicated request mode containing only the username field. The password input and sign-in action stay hidden until the user returns to sign-in mode.

## Office functional flow

The Office portal deliberately has no side navigation. Its top-level tabs are **Sales**, **Expenses**, and **Collections**, with language and profile/logout controls.

Sales fills the screen with searchable customer selection, large category controls on the right, and large item controls whose color is consistent within a category. The server reloads authoritative prices, computes 15% VAT, stores invoice snapshots, and allocates date-scoped tokens such as `T-260830-0007`.

Every new bill also requires an active staff selection. Admin creates the staff login/profile and maintains mobile, passport number/validity, visa status/validity, and Iqama number/validity. The Office dropdown exposes only the name and mobile; passport, visa and Iqama fields remain in the authorized Admin portal.

Payment is presented as **Card/Cash**:

- Card requires the receiving account: `STC` or `ANB`.
- Cash records amount received and computed balance.
- Staff may mark a balance settled and allocate the settlement between staff money and drawer/wallet money. The API validates that settlement components cannot exceed the remaining balance.
- A non-zero **From staff** value automatically creates a company receivable linked to the exact staff member and order. Admin can review and settle this debt ledger; voiding an open test/order debt voids the corresponding receivable without deleting its audit trail.
- Paid, partial, and unpaid states are derived server-side.

The bill preview stays off the sales screen. Save & Print opens the browser print dialog and prints only the 80 mm invoice. Every invoice contains the Saudi VAT TLV QR, and the token is rendered with a heavy black border and bold type for quick recognition.

Expenses shows a daily table and an Add Expense form. Collections shows daily sales, collected amount, outstanding balance, token rows, payment edits, and audit-safe **Void**. Financial orders are never hard deleted.

## Time-limited staff permissions

Staff can write today's orders and expenses. They can read collections for today and the previous two days. For an older date or historical write:

1. The API returns `403` for the restricted operation.
2. Office creates a request for one exact task and resource: `collection_read` + date, `order_update` + order ID, or `expense_update` + expense ID.
3. Admin sees the request in **Approval inbox** and approves, denies, or revokes it.
4. Approval expires (the UI defaults to 24 hours) and authorizes only that resource/task pair.

The API checks both expiry and scope on every operation. A collection-read grant cannot modify an order, and an order grant cannot change any other order.

## Admin portal

The blue-and-white Admin portal is responsive across desktop, tablet, and mobile, including contained scroll for dense tables and touch-size controls. English and Arabic are available; Arabic switches portal direction to RTL.

The Admin shell is viewport-locked: its navigation remains fixed while only the active content pane scrolls. The selected Admin section is stored as a device-local preference and restored after refresh, with role validation falling back to Dashboard if the saved section is not authorized. Report filters remain open on desktop and start collapsed on tablet/mobile, where a Show/Hide Filters control exposes them on demand.

Admin capabilities include dashboard analytics; paginated/filterable reports; cash/card and STC/ANB classification; paid/partial/unpaid filtering; PDF/CSV/Excel-compatible export; category/item/effective-price CRUD; customer CRUD and purchase drill-down; expenses; users; shop identity/settings; CSV import; permission approvals; and staff password-reset fulfillment.

Report tables, details and exports include card receiving account, cash received, staff-funded amount, drawer/wallet-funded amount, and assigned staff. Admin payment CRUD uses the same fields and keeps the staff receivable ledger synchronized.

Only admin/super-admin can change shop name, address, contact, email and VAT number used on every bill. Super-admin-only operations remain isolated at the API.

## Data model and integrity

Category → service item → effective-dated price is the catalog relationship. Customer master records are referenced by orders, while each order keeps customer, shop, price and VAT snapshots so old invoices do not change when master data changes.

Order tokens, invoice numbers and usernames are unique. Money/status/method fields have database checks. Updates use optimistic versions to reject stale browser writes. Order events record payment changes and voids. Prepared statements, same-origin mutation checks and server-side calculations prevent browser values from becoming authoritative.

Zustand owns the Office section, active category, customer and cart draft. Only non-sensitive draft state is session-persisted; server data is fetched again after writes. The server/database remains the source of truth.

## Printing

Use an 80 mm roll, 100% scale, zero margins, browser headers/footers disabled and the printer's high-density mode. Print CSS isolates `#invoice-receipt`, uses strong black text/rules, an Arabic-capable system font stack and a clear QR. What appears in the print preview is the exact bill sent to the printer.

## Frontend/backend boundary

`FE/app/api/[...path]/route.ts` is a same-origin browser proxy to `http://127.0.0.1:4000` by default. It preserves secure cookies and avoids browser CORS complexity. The runnable backend is `BE/platform-api`; folders under `BE/services` define the final database-per-service boundaries and can be extracted gradually using `docs/REPOSITORY_SPLIT.md`.

## Release checklist

Run `npm run ci`, apply generated migrations before code, use production secrets, remove seed credentials, enable rate limiting/MFA/central audit retention, back up the database, and verify sample invoice totals plus QR payloads. Do not run forced dependency upgrades without reviewing breaking changes.
