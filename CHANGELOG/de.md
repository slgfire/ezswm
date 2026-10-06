## [Unreleased]

---

## [0.40.2] — 2026-10-05

### Behoben
- Viewer-Rolle (Switch-Seiten): Switch-Liste, Switch-Details, Ports, LAG-Gruppen, Switch-Anlage, öffentlicher Zugriff und QR-Druck entsprechen jetzt den bestehenden Lesezugriffs-Berechtigungen. Viewer sehen keine Bedienelemente mehr für Anlegen, Bearbeiten, Löschen, Duplizieren, Mehrfachbearbeitung, LAG, Switch-Gruppen, Favoriten, gespeicherte Sortierung und öffentliche Tokens, die der Server mit 403 ablehnt. Ports und LAG-Gruppen öffnen sich als reine Detailansicht (Maus und Tastatur), und ein direkter Link auf die Anlegeseite führt zurück zur Switch-Liste. Durchsuchen, Suche, Details, normale Exporte, Drucken, lokale Anzeigeeinstellungen, eigenes Profil/Sprache, lokale Passwortänderung (aktuelles Passwort erforderlich; nicht für OIDC-Konten) und Abmelden bleiben verfügbar; Admins behalten vollen Zugriff. Netzwerke/IP-Adressen, Patchpanels und Layout-Vorlagen benötigen noch ihre UI-Anpassung; die Topologie ist teilweise für Lesezugriff angepasst, die Validierung steht noch aus. Der Server lehnt Infrastruktur-Schreibzugriffe von Viewern weiterhin ab.
- Viewer-Rolle (Standorte und VLANs): Standortliste, Standort-Anlage und Standort-Dashboard sowie VLAN-Liste, VLAN-Anlage und VLAN-Detailseite zeigen die Bedienelemente zum Anlegen, Bearbeiten und Löschen nicht mehr, die der Server mit 403 ablehnt. Direkte Links auf die Anlegeseiten für Standorte oder VLANs führen mit Lesezugriff-Hinweis zur nächstliegenden Liste, bevor ein Formular erscheint. VLAN-Details und das VLAN-Panel bleiben mit zugehörigen Netzwerken und Navigationslinks lesbar, lokales Sortieren und Filtern ist unverändert. Im Standort-Dashboard werden nur der Hinweis zum Anlegen eines Netzwerks und die Aktion zum Anlegen eines Switches im Leerzustand ausgeblendet; Lese-Links bleiben. Verliert ein Admin beim Bearbeiten die Rolle, wird ein geöffneter Standort-Editor geschlossen und ein Standort- oder VLAN-Entwurf verworfen, ein geöffnetes VLAN-Panel bleibt schreibgeschützt (Bearbeiten- und Löschzustand entfallen), und die erste abgelehnte Anfrage (403) aktualisiert die Rolle einmal, zeigt einen einzelnen Hinweis und wird nicht wiederholt.
- Rollenwechsel: Wird ein Admin zum Viewer herabgestuft, während ein Port-Editor geöffnet ist, lehnt der Server das nächste Speichern einmal ab (403) ohne erneuten Versuch, der Editor wird schreibgeschützt mit genau einem Hinweis, und es wird nichts gespeichert. Eine verzögerte Sitzungsaktualisierung kann einen Benutzer nach dem Abmelden nicht mehr zurückbringen.
- Einstellungen und Datenverwaltung: Nur Admins zugängliche Schreibvorgänge und Geheimnis-Abfragen (allgemeine Einstellungen, OIDC-Konfiguration und -Prüfung, Backup-Download und Wiederherstellung, Import) behandeln eine verlorene Admin-Rolle jetzt einmalig: Die erste abgelehnte Anfrage (403) aktualisiert die Rolle, zeigt einen einzelnen Hinweis und wird nicht wiederholt; die Admin-Bereiche verschwinden und die Seite fällt auf Konto bzw. Export zurück. Späte Datei- oder OIDC-Antworten und eine gehaltene Backup-/Import-Dateilesung werden nach dem Rollenverlust ignoriert, und noch nicht gestartete Wiederherstellungs- oder Importanfragen werden blockiert, sobald die Oberfläche den Rollenverlust bestätigt hat, und eigene ungespeicherte Konto- und Passwortänderungen bleiben durch die Verlassen-Bestätigung geschützt. Backup und Wiederherstellung bleiben Admin-Funktionen, und Exporte (die öffentliche Tokens enthalten können) sind unverändert.
- Einstellungen: Das Speichern des eigenen Profils (Anzeigename, Sprache) aktualisiert den angemeldeten Benutzer jetzt über die normale Sitzungsaktualisierung, sodass Name in der Kopfzeile und Sprache nach erfolgreicher Sitzungsaktualisierung ohne Konsolenwarnungen aktualisiert werden.
- QR-Druck: Viewer können einen vorhandenen, gültigen QR-Code für den öffentlichen Zugriff drucken; ist der Link nicht vorhanden oder widerrufen, wird der QR-Code mit Hinweis weggelassen und kein Link erstellt oder reaktiviert. Öffentliche Seiten sind nicht betroffen.
- Die gespeicherte Spracheinstellung (EN/DE) wird beim vollständigen Laden der Seite jetzt fehlerfrei angewendet.
- Das Öffnen eines Switches, Standorts oder Netzwerks über den UUID-Link leitet jetzt auch beim serverseitigen Rendern auf die Slug-URL weiter (das Sitzungs-Cookie wird weitergegeben); das behebt eine Hydration-Abweichung in der Breadcrumb beim Switch-UUID-Link.

### Geändert
- Dokumentation: Die Benutzerhandbücher (EN/DE) beschreiben die Lesezugriff-Oberfläche der Switch-Seiten und ihre aktuellen Grenzen; veraltete Formulierungen („künftige Viewer-Rolle / alle Benutzer sind Admin") in Architektur und Specs wurden korrigiert. Server-Berechtigungen und Exporte (die öffentliche Tokens enthalten können) sind unverändert.

## [0.40.1] — 2026-10-05

### Geändert
- Dokumentation: Projektanweisungen, Architektur und Spezifikationen beschreiben jetzt die aktuelle SQLite/Prisma-Persistenz; JSON-Dateien bleiben nur Austausch-/Kompatibilitätsformate (Backups, Import/Export, Legacy-Migration); Array-/Objektfelder werden als JSON in SQLite-Spalten serialisiert.
- Dokumentation: Die englische und deutsche FAQ nennen jetzt die tatsächliche Einschränkung bei der Passwort-Wiederherstellung und beschreiben eine sichere Sicherung bei gestopptem Container.
- Dokumentation: Das README-Logo ist auf GitHub horizontal und annähernd vertikal zentriert.
- Dokumentation: Die Release-Historie für 0.34.0 bis 0.40.0 wurde im englischen und deutschen Changelog nachgetragen.
- Patch Panels: Die Buchsen-Seite (L/R) im Bearbeiten-Formular wird jetzt über sichtbare Buttons L (grün) und R (blau) statt über ein Dropdown gewählt; es kann nur eine Seite gewählt werden, und erneutes Klicken auf den gewählten Button hebt nur die Seite auf (Hinweis: „Erneut klicken, um die Auswahl aufzuheben.“).
- Projektprozess: Bei jedem Push ins Git muss ein aussagekräftiger Eintrag unter `[Unreleased]` in `CHANGELOG/en.md` und `CHANGELOG/de.md` ergänzt werden; bei einem Versionssprung wandern die zutreffenden Einträge unter die neue Versionsüberschrift.

---

## [0.40.0] — 2026-10-05

### Hinzugefügt
- OIDC-/SSO-Login: Standard-OpenID-Connect-Authorization-Code-Flow mit PKCE (S256), mit State, Nonce sowie Prüfung von ID-Token-Signatur, Issuer und Subject. Anbieter, die nur symmetrische Signaturalgorithmen (z. B. HS256) anbieten, werden nicht unterstützt. Konten werden nicht per Benutzername oder E-Mail verknüpft; der lokale Notfall-Admin bleibt verfügbar.
- SSO-Rollen und -Gruppen werden bei jedem SSO-Login neu ausgewertet; die Viewer-Rolle ist für Infrastrukturdaten schreibgeschützt. Admins konfigurieren OIDC unter Einstellungen, inklusive Verbindungsprüfung und optionalem Anbieternamen auf der Login-Seite.
- Reine Admin-Seite „Benutzer“ (nur lesend) mit Benutzername, Anzeigename, Rolle und lokalem/OIDC-Konto.
- Port-Geschwindigkeit `40G` (QSFP) mit NetBox-Zuordnung `40gbase-x-qsfpp`; neue Standardwerte enthalten 40G.

### Geändert
- Einstellungen: Basis- und optionale Funktionseinstellungen (Patch Panels, Switch-Gruppen) werden mit einer Speichern-Aktion gesichert. Die Konto-Seite zeigt SSO-Benutzern einen Hinweis auf OIDC-Verwaltung. Die Login-Seite zeigt zuerst das lokale Formular, darunter SSO. Einheitliche UI-Anpassungen und Logo-Abstand in der Seitenleiste.
- Backups: Das vollständige JSON-Backup enthält jetzt Patch-Panel-Daten (Panels, Sockets, öffentliche Tokens) und speichert ein OIDC-Client-Secret nur verschlüsselt und enthält den OIDC-Verschlüsselungsschlüssel nicht. Backups enthalten weiterhin Passwort-Hashes und öffentliche Zugriffstokens und sind daher vertraulich zu behandeln.
- Neue optionale Umgebungsvariablen `PUBLIC_BASE_URL` (Callback-Origin) und `OIDC_ENCRYPTION_KEY` (nur zum Speichern eines vertraulichen Client-Secrets nötig; öffentliche Clients funktionieren ohne).

---

## [0.39.0] — 2026-09-30

### Hinzugefügt
- Switch-Gruppen: Switches lassen sich in standortbezogenen Gruppen organisieren, mit gruppierter Ansicht auf der Switch-Seite, Zuweisungsmenü und Gruppenverwaltung. Die Funktion ist standardmäßig aktiv und in den Einstellungen abschaltbar; gespeicherte Gruppen und Zuweisungen bleiben erhalten und werden beim erneuten Aktivieren wiederhergestellt. Die API-Referenz dokumentiert die neuen Gruppen-Endpunkte.

---

## [0.38.0] — 2026-09-23

### Hinzugefügt
- Netzwerke können über eine neue Option pro Netzwerk (Standard: enthalten) aus den Dashboard- und Subnetz-Auslastungswerten ausgeschlossen werden. Enthält eine Datenbankmigration.

---

## [0.37.2] — 2026-09-13

### Behoben
- Switch-Detail: Nach dem Umbenennen eines Switches folgt die Seiten-URL jetzt dem neuen Slug, sodass weitere Änderungen nicht mehr die alte Adresse ansprechen und fehlschlagen.

---

## [0.37.1] — 2026-09-08

### Geändert
- Dokumentation: API-Referenz aktualisiert.

---

## [0.37.0] — 2026-09-08

### Hinzugefügt
- Patch Panels: Jedes Panel kann einen widerrufbaren, schreibgeschützten öffentlichen Link haben, den angemeldete Benutzer erzeugen, kopieren und widerrufen können, inklusive öffentlicher Panel-Seite und Druckansicht.

---

## [0.36.0] — 2026-09-05

### Hinzugefügt
- Optionale eigenständige Patch Panels (standardmäßig deaktiviert, in den Einstellungen aktivierbar): 12-/24-/48-Port-Panels mit optionalen Informationen zur linken/rechten Gegenseite, Dosennummer, Standort und Teststatus. Panels werden pro Standort oder standortübergreifend gelistet und erscheinen in der Suche; Daten bleiben beim Deaktivieren erhalten. Enthält eine Datenbankmigration.

---

## [0.35.4] — 2026-09-04

### Behoben
- Switch-Druckansicht: dichteres Port-Raster, sodass mehr Ports auf eine gedruckte Seite passen.

---

## [0.35.3] — 2026-09-03

### Behoben
- Switch-Druckansicht: kompakteres Druck-Layout.

---

## [0.35.2] — 2026-09-03

### Behoben
- Layout der QR-Sticker-Druckansicht vereinheitlicht.

---

## [0.35.1] — 2026-09-02

### Behoben
- Massenbearbeitung von Ports: Das Status-Steuerelement nutzt jetzt denselben Up/Down/Disabled-Button-Stil wie die Einzelbearbeitung, mit separatem Zustand „Keine Änderung“, der den Status unverändert lässt.
- Dokumentation: RTK-Befehlshinweise für Mitwirkende ergänzt.

---

## [0.35.0] — 2026-09-02

### Hinzugefügt
- Port-Bearbeitung: Der Status wird jetzt über eine exklusive Up/Down/Disabled-Buttongruppe statt über ein Dropdown gewählt.

---

## [0.34.3] — 2026-09-01

### Behoben
- Switch bearbeiten: Das Leeren optionaler Textfelder (Modell, Hersteller, Seriennummer, Standort, Rack-Position, Management-IP, Firmware, Notizen) wird jetzt gespeichert, statt den alten Wert beizubehalten.

---

## [0.34.2] — 2026-08-31

### Behoben
- Switch bearbeiten: Beim Ändern des Layout-Templates oder der Stack-Größe erscheint jetzt ein Bestätigungsdialog mit den Ports, die entfernt würden, sodass Ports nicht mehr unerwartet gelöscht werden.

---

## [0.34.0] — 2026-08-31

### Hinzugefügt
- Docker-Start erstellt jetzt bei einer Versionsänderung ein SQLite-Backup vor dem Upgrade (Datenbank plus WAL/SHM-Dateien) im Ordner `backups/` des Datenverzeichnisses, behält die neuesten fünf und bricht vor den Migrationen ab, wenn das Backup fehlschlägt.
- Änderungen an Switches, Ports und LAGs sind jetzt gegen gleichzeitige Bearbeitung geschützt (Konflikte liefern eine klare 409-Antwort), Löschen und Neuaufbau von Switches bereinigen Port-Verbindungen und Remote-LAG-Referenzen konsistent, und Massen-Port-Updates lehnen fehlende oder fremde Ziele atomar ab.

---

## [0.33.0] — 2026-08-02

### Hinzugefügt
- LAG duplizieren: Beim Duplizieren eines LAG kann jetzt ein Remote-Switch ausgewählt werden, sodass ein Ersatzswitch gewählt werden kann, anstatt die ursprüngliche Remote-Verbindung zu kopieren. Der Remote-Abschnitt, das Port-Mapping und die Konfliktwarnungen sind im Duplizieren-Modus sichtbar.
- LAG erstellen/duplizieren: Der Port-Status (up/down/disabled) kann jetzt für alle Member-Ports gleichzeitig gesetzt werden — lokal und remote, wenn ein Remote-Switch ausgewählt ist.
- Helferansicht (mobil): Verbundene Ports werden jetzt mit einer smaragdgrünen linken Border und grüner Verbindungstext hervorgehoben, sodass verknüpfte Ports auf einen Blick erkennbar sind.
- Layout-Template-Erstellung: Port-Blöcke können jetzt während der Erstellung mit Auf/Ab-Buttons umsortiert werden, passend zum Verhalten, das bereits im Edit-View verfügbar ist.

### Behoben
- Helferansicht (mobil): Die Port-Sortierung mischt Typen nicht mehr zufällig. Ports werden jetzt nach Typ gruppiert (RJ45 → SFP → SFP+ → QSFP → Management → Console) innerhalb jeder Usage-Kategorie, sodass die Liste der physischen Panel-Reihenfolge folgt.

---

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
