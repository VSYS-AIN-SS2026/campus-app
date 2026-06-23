# Deployment & status monitoring

This directory holds the droplet deployment. It is split into **two independent
stacks** so monitoring survives an app outage:

- `docker-compose.yml` — the **campus-app** frontend (nginx serving the SPA).
- `monitoring/docker-compose.yml` — a self-hosted **Uptime Kuma** instance that
  monitors the **database** (Supabase) and the **client server** (this frontend),
  and feeds the in-app status banner.

Why two stacks? Uptime Kuma used to run next to the app and was reached *through*
the app's nginx. If the client container went down, the status path went down with
it — so the app could never report its own server as down. Now Kuma is deployed,
restarted, and reached independently, and the browser polls it directly on the
`status.<domain>` subdomain.

## Stacks

| Stack | Service | Image | Role |
|---|---|---|---|
| `deploy` | `campus-app` | `ghcr.io/vsys-ain-ss2026/campus-app:latest` | nginx serving the SPA (host port `8080`) |
| `deploy/monitoring` | `uptime-kuma` | `louislam/uptime-kuma:1` | monitoring + public status page (data in the `uptime-kuma-data` volume, host `127.0.0.1:3001`) |

## Deploy / update

The frontend `restart.sh` on the droplet runs, from this directory:

```bash
docker compose pull
docker compose up -d
```

CI only redeploys the frontend. Uptime Kuma is long-lived; bring it up once (and
after image upgrades) from the `monitoring/` directory:

```bash
cd monitoring
docker compose pull
docker compose up -d
```

## Front proxy

TLS is terminated by the existing front proxy on the droplet.

- **app domain** → `campus-app` (host port `8080`).
- **status.<domain>** → Uptime Kuma (`127.0.0.1:3001`).

The browser's health poll now hits Kuma **directly** on `status.<domain>`
(`VITE_STATUS_API_BASE`), cross-origin from the app domain. The status vhost must
therefore send a CORS header allowing the app origin. Example nginx:

```nginx
server {
    server_name status.<your-domain>;
    # ... your existing TLS config ...

    location / {
        # Allow the app origin to read the public status JSON cross-origin.
        # The client only does simple GETs, so no preflight handling is needed.
        add_header Access-Control-Allow-Origin "https://<app-domain>" always;

        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;   # Kuma uses websockets
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Set the client build var accordingly (CI variable / `.env`):

```
VITE_STATUS_API_BASE=https://status.<your-domain>/api/status-page
```

The app domain keeps pointing at `campus-app`. It no longer proxies anything to
Kuma — that decoupling is exactly what keeps the status banner working when the
client container is down.

## Migrating an existing single-stack droplet

If Kuma was previously running inside the `deploy` stack, its data lived in a
project-prefixed volume (e.g. `deploy_uptime-kuma-data`). The new `monitoring`
stack uses a fixed volume name `uptime-kuma-data`. To keep the admin account,
monitors and status page, copy the old volume into the new name once:

```bash
docker volume create uptime-kuma-data
docker run --rm \
  -v deploy_uptime-kuma-data:/from -v uptime-kuma-data:/to \
  alpine sh -c 'cp -a /from/. /to/'
```

Then `cd monitoring && docker compose up -d`. (If you don't mind reconfiguring,
just start the new stack and redo the first-run setup below.)

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

The client then reads, directly on the status subdomain:
- `https://status.<domain>/api/status-page/campus` — maps monitor **name → id**
- `https://status.<domain>/api/status-page/heartbeat/campus` — latest heartbeat per id

The banner matches monitors by name: the **DB** monitor name must contain
`supabase` or `db`, the **frontend** monitor name must contain `frontend`
(case-insensitive). Keep the names above and the banner works without code
changes.

## Limitation & upgrade path

Uptime Kuma runs on the same droplet as the app. Splitting the stacks means an
app-container outage no longer blinds the monitor, but if the **droplet itself**
goes down the monitor goes with it. It reliably covers Supabase (external) and the
database, and now also an app-container outage as seen by an already-open client
tab. For true independent client-server monitoring, add an **external probe**
later (a second small VPS, the HTWG runner box, or a free external uptime service)
pointing at `https://<app-domain>/`.
