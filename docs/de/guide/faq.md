---
title: FAQ & Problemlösung
---

# FAQ & Problemlösung

## Allgemein

**Wo werden die Daten gespeichert?**
Alle Daten werden in einer eingebetteten SQLite-Datenbank (`db.sqlite`) im Verzeichnis `data/` gespeichert (`/app/data` in Docker; das Verzeichnis ist über `DATA_DIR` konfigurierbar). Ein separater Datenbankserver ist nicht erforderlich. JSON wird nur für Exporte, Backups und Importe verwendet (sowie zum einmaligen Einlesen alter JSON-Dateien vor 0.21 bei der Migration).

**Sind die Daten sicher?**
Daten werden über Prisma in SQLite geschrieben; Änderungen, die konsistent bleiben müssen (z. B. eine Backup-Wiederherstellung), laufen in einer einzigen Datenbank-Transaktion und werden bei Fehlern zurückgerollt. SQLite schützt nicht vor allen Ausfällen – erstelle daher regelmäßig Backups im Tab **Backup & Restore** und bewahre sie vertraulich auf (sie enthalten Passwort-Hashes). Bei einem Versionswechsel kopiert der Container die Datenbank außerdem vor den Migrationen nach `data/backups/` (die neuesten 5 Kopien bleiben erhalten).

**Können mehrere Benutzer gleichzeitig arbeiten?**
Ja, aber es gibt keine Echtzeit-Synchronisierung zwischen Browser-Sitzungen. Wenn zwei Benutzer dieselbe Entität gleichzeitig bearbeiten, gewinnt die letzte Speicherung. Für die meisten Anwendungsfälle (LAN-Party-Aufbau, Homelab-Dokumentation) ist das kein Problem.

**Wie setze ich alles zurück?**
Dadurch werden **alle** Daten dauerhaft gelöscht (Datenbank, Kopien vor Upgrades und archivierte Dateien). Lade zuvor ein vollständiges Backup herunter, falls du etwas behalten möchtest. Stoppe dann die App, lösche den Inhalt des Verzeichnisses `data/` und starte neu. Der Einrichtungsassistent erscheint erneut.

---

## Authentifizierung

**Ich habe mein Passwort vergessen**
Es gibt keine Selbstbedienungs-Passwortwiederherstellung, und kein Administrator kann das Passwort eines anderen Benutzers zurücksetzen: Das Ändern eines lokalen Passworts erfordert das aktuelle Passwort (Seite **Konto**). SSO-Konten haben kein ezSWM-Passwort; ihr Passwort wird von deinem Identity Provider verwaltet. Wenn SSO eingerichtet ist und du dich mit einem Konto anmelden kannst, das der Admin-Rolle zugeordnet ist, kannst du dieses verwenden. Andernfalls hilft nur ein bekanntes Passwort oder ein noch vorhandener Zugang; ezSWM bietet keinen dokumentierten Wiederherstellungsbefehl. Ein wiederhergestelltes Backup bringt die Passwort-Hashes aus diesem Backup zurück und hilft daher nur, wenn du das damals gültige Passwort kennst. Lösche nicht die Datenbank oder Benutzerdaten als Abkürzung: Damit würdest du deine Dokumentation entfernen.

**Wie ändere ich das JWT-Secret?**
Setze bei Docker Compose `NUXT_JWT_SECRET` im `environment:`-Block des Services. Die offizielle Compose-Datei akzeptiert auch eine host-seitige Shell-Variable `JWT_SECRET` und mapped sie auf `NUXT_JWT_SECRET`. Nach der Änderung werden alle bestehenden Sitzungen ungültig und Benutzer müssen sich erneut anmelden.

---

## Docker

**Der Container startet nicht**
Prüfe, ob `NUXT_JWT_SECRET` in der Container-Umgebung gesetzt ist. Wenn du die offizielle Compose-Datei nutzt, exportiere host-seitig `JWT_SECRET`; die Compose-Datei mapped es auf `NUXT_JWT_SECRET`.

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
Option 2: Stoppe den Container und kopiere dann das gesamte Verzeichnis `data/` (es enthält die SQLite-Datenbank und deren WAL-Dateien).

**Wie stelle ich aus einem Backup wieder her?**
Option 1: Verwende Datenverwaltung → Backup importieren.
Option 2: Stoppe den Container, ersetze das Verzeichnis `data/` durch deine Kopie und starte neu.
