---
title: FAQ & Troubleshooting
---

# FAQ & Troubleshooting

## General

**Where is the data stored?**
All data is stored as JSON files in the `data/` directory (configurable via `DATA_DIR`). No database required.

**Is the data safe?**
All writes are atomic (write to temp file, then rename). This prevents corruption from crashes or power loss.

**Can multiple users work simultaneously?**
Yes, but there is no real-time sync between browser sessions. If two users edit the same entity at the same time, the last save wins. For most use cases (LAN party setup, homelab documentation) this is not an issue.

**How do I reset everything?**
Stop the app, delete the `data/` directory, and restart. The setup wizard will appear again.

---

## Authentication

**I forgot my password**
There is no password recovery. Delete `data/users.json` and restart — the setup wizard will create a new admin account. All other data is preserved.

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
Option 1: Use the built-in backup feature in Data Management → Export full backup (JSON).
Option 2: Copy the entire `data/` directory.

**How do I restore from backup?**
Option 1: Use Data Management → Import backup.
Option 2: Replace the `data/` directory with your backup and restart.
