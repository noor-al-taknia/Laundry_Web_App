# Admin portal

Business administration and analytics application. `admin` represents the shop
owner; `super_admin` is reserved for the technical/platform team. Both are
enforced by server authorization, not navigation visibility.

The portal owns no business tables. It consumes identity, settings, catalog,
customer, order, expense, and reporting service APIs.
