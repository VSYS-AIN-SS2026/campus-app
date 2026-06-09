# Deployment & status monitoring

This directory holds the droplet deployment stack: the campus-app frontend plus
a self-hosted **Uptime Kuma** instance that monitors the **database** (Supabase)
and the **client server** (this frontend), and feeds the in-app status banner.

## Stack

`docker-compose.yml` runs two containers on a shared docker network:

| Service | Image | Role |
|---|---|---|
| `campus-app` | `ghcr.io/vsys-ain-ss2026/campus-app:latest` | nginx serving the SPA (port `8080` on host) |
| `uptime-kuma` | `louislam/uptime-kuma:1` | monitoring + public status page (data in the `uptime-kuma-data` volume) |

## Deploy / update

`restart.sh` on the droplet should run, from this directory:

```bash
docker compose pull
docker compose up -d
```

(Previously it was a single `docker run` for the frontend — switch it to the two
lines above so Uptime Kuma comes up alongside the app and persists across
restarts.)

## Front proxy

TLS is terminated by the existing front proxy on the droplet. Add a vhost for the
status subdomain pointing at the Kuma container, e.g. nginx:

```nginx
server {
    server_name status.<your-domain>;
    # ... your existing TLS config ...
    location / {
        proxy_pass http://127.0.0.1:3001;   # or the uptime-kuma container/upstream
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;   # Kuma uses websockets
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

The app domain keeps pointing at `campus-app` (host port `8080`). The browser's
health poll hits `/api/status-page/...` on the **app** domain, which the app's
own nginx forwards to Kuma over the docker network — no extra proxy rule needed.

## First-run: configure Uptime Kuma

Open `https://status.<your-domain>` and create the admin account. Then add three
monitors and a public status page.

### Monitors

1. **Frontend (Client-Server)** — type `HTTP(s)`
   - URL: `https://<app-domain>/`
   - Accepted status codes: `200`

2. **Supabase DB/REST** — type `HTTP(s)`
   - URL: `https://yemmuitnxoyhxdsbfcfb.supabase.co/rest/v1/`
   - Header: `apikey: <SUPABASE_ANON_KEY>`
   - Accepted status codes: `200-299`
   - Exercises PostgREST → Postgres, the exact path the browser uses.

3. **Supabase Auth** (optional) — type `HTTP(s)`
   - URL: `https://yemmuitnxoyhxdsbfcfb.supabase.co/auth/v1/health`
   - Accepted status codes: `200`

Set a check interval of ~60s and add a notification (email / Discord) on each
monitor so outages alert the team.

### Public status page

- Create a status page with slug **`campus`** (this is the default the client
  polls — keep it in sync with `VITE_STATUS_PAGE_SLUG`).
- Add the three monitors to it and publish it.

The client then reads:
- `https://<app-domain>/api/status-page/campus` — maps monitor **name → id**
- `https://<app-domain>/api/status-page/heartbeat/campus` — latest heartbeat per id

The banner matches monitors by name: the **DB** monitor name must contain
`supabase` or `db`, the **frontend** monitor name must contain `frontend`
(case-insensitive). Keep the names above and the banner works without code
changes.

## Limitation & upgrade path

Uptime Kuma runs on the same droplet as the app. If the **droplet itself** goes
down, the monitor goes down with it and cannot report a full frontend outage —
it reliably covers Supabase (external) and the database, which is the primary
goal. For true independent client-server monitoring, add an **external probe**
later (a second small VPS, the HTWG runner box, or a free external uptime
service) pointing at `https://<app-domain>/`.
