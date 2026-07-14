## [0.31.4] — 2026-07-14

### Geändert
- Dependency-Maintenance-Release: Nuxt i18n, marked und Development-Tooling wurden nach erfolgreicher CI aktualisiert. Das nanoid-Major-Update bleibt separat zur expliziten Prüfung.
- Diese Version aktualisiert die Docker-Release-Tags `latest`, `0.31.4` und `0.31`.

---

## [0.31.0] — 2026-06-26

### Hinzugefügt
- Layout-Template-Editor: Port-Blöcke können jetzt per Drag-and-Drop (Griffpunkt links) oder über die Pfeil-Buttons im Block-Header umsortiert werden. Die neue Reihenfolge wird mit dem Template gespeichert und überall dort übernommen, wo das Template verwendet wird.

---

## [0.30.2] — 2026-06-26

### Behoben
- Device-Library-Import: Ports mit `poe_mode: pd` (Powered Device / PoE-Eingang) werden nicht mehr fälschlicherweise als PoE-PSE-Ports markiert. Betraf das MikroTik CRS326-24G-2S+RM, bei dem `ether1` der eigene Stromanschluss des Switches ist und alle 24 Ports als „PoE Passive 24V" angezeigt wurden.

---

## [0.30.1] — 2026-06-19

### Behoben
- LAG-Gruppen: Das Ziel-Port-Dropdown gruppiert die Ports jetzt nach Typ (Kupfer, dann Glasfaser/Uplink, dann Console/Management), statt den ersten Port jedes Blocks zu vermischen — die Liste folgt so der physischen Panel-Reihenfolge.
- Layout-Templates: Das PoE-Dropdown öffnet sich jetzt auch dann korrekt, wenn ein Block keinen PoE-Typ hat (ein Leerstring war mit Nuxt UI v4 USelect nicht kompatibel); als Standard wird nun „Keine" angezeigt und ausgewählt.

---

## [0.30.0] — 2026-06-16

### Geändert
- Das App-Layout nutzt jetzt die Standard-Nuxt-UI-Dashboard-Komponenten. Es sieht gleich aus, aber der eingeklappte Zustand der Seitenleiste bleibt über Reloads erhalten, das mobile Menü öffnet als Slide-over und die Header-Suche ist linksbündig.

---

## [0.29.2] — 2026-06-18

### Behoben
- LAG-Gruppen: Im Ziel-Port-Dropdown kann derselbe Remote-Port nicht mehr für zwei lokale Ports gewählt werden, und die Ports sind jetzt in natürlicher Reihenfolge (nach Unit/Index) sortiert.
- LAG-Gruppen: Speichern mit leerem Namen zeigt jetzt den Pflichtfeld-Fehler an, statt still nichts zu tun.

---

## [0.29.1] — 2026-06-16

### Behoben
- Das Markieren eines Switches als Favorit aus der Switch-Liste schlägt nicht mehr still fehl. Die Anfrage nutzte den per-Site-Slug ohne Site-Kontext und lieferte 404; jetzt wird die eindeutige Switch-ID verwendet.

---

## [0.29.0] — 2026-06-15

### Hinzugefügt
- Sprachumschalter in der Kopfleiste (oben rechts), um jederzeit zwischen Englisch und Deutsch zu wechseln. Die Auswahl wird im Profil gespeichert und bleibt über Reloads und Geräte hinweg erhalten.

### Geändert
- Der Schutz vor nicht gespeicherten Änderungen gilt jetzt einheitlich für jedes Bearbeitungs-Seitenpanel — Switch- und Port-Bearbeitung, Massen-Port-Bearbeitung, LAG-Gruppen, IP-Belegungen und -Bereiche, Netzwerke, VLANs und Standorte. Beim Schließen mit ungespeicherten Änderungen (Klick daneben, Escape oder Abbrechen) wird zuerst nachgefragt.

---

## [0.28.0] — 2026-06-15

### Hinzugefügt
- Bestätigungen (Port zurücksetzen, LAG-Verbindung überschreiben, Seite mit ungespeicherten Änderungen verlassen) nutzen jetzt In-App-Dialoge statt nativer Browser-Popups.

### Behoben
- Das Zurücksetzen eines Ports löscht jetzt Konfiguration und Verbindung vollständig und trennt die Verbindung auf beiden Seiten, statt einen veralteten Rück-Link auf dem Gegenstellen-Switch zu hinterlassen.

---

## [0.27.2] — 2026-06-13

### Behoben
- Port- und LAG-Aktionen auf einem über eine Slug-URL aufgerufenen Switch treffen nicht mehr den falschen Switch oder liefern 404. Per-Site-Slugs (pro Standort eindeutig, nicht global) werden jetzt über den Site-Kontext eindeutig aufgelöst.

---

## [0.27.1] — 2026-06-13

### Behoben
- Das Bearbeiten von Ports und LAG-Gruppen auf einem über die Slug-URL geöffneten Switch funktioniert jetzt. Die Endpunkte lösen den Slug vor dem Anwenden der Änderungen in die Switch-ID auf.

---

## [0.27.0] — 2026-06-13

### Hinzugefügt
- Switch-Listen-Filter (Standort, Rolle, Tags) sind jetzt auf den aktuellen Standort beschränkt, jeder Filter hat einen eigenen Reset-Button, und die Filter-Steuerelemente zeigen Icons.

---

## [0.26.1] — 2026-06-11

### Behoben
- Das doppelte „Pflichtfeld"-Sternchen, das bei einigen Formularfeld-Labels erschien, wurde entfernt.

---

## [0.26.0] — 2026-06-11

### Hinzugefügt
- Geräte aus der NetBox-Gerätebibliothek direkt im Switch-Quick-Create-Modal importieren. Bei Auswahl eines Templates werden Hersteller und Modell automatisch ausgefüllt (editierbar; manuelle Änderungen sperren das Feld).

---

## [0.25.6] — 2026-06-11

### Behoben
- Das Changelog-Modal funktioniert jetzt korrekt im produktiven Docker-Image. Die CHANGELOG-Dateien wurden zwar gebündelt (nach dem Pfad-Fix in v0.25.5), aber aus dem falschen Nitro-Storage-Namespace gelesen (`assets:server` statt `assets:changelog`), sodass die API weiterhin eine leere Liste zurückgab.

---

## [0.25.5] — 2026-06-11

### Behoben
- Das Changelog-Modal zeigt im produktiven Docker-Image jetzt die Release-Notes an. Die CHANGELOG-Dateien wurden nicht in den Server-Build eingebettet, weil der Asset-Pfad relativ zum Nuxt-`app/`-Verzeichnis statt zum Projekt-Root aufgelöst wurde.

---

## [0.25.4] — 2026-06-11

### Behoben
- IP-Range-Zeilen in der Subnetz-Detailansicht zeigen den Adressbereich jetzt einheitlich im gleichen Stil wie normale Belegungs-Zeilen. Die Anzahl der IPs wird jetzt als farbiger Badge in der Farbe des Range-Typs (DHCP, statisch, reserviert) dargestellt, statt als kleiner grauer Text.

---

## [0.25.3] — 2026-06-10

### Behoben
- IP-Belegungen und IP-Ranges werden jetzt korrekt angezeigt, wenn ein Subnetz über seine slug-basierte URL aufgerufen wird. Die betroffenen API-Endpunkte lösen den Netzwerk-Slug nun korrekt in die zugehörige UUID auf, bevor Kind-Datensätze abgefragt werden.

---

## [0.25.2] — 2026-06-10

### Behoben
- Changelog-Modal zeigt eingeloggten Benutzern nicht mehr „nicht verfügbar". Die Endpunkte `/api/changelog` und `/api/version-latest` sind jetzt öffentlich (kein Auth-Token erforderlich), passend zur Nutzung vor und nach dem Login.

---

## [0.25.1] — 2026-06-10

### Behoben
- Docker-Startschleife nach Prisma-7-Upgrade behoben: `prisma.config.ts` fehlte im Runtime-Image, was dazu führte, dass `prisma migrate deploy` mit „datasource.url property is required" fehlschlug.

---

## [0.25.0] — 2026-06-10

### Geändert
- Prisma ORM wurde von 6.18 auf 7.8 aktualisiert. Die Datenbank-Engine verwendet jetzt den `better-sqlite3` Driver Adapter statt der bisherigen Binary Engine. Leistung und Kompatibilität sind gleichwertig; eine Datenmigration ist nicht erforderlich.

> **Breaking Change für Source-Builds:** `DATABASE_URL` in `.env` wird jetzt relativ zum Repo-Root aufgelöst (dort liegt `prisma.config.ts`), nicht mehr relativ zum `prisma/`-Verzeichnis. Wer ezSWM aus dem Quellcode betreibt und einen eigenen `DATABASE_URL`-Pfad in `.env` gesetzt hat, muss diesen entsprechend anpassen. Der Standard-Pfad ändert sich von `file:../data/db.sqlite` zu `file:./data/db.sqlite`. Docker-Deployments mit dem fertigen Image sind nicht betroffen.

---

## [0.24.2] — 2026-06-10

### Behoben
- Tags an einem Switch können jetzt über das Bearbeiten-Formular korrekt entfernt werden. Bisher wurde ein Tag nicht gespeichert entfernt, wenn es das letzte Tag am Switch war.

---

## [0.24.1] — 2026-06-10

### Behoben
- Backup-Export und -Import funktionieren jetzt korrekt. Bisher schlug das Wiederherstellen eines Backups immer fehl, weil Sites in der exportierten Datei fehlten und beim Import ein Datenbankfehler auftrat.

---

## [0.24.0] — 2026-06-06

### Geändert
- Das Changelog im Programm (Versionsnummer in der Seitenleiste anklicken) zeigt jetzt eine kurze, verständliche Beschreibung zu jeder Version statt einer Roh-Liste mit Pull-Request-Titeln. Verfügbar auf Deutsch und Englisch, passend zur gewählten UI-Sprache. Funktioniert auch offline — für das Changelog ist keine Internetverbindung mehr nötig.

---

## [0.23.4] — 2026-06-05

### Behoben

- Detail-Seiten von Switches und Subnetzen laden jetzt korrekt, wenn zwei verschiedene Sites denselben Kurznamen für ein Gerät oder Subnetz verwenden (z. B. beide eine Switch namens „sw-core" haben). Bisher erschien in dieser Situation eine 404-Fehlerseite.

---

## [0.23.3] — 2026-06-05

### Behoben

- Die einmalige Upgrade-Migration aus 0.21 konnte IP-Zuweisungen stillschweigend verwerfen, ohne einen Hinweis im Protokoll zu hinterlassen. Die beim Start angezeigte Anzahl importierter Einträge ist jetzt korrekt und spiegelt wider, was tatsächlich gespeichert wurde. Nicht importierte Zeilen werden einzeln mit Begründung aufgelistet.

### Neu

- Falls deine Installation vom stillen Datenverlust betroffen war, steht ein Wiederherstellungs-Werkzeug bereit, das fehlende IP-Zuweisungen aus dem ursprünglichen Backup wiederherstellt. Zuerst im Testmodus ausführen, um zu sehen, was wiederhergestellt würde, dann mit `?apply=1` tatsächlich einspielen. Erfordert Admin-Zugang.

---

## [0.23.2] — 2026-06-05

### Behoben

- Änderungen an einer Site, einem Switch oder einem Subnetz speichern und Einträge löschen funktioniert jetzt korrekt, wenn man über die lesbare URL navigiert (z. B. `/sites/main-office`). Bisher meldeten diese Aktionen einen „nicht gefunden"-Fehler, obwohl die Seite selbst einwandfrei geladen wurde.

---

## [0.23.1] — 2026-06-05

### Behoben

- Das Erstellen eines neuen Subnetzes, VLANs oder Switches innerhalb einer Site über deren lesbare URL (z. B. `/sites/main-office/subnets/create`) führt nicht mehr zu einem Server-Fehler. Das Formular wird jetzt korrekt abgesendet.

---

## [0.23.0] — 2026-06-05

### Neu

- Switches und Subnetze haben jetzt lesbare URLs — genau wie Sites. Statt langer UUID-Zeichenketten sieht man jetzt Adressen wie `/sites/main-office/switches/core-01` oder `/sites/main-office/subnets/management`. Alte Lesezeichen werden automatisch weitergeleitet.
- Alle Navigationslinks, Suchergebnisse, Breadcrumbs und Dashboard-Favoriten wurden auf das neue Adressformat aktualisiert.

### Behoben

- Wer von 0.21 auf 0.22 aktualisiert hat, könnte bei manchen Einträgen Kurzadressen im Stil von `saarlan-839425` vorgefunden haben. Diese werden beim Start jetzt automatisch durch saubere, lesbare Adressen ersetzt — kein manueller Eingriff nötig.
- Das Umbenennen einer Site, eines Switches oder Subnetzes aktualisiert die URL jetzt zuverlässig. Ein früherer Randfall sorgte dafür, dass die alte Adresse bestehen blieb, wenn das Bearbeitungsformular geöffnet wurde, ohne den Namen zu ändern.

---

## [0.22.2] — 2026-06-04

### Geändert

- Beim Umbenennen einer Site, eines Switches oder Subnetzes wird jetzt auch die URL automatisch angepasst. Wer „Main Office" in „HQ" umbenennt, findet danach `/sites/hq` statt `/sites/main-office` in der Adressleiste. Alte Lesezeichen mit UUID-URLs funktionieren weiterhin und leiten automatisch weiter.

---

## [0.22.1] — 2026-06-04

### Neu

- Site-URLs sind jetzt lesbar: `/sites/main-office` statt `/sites/2b917665-…`. Alle Navigationslinks wurden aktualisiert. Vorhandene Lesezeichen mit alten UUID-URLs werden automatisch auf die neue Form weitergeleitet.
- API-Filter für Switches, Subnetze, VLANs und die Suche akzeptieren jetzt sowohl die Kurzadresse als auch die UUID — beides funktioniert.

---

## [0.22.0] — 2026-06-04

### Neu

- Sites, Switches und Subnetze erhalten jetzt automatisch eine URL-sichere Kurzadresse, die aus dem Anzeigenamen generiert wird. Das ist die Grundlage für die lesbaren URLs, die in 0.22.1 und 0.23.0 eingeführt wurden. Bestehende Einträge wurden automatisch migriert.

---

## [0.21.3] — 2026-06-04

### Neu

- Import, Backup-Wiederherstellung und das Rückgängigmachen von Aktivitäts-Log-Einträgen funktionieren wieder vollständig. Diese Funktionen waren nach dem Speicher-Upgrade in 0.21 vorübergehend nicht verfügbar. Die Datenverwaltungsseite ist wieder vollständig nutzbar.

---

## [0.21.0] — 2026-06-03

### Geändert

- Daten werden jetzt in einer SQLite-Datenbank statt in JSON-Dateien gespeichert. Der Wechsel erfolgt beim ersten Start automatisch: Bestehende Daten werden migriert, alle Querverweise bleiben erhalten, und die ursprünglichen JSON-Dateien werden als Backup-Archiv aufbewahrt. Tritt bei der Migration ein Fehler auf, bleiben die JSON-Dateien unberührt, sodass man neu starten und nachforschen kann.
- Das Löschen eines Subnetzes entfernt jetzt automatisch und atomar alle zugehörigen IP-Zuweisungen. Gleichzeitige Änderungen können sich nicht mehr gegenseitig überschreiben.

> **Hinweis:** Nach dem Upgrade müssen Lesezeichen auf bestimmte Sites, Switches oder Subnetze einmalig aktualisiert werden — die internen IDs haben sich bei der Migration geändert. Namen und alle anderen Daten bleiben erhalten.

---

## [0.20.x und früher]

Details zu Versionen vor 0.21 sind auf [GitHub Releases](https://github.com/slgfire/ezswm/releases) zu finden.
