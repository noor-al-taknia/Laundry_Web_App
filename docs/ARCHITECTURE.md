# Architecture and data ownership

## Service map

```text
office-portal ─┐
               ├─ same-origin BFF / API gateway ─ identity-service
admin-portal ──┘                              ├─ settings-service
                                              ├─ catalog-service
                                              ├─ customer-service
                                              ├─ order-service ──┐
                                              └─ expense-service ├─ events → reporting-service
                                                                └─ events → notification-service
```

The gateway validates the browser JWT, adds trusted user, tenant and role claims
to internal requests, strips browser-supplied copies of those headers, and calls
allowlisted service bindings. Each service still authorizes every operation.

## Ownership

| Repository | Owns | Must not own |
|---|---|---|
| identity-service | users, staff identity/employment profiles, refresh sessions, grants | orders/catalog |
| settings-service | shops, branches, VAT/invoice identity | users |
| catalog-service | categories, service items, prices | invoice lines |
| customer-service | customer master and customer events | totals |
| order-service | sequences, orders, assigned staff, staff-debt ledger, snapshots, audit/outbox | live prices |
| expense-service | expenses and expense outbox | report aggregates |
| reporting-service | projections, metrics, event inbox | source writes |
| notification-service | per-admin activity notifications, unread state, event inbox | order/expense source records |

Every extracted owned table contains `tenant_id`. IDs are globally unique
strings so events can cross database boundaries safely.

## Order flow

1. Office sends item IDs, quantities, customer input and payment input.
2. Order obtains authoritative catalog prices and customer/settings snapshots.
3. One transaction allocates token/invoice sequences and writes the order,
   assigned staff, optional staff-funded company receivable, lines, audit event and outbox event.
4. The complete immutable invoice snapshot returns for printing.
5. Outbox delivery retries until Reporting accepts the event.
6. Reporting records the event ID before updating projections, making replay
   idempotent.
7. Staff-authored business events are also delivered to Notification, which
   creates one recipient-isolated notification for each active administrator.

Reporting is eventually consistent. Token lookup and invoice reprint use Order
directly and remain strongly consistent.

## Notification flow

The runnable compatibility API writes bounded plain-text notifications after a
validated staff mutation. In the extracted architecture, Order, Expense and
Identity/Permission publish outbox events; Notification consumes each event
once through its event inbox. Admin polling is recipient-scoped and indexed by
tenant, user, unread state and time. Mark-read mutations can affect only the
authenticated recipient.

## Evolution rules

- Use versioned routes and additive contract changes first.
- Publish contracts with semantic versions; portals pin compatible versions.
- Use expand/migrate/contract database changes.
- Communicate by API/events, never another service's database.
- Log correlation, tenant, actor and event IDs.
- Health proves process availability; readiness proves dependencies work.
- Use timeouts, bounded jittered retries and idempotency keys on mutations.

## Responsive and language behavior

Both portals support `en`/`ar`, persist the selected locale, set document
direction per portal, and use RTL-safe alignment/positioning. Arabic uses an
Arabic-capable system font stack. Admin navigation is full width on desktop,
compact on tablet and a focusable slide-out drawer on mobile. Dense tables use
contained horizontal scrolling so controls never overflow the viewport.
