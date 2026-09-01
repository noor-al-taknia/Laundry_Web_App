# Notification service

Owns durable, per-recipient Admin notifications and read state. In the target
microservice topology it consumes staff business events from order, expense,
and identity/permission outboxes using an idempotent event inbox. The gateway
supplies authenticated tenant/user/portal-role claims over a private service
binding; this service must not be exposed directly to browsers.

API: `GET /v1/notifications`, `PATCH /v1/notifications/read`, health/readiness.
