---
title: Installation
---

# Installation

## Voraussetzungen

- **Docker und Docker Compose** (empfohlen)
- ODER **Node.js 22 LTS** + **pnpm 11** für lokale Entwicklung

## Docker (Empfohlen)

Das Repository liefert zwei Compose-Dateien:

| Datei | Zweck |
|---|---|
| `compose.yaml` | Zieht das vorgebaute Image aus GHCR (`ghcr.io/slgfire/ezswm:latest`). Standard für Endbenutzer. |
| `compose.dev.yaml` | Baut das Image aus dem lokalen Quellcode. Für Entwicklung oder zum Testen unveröffentlichter Änderungen. |

### Schnelles Deployment (ohne Source-Checkout)

Einfach die Compose-Datei und ein `JWT_SECRET`:

```bash
curl -O https://raw.githubusercontent.com/slgfire/ezswm/main/compose.yaml
mkdir -p data && sudo chown -R 1000:1000 data
export JWT_SECRET=$(openssl rand -hex 32)
docker compose pull && docker compose up -d
```

Daten landen in `./data` neben der Compose-Datei (Bind-Mount — direkt inspizier- und backup-bar mit normalen File-Tools). Wenn dein Host-User nicht uid 1000 ist, siehe [Benutzerdefinierte UID / GID](#benutzerdefinierte-uid--gid).

### Aus dem Quellcode

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
export JWT_SECRET=$(openssl rand -hex 32)
docker compose -f compose.dev.yaml up --build -d
```

## Docker-Konfiguration

### Umgebungsvariablen

| Variable | Erforderlich | Standard | Beschreibung |
|---|---|---|---|
| `NUXT_JWT_SECRET` | Ja | (leer) | Geheimer Schlüssel für die JWT-Token-Signierung. Verwende eine lange, zufällige Zeichenkette. |
| `PORT` | Nein | `3000` | Port, auf dem die Anwendung lauscht. |
| `DATA_DIR` | Nein | `/app/data` | Verzeichnis für Anwendungsdaten (SQLite-Datei, WAL und das JSON-Migrations-Archiv von älteren Installs). |
| `DATABASE_URL` | Nein | `file:/app/data/db.sqlite` | SQLite-Pfad. Nur überschreiben, wenn du die DB außerhalb von `DATA_DIR` ablegen willst. |
| `PUID` / `PGID` | Nein | `1000` / `1000` | UID/GID unter der der Container-Prozess läuft. Setze `PUID=0 PGID=0` um als root zu laufen. |

In Docker müssen Umgebungsvariablen, die die Nuxt-Laufzeit konfigurieren, das Präfix `NUXT_` verwenden (z.B. `NUXT_JWT_SECRET` statt `JWT_SECRET`).

Der ENTRYPOINT des Containers ruft beim Start `prisma migrate deploy` auf, bevor der Server hochfährt. Schema-Upgrades werden also automatisch beim Container-Start angewandt — kein separater Migrations-Schritt nötig.

### Benutzerdefinierte UID / GID

Das Image läuft standardmäßig unter uid `1000`. Wenn dein Host-User nicht uid 1000 ist (z.B. Synology, Unraid, custom Server-Setup), entweder:

**Option A — `./data` auf die Container-uid chown'en (empfohlen):**

```bash
export PUID=1026 PGID=100   # was auch immer dein Host nutzt
sudo chown -R $PUID:$PGID ./data
docker compose up -d
```

**Option B — Container als root laufen lassen** (darf überall schreiben, kein chown nötig):

```bash
PUID=0 PGID=0 docker compose up -d
```

Beide `PUID` und `PGID` liest die Compose-Datei aus dem Environment.

### Datenpersistenz

Die Compose-Files binden `./data` als Bind-Mount nach `/app/data` ins Container. Alles liegt dort:

- `db.sqlite` — die Anwendungs-Datenbank
- `db.sqlite-wal`, `db.sqlite-shm` — Write-Ahead-Log-Dateien von SQLite
- `_archive_<ISO>/` — die JSON-Files aus deinem vorherigen Install, nach der einmaligen 0.21-Migration zur Sicherheit aufbewahrt (siehe [Upgrade auf 0.21.x](#upgrade-von-0-20-x-auf-0-21-x))

Backup durch Kopieren des Verzeichnisses bei gestopptem Container — oder Online-Backup via SQLite (`.backup` aus `sqlite3`).

Wenn du lieber ein Docker Named Volume nutzt, editiere deine Compose-Datei:

```yaml
volumes:
  - ezswm-data:/app/data

volumes:
  ezswm-data:
```

## Lokale Entwicklung

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
pnpm install
```

Setze das JWT-Secret und starte den Entwicklungsserver:

```bash
export JWT_SECRET=dev-secret-change-me
pnpm dev
```

Die Anwendung ist unter `http://localhost:3000` erreichbar.

**Hinweis:** Ohne gesetztes `JWT_SECRET` verwendet die App einen unsicheren Standardwert. Setze immer ein sicheres Secret für jede nicht-lokale Nutzung.

## Aktualisierung

### Neuestes Image pullen

```bash
docker compose pull
docker compose up -d
```

### Aus dem Quellcode neu bauen

```bash
git pull
docker compose -f compose.dev.yaml build --no-cache
docker compose -f compose.dev.yaml up -d
```

## Upgrade von 0.20.x auf 0.21.x

Mit 0.21.0 ist der Storage von flachen JSON-Files auf eingebettetes SQLite umgestellt. Das Upgrade läuft automatisch:

1. Neues Image pullen und Container neu starten. Beim ersten Start erkennt die App die alten `data/*.json` neben einer leeren Datenbank, führt die einmalige Migration in einer einzigen Transaktion aus (jeder Datensatz bekommt eine frische UUIDv4, alle Cross-References werden gemappt) und verschiebt die originalen JSON-Files nach `data/_archive_<ISO>/`.
2. Logs zeigen die Record-Counts pro Entity und den Archive-Pfad. Falls die Migration fehlschlägt, bleibt die DB leer und die JSON-Files unangetastet — analysieren und neu starten.
3. Entity-URLs ändern sich. Bookmarks auf einzelne Sites/Switches/Networks brechen einmalig, weil die IDs neu generiert werden. URL-Pfade und das UI selbst sind unverändert.

::: warning Temporär deaktivierte Features
Bulk-Import-Endpoints (`POST /api/backup/import`, `POST /api/data/import`, `POST /api/import/{entity}`) und der Activity-Log-Undo-Button liefern in 0.21.x `501 Not Implemented`. Sie werden für SQLite umgebaut und kommen in einem Patch-Release zurück. Backup-*Export* (Lese-Seite) funktioniert gegen SQLite und liefert ein neues `schema: "sqlite-v1"`-Format.
:::

## Backup

### Integriertes Backup

Im Bereich **Datenverwaltung** der Anwendungseinstellungen kannst du einen JSON-Dump der Datenbank herunterladen. Restore ist aktuell deaktiviert (siehe Hinweis oben) — kopiere die SQLite-Datei direkt zurück, um auf einen früheren Stand zu rollen.

### Manuelles Backup

```bash
# Container vorher stoppen, damit ausstehende Writes geflusht werden.
docker compose stop ezswm
cp -r ./data ./backup-$(date +%F)
docker compose start ezswm
```

Online-Backup mit `sqlite3` ist auch ok, wenn du den Container nicht stoppen willst:

```bash
sqlite3 ./data/db.sqlite ".backup './backup-$(date +%F).sqlite'"
```
