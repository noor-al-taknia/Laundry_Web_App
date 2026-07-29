# Laundry Web App

Production-oriented, database-backed laundry billing and administration for
shop owners and staff. It includes JWT authentication, role isolation, Saudi
VAT invoices with a TLV QR code, customers, effective-dated service pricing,
payment tracking, paginated reports, CSV imports, and PDF/Excel/CSV exports.

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the complete user manual,
architecture, security model, data relationships, API guide, and extension
instructions.

## Run locally

```bash
npm install
npm run dev
```

Open:

- This computer: `http://localhost:3000`
- Another device on the same Wi-Fi: use the Network URL printed by the command,
  for example `http://192.168.8.173:3000`

If the second device cannot connect, allow incoming Node.js connections in the
computer firewall and confirm both devices are on the same non-guest Wi-Fi.
Do not use `localhost` on the second device—there it refers to that device
itself.

Initial accounts:

- Admin: `admin` / `Admin@123`
- Staff: `staff` / `Staff@123`

Change both temporary passwords immediately.

## Validate

```bash
npm run ci
```

GitHub Actions runs type checking, ESLint, Vitest, and a production build on
pushes and pull requests to `main` and `Dev`.

## Production

Set a private `JWT_SECRET` containing at least 32 random bytes in the hosting
environment. Never commit it. Change both seeded passwords before real use.

## CSV imports

Sign in as admin, open **Import data**, choose the entity, and download its
template. Keep headers unchanged, save as UTF-8 CSV, preserve phone numbers as
text, use decimal prices without `SAR`, use `#RRGGBB` category colors, and keep
each file under 1,000 rows / 2 MB. Imports are validated and atomic; any bad or
duplicate row rejects the complete file.
