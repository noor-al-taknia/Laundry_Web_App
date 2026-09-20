# Verification — 20 September 2026

Chrome portal checks passed: password visibility icons, simultaneous staff/admin sessions, rejection of staff access to admin notifications despite a forged scope header, independent logout, responsive layouts and hotel heading. These checks created no shop transactions.

All four repositories passed independent clean npm ci, lint, type checks, automated tests and production builds locally. Test counts: office 14, admin 1, backend 57, public website 3.

The public website passed Chrome checks at desktop, tablet and mobile widths, Arabic RTL and disabled-SMTP feedback. No real email was sent. Physical printer output requires testing with the shop printer.

Dependency audit: no high or critical advisories at verification time. Moderate transitive advisories remain (7 in each frontend, 8 in backend); review compatible updates regularly. Do not use npm audit fix --force blindly.

Local checks do not prove GitHub Actions completion or production readiness. SMTP credentials, HTTPS, durable edge rate limiting and deployment backups remain deployment configuration tasks.
