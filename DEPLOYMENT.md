# Deploying the web app

This guide covers the React web app (this repository). It needs the API running first; the
API's guide is `DEPLOYMENT.md` in `Booking-Management-System-Waseem-Salon`.

The web app is a static site: `npm run build` produces plain HTML, JavaScript and CSS in
`dist/`, which any web server or static host can serve. One build serves everyone:

| Address | Who uses it |
| --- | --- |
| `/login`, `/register` and the dashboard | Salon owners and their teams |
| `/book/<salon>` | Clients booking online (public) |
| `/manage/<link>` | Clients changing or cancelling a booking from their email (public) |
| `/platform` | You: the platform admin portal for managing every salon |

- [What you need](#what-you-need)
- [Build](#build)
- [Serve it with Nginx](#serve-it-with-nginx)
- [Other hosts](#other-hosts)
- [Updating](#updating)
- [Checks after deploying](#checks-after-deploying)
- [Troubleshooting](#troubleshooting)

## What you need

| | |
| --- | --- |
| Node.js | 20 LTS, only to build (not needed on the server that serves the files) |
| The API's address | e.g. `https://api.example.com/api` |
| A domain | e.g. `app.example.com`, with HTTPS |

The API has to know this address too. Set it on the API server, then restart the API:

```env
WEB_APP_URL=https://app.example.com      # links in emails
CORS_ORIGINS=https://app.example.com     # lets this site call the API
```

## Build

The API address is fixed into the build, so build once per environment (staging, production).

```bash
git clone <repository-url> salon-web
cd salon-web
npm ci
VITE_API_URL=https://api.example.com/api npm run build
```

On Windows PowerShell: `$env:VITE_API_URL="https://api.example.com/api"; npm run build`.
You can also put it in a `.env.production` file next to `package.json`:

```env
VITE_API_URL=https://api.example.com/api
```

> **Always set `VITE_API_URL`.** Without it the build falls back to the staging API
> (`https://stage-saloon.ikodestudio.com/api`), set in `src/config/constants.js`.

The result is in `dist/`: `index.html`, plus `assets/` whose file names change with every
build.

## Serve it with Nginx

Copy `dist/` to the server, for example to `/var/www/salon-web`:

```bash
rsync -a --delete dist/ user@server:/var/www/salon-web/
```

```nginx
server {
    server_name app.example.com;
    listen 443 ssl;
    # ssl_certificate ... (e.g. from certbot)

    root /var/www/salon-web;
    index index.html;

    # Every page (/calendar, /book/<salon>, /platform/...) is handled by the app itself.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # File names change with each build, so these can be cached for a year.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never cache the page itself, so visitors get a new release straight away.
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
}
```

The `try_files … /index.html` line matters: without it, opening or refreshing any address
other than `/` (a booking link, `/platform`, `/calendar`) gives a 404.

### Same domain for the site and the API (optional)

To serve both from `app.example.com`, add the API under `/api` in the server block above:

```nginx
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 2m;
    }
```

Then build with `VITE_API_URL=https://app.example.com/api`, and set the API's
`PUBLIC_API_URL=https://app.example.com/api` and `TRUST_PROXY=1`.

## Other hosts

Any static host works, provided every address falls back to `index.html`.

| Host | Setting |
| --- | --- |
| Netlify | Add `public/_redirects` containing `/*  /index.html  200`, then rebuild. |
| Vercel | `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` |
| Cloudflare Pages | Single-page app fallback is on by default. |
| S3 + CloudFront | Send 403 and 404 errors to `/index.html` with status 200. |

Set `VITE_API_URL` in the host's build settings (the build command is `npm run build`, and the
output folder is `dist`).

## Updating

```bash
git pull
npm ci
VITE_API_URL=https://api.example.com/api npm run build
rsync -a --delete dist/ user@server:/var/www/salon-web/
```

Deploy the API first when a release changes both, because a new web app may call API routes
that don't exist on the old API yet. Signed-in users keep their session across a release; the
next page they open loads the new version.

### This release

Nothing extra is needed beyond a normal update. It adds the plan picker after sign-up
(`/choose-plan`), Settings → Plan & billing, upgrade prompts for locked features, the booking
page designer, group bookings, memberships, and the platform portal at `/platform`. The
portal's first admin is created on the API server (`npm run platform:admin`); see the API's
`DEPLOYMENT.md`.

## Checks after deploying

1. Open `https://app.example.com` and sign in as a salon owner. The dashboard loads, and the
   browser console shows no CORS errors.
2. Refresh on `/calendar`. It reloads the calendar, not a 404 (checks the `index.html` fallback).
3. Open a salon's booking page, `/book/<salon>`, in a private window, where you're not signed in.
4. Open `/platform` and sign in with a platform admin.
5. Look up the build's API address in the browser's network tab; requests should go to your
   API, not the staging one.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| 404 when refreshing a page or opening a booking link | The server isn't falling back to `index.html` (`try_files`, or the host's rewrite rule). |
| Requests go to `stage-saloon.ikodestudio.com` | Built without `VITE_API_URL`. Rebuild with it set. |
| CORS errors in the console | The API's `CORS_ORIGINS` doesn't include this site's exact address. |
| Links in emails point to localhost or the wrong site | The API's `WEB_APP_URL`. |
| Users still see the old version after a release | `index.html` is being cached. Use the `no-cache` rule above, or purge the CDN. |
| Blank page, and the console says a `.js` file is missing | A visitor's tab was open during the release. Refreshing fixes it. Keep the previous `assets/` files on the server for a while (drop `--delete` from rsync) to avoid it. |
| `/platform` says "Invalid email or password" | No platform admin yet: run `npm run platform:admin` on the API server. |
