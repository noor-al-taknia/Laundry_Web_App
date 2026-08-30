# Repository split runbook

The folders are intended as ten repository roots: two portals, seven services,
and contracts.

## Order

1. Publish `contracts` as a private versioned package.
2. Extract Identity and configure JWT keys, gateway trust and tenant claims.
3. Extract Settings, Catalog and Customer; verify row counts and checksums.
4. Extract Orders and Expenses. Dual-write through an outbox during cutover;
   portals must not independently write old and new APIs.
5. Backfill Reporting, then begin event consumption.
6. Extract Office/Admin, replace preview-relative imports with the contracts/UI
   packages, and point BFF routes at service bindings.
7. Observe errors, event lag, token uniqueness and invoice sums before retiring
   the compatibility API.

## Preserve history

- Copy data; do not remove the source during verification.
- Freeze writes briefly or capture the final write delta.
- Compare tenant counts, total/VAT/balance sums and min/max timestamps.
- Sample invoices, stored line snapshots and VAT QR payloads.
- Keep a tested rollback route to the compatibility API.

## Per repository

- Copy one folder as repository root and create its lockfile.
- Add CI, branch protection, ownership and vulnerability scanning.
- Replace placeholder D1 IDs and set secrets outside Git.
- Apply migrations in local, staging and production order.
- Verify `/health` and `/ready`.
- Grant least-privilege service bindings and distinct production credentials.

