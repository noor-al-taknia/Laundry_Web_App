# Reporting service

CQRS read model populated idempotently from order and expense outbox events.
Owns denormalized projections for fast dashboards, token search, customer
purchase drill-down, pagination, and PDF/Excel/CSV exports.

API: `GET /v1/dashboard`, `GET /v1/reports/sales`, `GET
/v1/reports/expenses`, `GET /v1/customers/:id/purchases`, export endpoints,
health/readiness.

