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
