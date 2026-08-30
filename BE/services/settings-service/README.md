# Settings service

Owns tenant shop identity, branches, invoice presentation settings, VAT rate,
timezone, and currency. Business admins manage shop settings; only super-admins
may create tenants or perform technical lifecycle operations.

API: `GET/PATCH /v1/shops/:id`, CRUD `/v1/branches`, technical tenant
lifecycle endpoints for super-admins, health/readiness.
