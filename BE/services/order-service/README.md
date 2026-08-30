# Order service

Owns daily token/invoice sequences, order aggregates, immutable line snapshots,
payment state, audit events, and a transactional outbox. Tokens follow
`T-YYMMDD-NNNN` and are unique within each tenant.

API: `POST /v1/orders`, `GET /v1/orders?token=…`, paginated `GET /v1/orders`,
`PATCH /v1/orders/:id/payment`, `GET /v1/orders/:id`, health/readiness.

