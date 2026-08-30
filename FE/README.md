# Frontend

This independently runnable frontend composes `office-portal` at `/` and `admin-portal` at `/admin`. Browser API calls go through the same-origin proxy in `app/api` to the backend on port 4000.

```bash
npm install
npm run dev
```

The server listens on all interfaces at port 3000. Override the backend for another environment with `BACKEND_API_URL`. Run `npm run ci` before merging.
