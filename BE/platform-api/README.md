# Platform API

Compatibility API gateway/composition used while backend domains are extracted into separate deployable services. It owns the current D1 development database, JWT/session endpoints, business APIs and migration history.

```bash
npm install
npm run dev
npm run ci
```

Local URL: `http://localhost:4000`. This service is consumed through the frontend proxy and is normally not exposed directly to users.
