# Customer service

Owns customer master data and change events. Orders reference a customer ID but
retain customer name/contact snapshots, so historical invoices are stable if
the customer record later changes.

API: search/CRUD `/v1/customers`, `GET /v1/customers/:id/purchases` through the
reporting service, `GET /health`, `GET /ready`.
