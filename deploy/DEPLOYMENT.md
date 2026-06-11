# Deployment runbook

How the droplet deployment works after splitting the app and monitoring into two
independent stacks. For the *why*, the monitor setup and the front-proxy/CORS
config, see [`README.md`](README.md).

## Layout on the droplet

```
/campus-app/
├── restart.sh                     # frontend deploy (run by CI)
└── deploy/
    ├── docker-compose.yml         # campus-app (frontend)
    └── monitoring/
        └── docker-compose.yml     # uptime-kuma (independent)
```

## Two stacks, two lifecycles

| Stack | Path | Deployed by | When |
|---|---|---|---|
| **Frontend** | `deploy/` | CI → `restart.sh` | every push to `main` |
| **Monitoring** | `deploy/monitoring/` | **manually** | once, then only on Kuma upgrades |

The split is deliberate: an app deploy must **never** bounce Uptime Kuma, so that
the status page keeps reporting — including during the app's own restart.

Both stacks use `restart: unless-stopped`, so after a droplet/daemon reboot Docker
brings every container back on its own. No boot script is needed.

## Frontend — automatic (CI)

On every push to `main`, the `Build & Publish Frontend Image` workflow builds the
image, pushes it to GHCR, then SSHes into the droplet and runs:

```bash
cd /campus-app && bash restart.sh
```

`restart.sh` (frontend only):

```bash
#!/usr/bin/env bash
set -euo pipefail

# Frontend only. Monitoring is an independent stack (deploy/monitoring) and is
# intentionally NOT touched here, so app deploys can't bounce Uptime Kuma.
cd "$(dirname "$0")/deploy"
docker compose pull
docker compose up -d
docker image prune -f   # drop the now-dangling old frontend image
```

### Deploy the frontend by hand

```bash
cd /campus-app/deploy
docker compose pull
docker compose up -d
```

## Monitoring (Uptime Kuma) — manual

Uptime Kuma is long-lived. Bring it up **once** after provisioning, and again only
when you want to pull a newer Kuma image. CI never touches it.

### First start

```bash
cd /campus-app/deploy/monitoring
docker compose pull
docker compose up -d
```

Then do the first-run setup in the Kuma UI (admin account, monitors, public status
page) — see [`README.md`](README.md#first-run-configure-uptime-kuma).

### Upgrade Kuma later

```bash
cd /campus-app/deploy/monitoring
docker compose pull        # pulls the latest louislam/uptime-kuma:1
docker compose up -d       # recreates the container, data volume is preserved
```

### Status / logs

```bash
cd /campus-app/deploy/monitoring
docker compose ps
docker compose logs -f uptime-kuma
```

### Stop / restart

```bash
cd /campus-app/deploy/monitoring
docker compose restart     # restart without losing the container
docker compose down        # stop & remove the container (data volume is kept)
```

The `uptime-kuma-data` volume (fixed name, see `monitoring/docker-compose.yml`)
holds the admin account, monitors and status page. `docker compose down` keeps it;
only `docker compose down -v` would delete it.

## Migrating from the old single-stack setup

If Kuma previously ran inside the `deploy` stack, its data lived in a
project-prefixed volume (`deploy_uptime-kuma-data`). Copy it into the new fixed
name once before starting the monitoring stack:

```bash
docker volume create uptime-kuma-data
docker run --rm \
  -v deploy_uptime-kuma-data:/from -v uptime-kuma-data:/to \
  alpine sh -c 'cp -a /from/. /to/'

cd /campus-app/deploy/monitoring
docker compose up -d
```

(If you don't mind reconfiguring, skip the copy and just redo the first-run setup.)

## Sanity checks after a deploy

```bash
# Frontend reachable via the front proxy
curl -fsS -o /dev/null -w '%{http_code}\n' https://<app-domain>/

# Kuma status JSON reachable on the status subdomain (what the browser polls)
curl -fsS https://status.<domain>/api/status-page/campus | head -c 200

# CORS header present for the app origin (else the in-app banner can't read it)
curl -fsSI -H 'Origin: https://<app-domain>' \
  https://status.<domain>/api/status-page/campus | grep -i access-control-allow-origin
```
