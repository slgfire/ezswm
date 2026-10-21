# FAQ & Troubleshooting

## General

**Where is the data stored?**
All data is stored in an embedded SQLite database (`db.sqlite`, plus WAL files) in the data directory (`/app/data` in Docker, configurable via `DATA_DIR`). No external database server is required. JSON is only used for backups and import/export.

**Is the data safe?**
Writes go through Prisma and SQLite. Operations wrapped in a transaction are applied together or not at all; a multi-step operation is not automatically one transaction. Pre-upgrade backups are kept in the data directory. Regular backups are still recommended (see Backup & Recovery).

**Can multiple users work simultaneously?**
Yes, but there is no real-time sync between browser sessions. If two users edit the same entity at the same time, the last save wins. For most use cases (LAN party setup, homelab documentation) this is not an issue.

**How do I reset everything?**
Stop the app, back up the `data/` directory first, then remove its contents and restart. The setup wizard will appear again. This permanently deletes all data.

---

## Authentication

**I forgot my password**
There is no self-service password recovery. Ask another administrator to reset your password. Do not delete or edit the data directory or `db.sqlite`; that would destroy or corrupt your data.

**How do I change the JWT secret?**
Set the `JWT_SECRET` environment variable. After changing it, all existing sessions are invalidated and users must log in again.

---

## Docker

**The container fails to start**
Check that `JWT_SECRET` is set. Without it, the app will use an insecure default.

**Data is lost after container restart**
Make sure you mount a volume for `/app/data`:
```yaml
volumes:
  - ./data:/app/data
```

**How do I update?**
```bash
docker compose pull
docker compose up -d
```

**Health check fails**
The health endpoint is `GET /api/health`. It should return `{ "status": "ok" }`. If it fails, check container logs with `docker compose logs`.

---

## Networking

**Can I use HTTPS?**
ezSWM does not handle TLS directly. Use a reverse proxy (nginx, Traefik, Caddy) in front of it.

**Can I change the port?**
Set the `PORT` environment variable. In Docker, also update the port mapping in `compose.yaml`.

---

## Layout Templates

**What happens when I change a template?**
All switches using that template are automatically updated. New ports are added, removed ports are deleted, labels are synced. Existing port settings (VLANs, descriptions, connections) are preserved where possible.

**Can I delete a template that's in use?**
The UI will warn you, but it's allowed. Switches keep their existing ports but lose the template association.

---

## Switches & Ports

**Why does my port show "down"?**
New ports default to "down" status. When you connect a device to a port, you'll be prompted to set it to "up".

**What does the yellow stripe on a port mean?**
It indicates a trunk port — a port with tagged VLANs assigned.

**What are the VLAN colors on ports?**
Each port's background is tinted with its native VLAN's color at 20% opacity. This gives a quick visual overview of VLAN assignments across the front panel.

---

## Backup & Recovery

**How do I back up my data?**
Option 1: Use the built-in backup feature in Data Management → Export full backup (JSON, `schema: "sqlite-v1"`).
Option 2: Stop the app, then copy the entire `data/` directory (`db.sqlite` plus any `-wal`/`-shm` files). Never copy it while the app is running.

**How do I restore from backup?**
Option 1: Use Data Management → Import backup.
Option 2: Stop the app, replace the whole `data/` directory with your raw snapshot, and start it again.
