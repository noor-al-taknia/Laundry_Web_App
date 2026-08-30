# Catalog service

Owns categories, category colors, service items, and effective-dated prices.
Order creation must request authoritative current prices from this service and
then persist immutable line snapshots.

API: `GET /v1/catalog`, CRUD `/v1/categories`, CRUD `/v1/items`, `POST
/v1/items/:id/prices`, `GET /health`, `GET /ready`.

