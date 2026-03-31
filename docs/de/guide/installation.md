---
title: Installation
---

# Installation

## Voraussetzungen

- **Docker und Docker Compose** (empfohlen)
- ODER **Node.js 22 LTS** für lokale Entwicklung

## Docker (Empfohlen)

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
```

Erstelle eine `docker-compose.yml`:

```yaml
services:
  ezswm:
    image: ghcr.io/slgfire/ezswm:latest
    ports:
      - "3000:3000"
    environment:
      - NUXT_JWT_SECRET=your-secret-key-here
    volumes:
      - ezswm-data:/app/data
    restart: unless-stopped

volumes:
  ezswm-data:
```

Starte die Anwendung:

```bash
docker compose up -d
```

Alternativ kannst du das Image aus dem Quellcode bauen, anstatt es zu pullen:

```yaml
services:
  ezswm:
    build: .
    # ... gleiche Konfiguration wie oben
```

## Docker-Konfiguration

### Umgebungsvariablen

| Variable | Erforderlich | Standard | Beschreibung |
|---|---|---|---|
| `NUXT_JWT_SECRET` | Ja | (leer) | Geheimer Schlüssel für die JWT-Token-Signierung. Verwende eine lange, zufällige Zeichenkette. |
| `PORT` | Nein | `3000` | Port, auf dem die Anwendung lauscht. |
| `DATA_DIR` | Nein | `/app/data` | Verzeichnis für die JSON-Datenspeicherung. |

In Docker müssen Umgebungsvariablen, die die Nuxt-Laufzeit konfigurieren, das Präfix `NUXT_` verwenden (z.B. `NUXT_JWT_SECRET` statt `JWT_SECRET`).

### Datenpersistenz

Binde ein Volume oder einen Bind-Mount an `/app/data`, um Daten über Container-Neustarts hinweg zu erhalten. Ohne dies gehen alle Daten verloren, wenn der Container entfernt wird.

```yaml
volumes:
  - ./data:/app/data      # Bind-Mount
  # oder
  - ezswm-data:/app/data  # Benanntes Volume
```

## Lokale Entwicklung

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
npm install
```

Setze das JWT-Secret und starte den Entwicklungsserver:

```bash
export JWT_SECRET=dev-secret-change-me
npm run dev
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
docker compose build --no-cache
docker compose up -d
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
