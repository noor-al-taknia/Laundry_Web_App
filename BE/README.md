# Backend

`platform-api` is the currently runnable backend composition. `services/` contains the independently owned target microservices and their own schema/migrations/configuration.

```bash
cd platform-api
npm install
npm run dev
```

The API listens on all interfaces at port 4000. Apply schema changes through generated Drizzle migrations and keep business authorization in APIs, not only in portals.

The target service set includes Identity, Settings, Catalog, Customer, Order,
Expense, Reporting, and Notification. Notification owns recipient-specific
staff activity alerts and consumes business events through an idempotent inbox.
