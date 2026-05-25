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
| `DATA_DIR` | Nein | `/app/data` | Verzeichnis für die JSON-Datenspeicherung. |
| `PUID` / `PGID` | Nein | `1000` / `1000` | UID/GID unter der der Container-Prozess läuft. Setze `PUID=0 PGID=0` um als root zu laufen. |

In Docker müssen Umgebungsvariablen, die die Nuxt-Laufzeit konfigurieren, das Präfix `NUXT_` verwenden (z.B. `NUXT_JWT_SECRET` statt `JWT_SECRET`).

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

Die Compose-Files binden `./data` als Bind-Mount nach `/app/data` ins Container. Aller JSON-State liegt dort. Backup durch Kopieren des Verzeichnisses.

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

## Backup

### Integriertes Backup

Verwende den Bereich **Datenverwaltung** in den Anwendungseinstellungen, um über die Benutzeroberfläche vollständige Backups zu erstellen und wiederherzustellen.

### Manuelles Backup

Das Datenverzeichnis enthält den gesamten Anwendungsstatus als JSON-Dateien. Kopiere es, um ein Backup zu erstellen:

```bash
# Docker Named Volume
docker cp $(docker compose ps -q ezswm):/app/data ./backup

# Bind-Mount
cp -r ./data ./backup
```
