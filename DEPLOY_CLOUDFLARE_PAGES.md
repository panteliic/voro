# Deploy Voro frontends to Cloudflare Pages

This deploys only the static web applications. The API, PostgreSQL, Redis, Socket.IO, and background dispatch worker remain on the Docker server and must be deployed before the apps can sign in or place orders.

## Before creating Pages projects

1. Add your domain to Cloudflare and point its nameservers to Cloudflare.
2. Decide the public API address. The examples below use `https://api.YOUR_DOMAIN`.
3. Deploy the backend and configure it to allow all four frontend origins through `CLIENT_URLS`.
4. In Auth0, configure the production callback and redirect URLs:

   ```text
   https://api.YOUR_DOMAIN/auth/auth0/callback
   https://YOUR_DOMAIN/auth/callback
   ```

## Create four Pages projects

Connect the GitHub repository in **Workers & Pages**. Create one project for each row. The repository root is the folder containing this file; set **Root directory** to `client` for every project.

| Pages project | Build command | Build output directory | Custom domain |
| --- | --- | --- | --- |
| `voro-customer` | `npm ci && npm run build:pages:customer` | `apps/customer-app/dist` | `YOUR_DOMAIN` |
| `voro-restaurant` | `npm ci && npm run build:pages:restaurant` | `apps/restaurant-app/dist` | `restaurant.YOUR_DOMAIN` |
| `voro-driver` | `npm ci && npm run build:pages:driver` | `apps/driver-app/dist` | `driver.YOUR_DOMAIN` |
| `voro-admin` | `npm ci && npm run build:pages:admin` | `apps/admin-app/dist` | `admin.YOUR_DOMAIN` |

Set `NODE_VERSION` to `22` in every project. For production builds, set these Pages environment variables:

```text
VITE_API_URL=https://api.YOUR_DOMAIN
VITE_AUTH0_GOOGLE_ENABLED=true
```

For customer and driver projects, also set `VITE_VAPID_PUBLIC_KEY` after browser push notifications are enabled. Do not put backend secrets, database passwords, JWT keys, or Auth0 client secrets in Pages variables: every `VITE_*` value is published into browser JavaScript.

## What is already prepared

Each app now has a Cloudflare Pages `_redirects` rule so direct visits to routes such as `/login` and `/auth/callback` load the SPA correctly. It also has `_headers` for the same browser security headers and immutable asset caching used by the Docker frontend.

After the first deployment, attach the custom domain from the Pages project **Custom domains** tab rather than creating a CNAME manually. Cloudflare then creates the correct DNS record.
