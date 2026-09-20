# Pearl Laundry — Public website

This repository now hosts the public laundry website. The former full application has been split into the three repositories listed below; prior Git history remains intact.

The bilingual responsive website displays services/prices and shop contact/location from the backend's read-only /api/public/shop endpoint. It never connects directly to the database or requests customer/staff records. When the API is unavailable, it shows an honest unavailable message instead of invented prices.

The message form sends to pearllaundrysupport@gmail.com. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in ignored .env.local, then set CONTACT_ENABLED=true. The form uses a three-second success/error toast. SMTP sending is disabled by default in `.env.example`. No real test email is sent by automated tests. Gmail typically requires an app password for a suitable enabled account; do not paste credentials into Git, documentation or chat.

Messages have size/format checks, an origin check, honeypot and a conservative single-process request cap. Production must also have durable rate limiting at the reverse proxy/WAF, HTTPS and appropriate email/DNS configuration. Multi-instance abuse protection is not provided by the in-memory cap.

Only the website runs at port 3002; it is not a billing portal.

## Local setup

Use Node.js 24 LTS and npm. Each repository installs and runs independently.

```sh
cd Laundry_Web_App
npm ci
npm run setup
npm run dev
```

Start the backend first, then the portals and website in separate terminals. BACKEND_URL is server-only and should point to the backend, normally http://127.0.0.1:4000.

| Folder | Purpose | Local URL |
|---|---|---|
| Laundry_Web_Portal | Staff / office billing | http://localhost:3000 |
| Laundry_Web_Admin_Portal | Owner administration | http://localhost:3001 |
| Laundry_Web_Portal_BE | API and database | http://localhost:4000 |
| Laundry_Web_App | Public shop website | http://localhost:3002 |


## Checks

```sh
npm run ci
```

GitHub Actions runs locked installation, type checking, lint, automated tests and a production build on Dev/main pushes and pull requests. A successful local build is not a deployment.

## Same Wi-Fi

Development servers bind to 0.0.0.0. On the other device use http://YOUR_MAC_LAN_IP:3000 (office), :3001 (admin), or :3002 (website), never that device's localhost. Allow these ports through the Mac firewall only on a trusted network. The backend URL stays server-side; browsers use their portal's proxy. Set NEXT_PUBLIC_OFFICE_URL and NEXT_PUBLIC_ADMIN_URL to the LAN URLs if using cross-portal links, then restart/rebuild. Use HTTPS for real deployments.

## Documentation and security

See Docs/ARCHITECTURE.md and Docs/PORTAL_QUICK_GUIDE.md. Keep .env.local, .dev.vars, .wrangler, backups and identity/customer data out of Git. Templates contain placeholders only. Rotate secrets and configure backups before production.
