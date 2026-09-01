# Admin portal

Business administration and analytics application. `admin` represents the shop
owner; `super_admin` is reserved for the technical/platform team. Both are
enforced by server authorization, not navigation visibility.

The portal owns no business tables. It consumes identity, settings, catalog,
customer, order, expense, and reporting service APIs.

The fixed top bar includes a persistent staff-activity notification center.
It polls the authenticated notification API, maintains unread state per admin,
and routes order, expense, permission, and password-request events to their
relevant workspace. Notification content is server-authored plain text and is
never accepted as authorization for the linked operation.
