# Expense service

Owns operating expenses, optimistic versions, void status, and expense events.
Office staff can write only today's records; admins can review and correct the
full authorized history.

API: paginated `GET /v1/expenses`, `POST /v1/expenses`, `PATCH
/v1/expenses/:id`, `POST /v1/expenses/:id/void`, health/readiness.
