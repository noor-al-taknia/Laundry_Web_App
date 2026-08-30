# Identity service

Owns users, password credentials, refresh sessions, portal roles, and granular
permission grants. Issues short-lived JWT access tokens with `tenant_id`,
`user_id`, and `portal_role` claims. Only this service stores password hashes.

API: `POST /v1/sessions`, `DELETE /v1/sessions/current`, `GET/POST/PATCH
/v1/users`, `GET/POST/DELETE /v1/grants`, `GET /health`, `GET /ready`.

