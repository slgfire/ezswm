---
title: FAQ & Problemlösung
---

# FAQ & Problemlösung

## Allgemein

**Wo werden die Daten gespeichert?**
Alle Daten werden als JSON-Dateien im Verzeichnis `data/` gespeichert (konfigurierbar über `DATA_DIR`). Keine Datenbank erforderlich.

**Sind die Daten sicher?**
Alle Schreibvorgänge sind atomar (Schreiben in temporäre Datei, dann Umbenennen). Dies verhindert Beschädigungen durch Abstürze oder Stromausfälle.

**Können mehrere Benutzer gleichzeitig arbeiten?**
Ja, aber es gibt keine Echtzeit-Synchronisierung zwischen Browser-Sitzungen. Wenn zwei Benutzer dieselbe Entität gleichzeitig bearbeiten, gewinnt die letzte Speicherung. Für die meisten Anwendungsfälle (LAN-Party-Aufbau, Homelab-Dokumentation) ist das kein Problem.

**Wie setze ich alles zurück?**
Stoppe die App, lösche das Verzeichnis `data/` und starte neu. Der Einrichtungsassistent erscheint erneut.

---

## Authentifizierung

**Ich habe mein Passwort vergessen**
Es gibt keine Passwortwiederherstellung. Lösche `data/users.json` und starte neu — der Einrichtungsassistent erstellt ein neues Admin-Konto. Alle anderen Daten bleiben erhalten.

**Wie ändere ich das JWT-Secret?**
Setze die Umgebungsvariable `JWT_SECRET`. Nach der Änderung werden alle bestehenden Sitzungen ungültig und Benutzer müssen sich erneut anmelden.

---

## Docker

**Der Container startet nicht**
Prüfe, ob `JWT_SECRET` gesetzt ist. Ohne diese Variable verwendet die App einen unsicheren Standardwert.

**Daten gehen nach Container-Neustart verloren**
Stelle sicher, dass du ein Volume für `/app/data` eingebunden hast:
```yaml
volumes:
  - ./data:/app/data
```

**Wie aktualisiere ich?**
```bash
docker compose pull
docker compose up -d
```

**Health-Check schlägt fehl**
Der Health-Endpunkt ist `GET /api/health`. Er sollte `{ "status": "ok" }` zurückgeben. Bei Fehlern prüfe die Container-Logs mit `docker compose logs`.

---

## Netzwerk

**Kann ich HTTPS verwenden?**
ezSWM verarbeitet TLS nicht direkt. Verwende einen Reverse Proxy (nginx, Traefik, Caddy) davor.

**Kann ich den Port ändern?**
Setze die Umgebungsvariable `PORT`. In Docker aktualisiere zusätzlich das Port-Mapping in der `compose.yaml`.

---

## Layout-Templates

**Was passiert, wenn ich ein Template ändere?**
Alle Switches, die dieses Template verwenden, werden automatisch aktualisiert. Neue Ports werden hinzugefügt, entfernte Ports werden gelöscht, Labels werden synchronisiert. Bestehende Port-Einstellungen (VLANs, Beschreibungen, Verbindungen) bleiben nach Möglichkeit erhalten.

**Kann ich ein Template löschen, das in Verwendung ist?**
Die Benutzeroberfläche warnt dich, aber es ist erlaubt. Switches behalten ihre bestehenden Ports, verlieren aber die Template-Zuordnung.

---

## Switches & Ports

**Warum zeigt mein Port "down" an?**
Neue Ports haben standardmäßig den Status "down". Wenn du ein Gerät an einen Port anschließt, wirst du aufgefordert, den Status auf "up" zu setzen.

**Was bedeutet der gelbe Streifen auf einem Port?**
Er kennzeichnet einen Trunk-Port — einen Port mit zugewiesenen getaggten VLANs.

**Was bedeuten die VLAN-Farben auf Ports?**
Der Hintergrund jedes Ports ist mit der Farbe seines Native-VLANs bei 20% Deckkraft eingefärbt. Dies gibt einen schnellen visuellen Überblick über die VLAN-Zuweisungen im gesamten Front-Panel.

---

## Backup & Wiederherstellung

**Wie sichere ich meine Daten?**
Option 1: Verwende die integrierte Backup-Funktion unter Datenverwaltung → Vollständiges Backup exportieren (JSON).
Option 2: Kopiere das gesamte Verzeichnis `data/`.

**Wie stelle ich aus einem Backup wieder her?**
Option 1: Verwende Datenverwaltung → Backup importieren.
Option 2: Ersetze das Verzeichnis `data/` durch dein Backup und starte neu.
