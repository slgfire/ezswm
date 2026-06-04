---
title: Release Notes
---

# Release Notes

Das **In-App-Changelog** (gerendert aus GitHub-Releases) erreichst du über die Versionsnummer im Sidebar-Footer.

## v0.22.1 — 2026-06-04

### Neu — Site-URLs nutzen jetzt Slugs (#163)

Folgt auf 0.22.0 (das Slugs im Datenmodell brachte, aber das UI auf UUID-URLs ließ). Site-URLs nutzen jetzt den Slug als kanonische Form. ([#164](https://github.com/slgfire/ezswm/pull/164), schließt [#163](https://github.com/slgfire/ezswm/issues/163))

- Alle Sidebar- / Nav-Links leiten sich vom Slug der Site ab. `/sites/main-office` statt `/sites/2b917665-d37f-4feb-8648-9b0fc80bd451`.
- Eine globale Redirect-Middleware (`app/middleware/site-uuid-to-slug.global.ts`) fängt `/sites/<uuid>/...`-URLs ab und leitet per 301 auf die Slug-Form um. Alte Bookmarks heilen sich selbst — die Adresszeile aktualisiert sich beim Navigieren.
- API-List-Endpoints (`/api/switches`, `/api/networks`, `/api/vlans`, `/api/search`, `/api/dashboard/stats`) akzeptieren jetzt Slug **oder** UUID für den `?site_id=...`-Filter. Genauso für die site-scoped Routes (`/api/sites/<id>/topology`, `/api/sites/<id>/ip-allocations`).
- Switch- und Subnet-Detail-URLs (`/sites/<slug>/switches/<switch-uuid>`) nutzen für die nested Entity weiterhin UUID. Die Slug-Umstellung dafür folgt — die Slug-Felder sind bereits in den API-Payloads, nur die UI-Arbeit ist eigene Folge-Issue.

### Intern
- `server/utils/resolveSiteParam.ts` zentralisiert die Slug-oder-ID → kanonische Site Auflösung. Wird von jedem site-scoped oder site-gefilterten Endpoint genutzt.
- `SiteSwitcher.vue` liest das Route-Segment, findet die passende Site und gibt die Slug-Form an `setSite()` weiter — `currentSiteId` enthält damit einen Slug-Wert, und `sitePrefix` rendert die URLs entsprechend.

Keine Datenmigration nötig — 0.22.0 hat die Slugs bereits gefüllt. **497/497 Tests grün**.

## v0.22.0 — 2026-06-04

### Neu — Slugs für Sites, Switches, Subnetze

Sites, Switches und Subnetze haben jetzt jeweils einen URL-tauglichen **Slug** zusätzlich zu ihrer UUID-PK. ([#162](https://github.com/slgfire/ezswm/pull/162), schließt [#157](https://github.com/slgfire/ezswm/issues/157), schließt [#139](https://github.com/slgfire/ezswm/issues/139))

- Slugs werden beim Anlegen aus dem Namen geprägt (lowercase, deutsche Umlaute → `ae/oe/ue/ss`, gängige Latein-Akzente transliteriert, Nicht-Alphanumerisches zu `-` zusammengezogen, max. 60 Zeichen). Bei Kollision wird ein `-2`, `-3`, …-Suffix angehängt — Sites sind global eindeutig, Switches und Subnetze pro Site eindeutig.
- **`/api/sites/{id}`-Endpoints akzeptieren sowohl die UUID als auch den Slug.** `siteRepository.getById()` löst beide Formen transparent auf. Ein altes Bookmark auf `/api/sites/<uuid>` funktioniert weiter und `/api/sites/main-office` jetzt auch.
- Slugs sind beim Umbenennen **sticky** — eine Namensänderung ändert nicht den Slug, damit URLs nicht brechen, wenn das angezeigte Label getweakt wird. Per `slug`-Feld im PUT lässt sich der Slug aber explizit ändern.
- Switches und Subnetze liefern ihren Slug ebenfalls im Entity-Payload mit; die Per-Site-Lookups (`switchRepository.getBySlug`, `networkRepository.getBySlug`) stehen für nachfolgende UI-Arbeit am Route-Format bereit.

### Migration

Die Schema-Migration `20260603223256_slugs` fügt `slug`-Spalten zu Site / Switch / Network mit den passenden Unique-Indexes hinzu (`Site.slug` global, `(site_id, slug)` für die beiden anderen). Bestehende Zeilen bekommen einen SQL-seitigen Platzhalter-Slug aus ihrem Namen während des Schema-Rebuilds; das JSON→DB-Migrations-Skript generiert von Anfang an saubere Slugs, wenn ein 0.20.x-Install auf 0.22 hochzieht.

### Tests

- `tests/slugify.test.ts` (10 Cases) deckt die Slugify- + Kollisions-Logik ab.
- `tests/siteRepositorySlug.test.ts` (9 Cases) deckt `getById(slug)`, sticky Slugs bei Namensänderungen und Kollisions-Suffix bei expliziten Slug-Änderungen ab. **474/474 Tests grün**.

## v0.21.3 — 2026-06-04

### Wiederhergestellt — Import / Backup-Restore / Activity-Undo laufen auf SQLite

Die vier Schreib-Endpoints, die in 0.21.x noch **501** zurückgaben, sind jetzt für SQLite verdrahtet. ([#161](https://github.com/slgfire/ezswm/pull/161), schließt [#156](https://github.com/slgfire/ezswm/issues/156))

- **`POST /api/backup/import` + `POST /api/data/import`** — Whole-DB-Restore. Akzeptiert den `schema: "sqlite-v1"`-Payload aus `/api/backup/export`. Räumt alle Tabellen in umgekehrter FK-Reihenfolge ab und macht Bulk-Inserts in FK-Reihenfolge innerhalb einer einzigen Transaktion. Lehnt nicht-UUID Primärschlüssel sofort ab, damit ein alter pre-0.21 nanoid-Dump sauber failed statt das neue Schema zu beschädigen.
- **`POST /api/import/{entity}`** — Per-Entity Bulk-Import (CSV/JSON). Zeilen werden validiert, Foreign Keys (z.B. `site_id`, `network_id`) gegen die Live-DB aufgelöst, Duplikate werden in `skipped` gezählt, und ein einzelner schlechter Datensatz gibt einen Per-Row-Fehler statt den ganzen Batch zu killen. Max 5000 Zeilen pro Aufruf.
- **`POST /api/activity/{id}/undo`** — Restored `previous_state` für **site / vlan / network / ip_allocation / ip_range** (`create` / `update` / `delete`-Aktionen). Switch-Undo und Cross-Table-Aktionen (`update_port`, `bulk_update_ports`, `add_configured_vlans`, `remove_configured_vlans`, `duplicate`) liefern weiterhin **422**, weil ihre Snapshots eingebettete Kinder enthalten — die folgen in einem Patch.

Die In-App **Datenverwaltung**-Import/Restore-UI funktioniert wieder ohne Client-Änderungen.

## v0.21.2 — 2026-06-04

### Tests
- **Repository-Tests auf Prisma-Test-Client portiert.** Die sechs Suites, die nach dem 0.21-SQLite-Switch geskipped waren (`ipAllocationRepository`, `ipRangeRepository`, `layoutTemplateRepository`, `networkRepository`, `vlanRepository`, `public-token`), laufen jetzt gegen eine echte SQLite-Datenbank, die pro Test-File provisioniert wird. `createTestPrisma()` liegt in `tests/testHelpers.ts` und wird mit dem bestehenden Migrations-Test geteilt. **455/455 Tests grün** (vorher 394 + 60 skipped). ([#160](https://github.com/slgfire/ezswm/pull/160), schließt [#155](https://github.com/slgfire/ezswm/issues/155))

### Intern
- `server/db/client.ts` exportiert den Prisma-Client jetzt über einen Proxy, der zur Laufzeit `globalThis.__prismaTestClient` bevorzugt (sofern gesetzt), damit Tests Clients in `beforeAll` swappen können ohne die Repos neu importieren zu müssen.

Keine Runtime-Änderung — Image ist byte-identisch zu 0.21.1, abgesehen von der Test-Suite.

## v0.21.1 — 2026-06-03

### Doku
- **README + Docs-Site auf den 0.21-SQLite-Switch aktualisiert.** Installations-Guide bekommt eine `DATABASE_URL`-Zeile + eine "Upgrade von 0.20.x"-Sektion, die durch die On-Boot-Migration führt. Die Datenverwaltungs-Sektion im User-Guide spiegelt jetzt wider, dass Import / Restore / Undo temporär 501 sind (verfolgt in [#156](https://github.com/slgfire/ezswm/issues/156)), während Export mit dem neuen `schema: "sqlite-v1"`-Format weiterhin funktioniert. API-Reference markiert die betroffenen Endpoints und dokumentiert das neue Export-Format. Architektur-Diagramme von "JSON Files" auf "SQLite via Prisma" aktualisiert. ([#159](https://github.com/slgfire/ezswm/pull/159), schließt [#158](https://github.com/slgfire/ezswm/issues/158))

Keine Runtime-Änderungen — Image ist byte-identisch zu 0.21.0, abgesehen vom Docs-Build.

## v0.21.0 — 2026-06-03

### Geändert — Storage von JSON-Files zu SQLite

Die interne Speicherschicht ist jetzt **SQLite via Prisma** statt flacher JSON-Files. Die einmalige Migration läuft **automatisch beim ersten Start**, wenn die Datenbank leer ist und alte `data/*.json` vorhanden sind: jeder Datensatz bekommt einen frischen **UUIDv4** als Primärschlüssel, alle Cross-References werden gemappt (auch die in Activity-Log-Snapshots), und die alten JSON-Files werden zur Sicherheit nach `data/_archive_<ISO>/` verschoben. Falls dabei etwas schiefgeht, bleibt die DB leer und die JSON-Files unangetastet — du kannst das Problem analysieren und neu starten. ([#154](https://github.com/slgfire/ezswm/pull/154), schließt [#139](https://github.com/slgfire/ezswm/issues/139) Phase 1)

#### Warum
- **Cascade-Deletes sind jetzt transactional.** Ein Network-Delete entfernt seine IP-Allocations und -Ranges atomar dank der SQLite `ON DELETE CASCADE`-Constraints.
- **Parallele Schreibvorgänge können keine Daten mehr verlieren** — SQLite serialisiert sie; das alte JSON-Read-Modify-Write war Last-Write-Wins.
- **Lookups sind indiziert** statt linear über die ganze Datei. Das Audit-Log hat jetzt Indizes auf `timestamp` und `(entity_type, entity_id)`, alle FK-Spalten sind ebenfalls indiziert.
- **Schema-Migrationen** managed jetzt Prisma statt ad-hoc JSON-Backfills im Init-Plugin.

#### Breaking — Entity-URLs ändern sich
Alle Entity-Primärschlüssel werden bei der Migration neu generiert als UUIDv4, daher haben URLs wie `/sites/<id>`, `/sites/<id>/switches/<id>`, `/layout-templates/<id>` etc. **nach dem Upgrade neue IDs**. Bookmarks auf einzelne Entities brechen einmalig. Namen und Labels im UI sind unverändert.

#### Kompatibilitäts-Hinweis — temporär deaktivierte Features
Die Bulk-Import-Endpoints und der Activity-Log-Undo-Button waren JSON-spezifisch und liefern aktuell **`501 Not Implemented`** mit klarer Meldung. SQLite-fähige Versionen folgen in einem Patch-Release. Backup-*Export* (die Lese-Seite) ist voll funktionsfähig gegen SQLite und liefert ein neues `schema: "sqlite-v1"`-Format.

#### Docker / Konfiguration
- Neue ENV-Variable `DATABASE_URL` (Default `file:/app/data/db.sqlite` im Image). Das `data/`-Verzeichnis bleibt unverändert — die SQLite-Datei + WAL + das Migrations-Archiv liegen alle dort.
- Image-ENTRYPOINT ruft jetzt `prisma migrate deploy` vor dem Server-Start auf, damit Schema-Upgrades sich beim Container-Start selbst applizieren.

## v0.20.3 — 2026-06-02

### Abhängigkeiten
- **`@nuxt/ui` 4.8.0 → 4.8.1.** Enthält den Upstream-Fix `Form: add method="post" to prevent credential leaking via GET before hydration` (relevant für das Login-Form). Außerdem: CommandPalette/DashboardSearch-Prop-Proxying, `SelectMenu` `max-height`-Fallback, Icon-Recursion-Fix. ([#151](https://github.com/slgfire/ezswm/pull/151))
- **Dev-Tooling** Patch-Bumps: `eslint` 10.4.0 → 10.4.1, `tsx` 4.22.3 → 4.22.4, `vitest` 4.1.7 → 4.1.8, `vue-tsc` 3.3.2 → 3.3.3. ([#152](https://github.com/slgfire/ezswm/pull/152))
- **CI:** `pnpm/action-setup` v4 → v6 (pnpm-v11-Support, intern auf Node 24). ([#150](https://github.com/slgfire/ezswm/pull/150))

Kein Verhaltenswechsel in der Anwendung — reines Dependency-Rollup, damit `:latest` die Upstream-Patches mitnimmt.

## v0.20.1 — 2026-05-30

### Behoben
- **DHCP-Range-Schutz greift jetzt auch beim Bearbeiten.** Bisher lief die Prüfung nur beim Anlegen; durch Bearbeiten konnte man eine bestehende Zuweisung in einen DHCP-Bereich verschieben. ([#148](https://github.com/slgfire/ezswm/pull/148))

### CI / Packaging
- **Versionierte Release-Images werden jetzt zuverlässig gebaut.** Der Auto-Tag-Schritt pusht den Tag mit `GITHUB_TOKEN` — Tag-Pushes von diesem Token triggern keine weiteren Workflows, daher wurde kein versioniertes Image veröffentlicht. Der Release-Workflow baut und pusht das Image jetzt selbst aus dem Release-Commit; mit `provenance: false`, damit GHCR die Versionsseite sauber rendert und die Labels stimmen (kein `unknown/unknown`-Phantom-Manifest mehr). ([#144](https://github.com/slgfire/ezswm/pull/144), [#146](https://github.com/slgfire/ezswm/pull/146), [#147](https://github.com/slgfire/ezswm/pull/147))
- **Konsolidiertes Tagging:** `latest` + `<version>` + `<major.minor>` entstehen aus einem Build (gleicher Digest). `latest` zeigt immer auf das neueste Release. Die alten rollenden `:main`- und `<sha>`-Tags fallen weg — `docker.yml` baut nur noch `pr-<n>`-Preview-Images bei PRs.
- **Image-`version`-Label** wird jetzt aus `package.json` gestempelt statt aus dem Ref-Namen — `:latest` reportet also nicht mehr `version=main`.

## v0.20.0 — 2026-05-29

### Neu — IP-Adressen-Übersicht
Eine neue site-übergreifende Seite **IP-Adressen** aggregiert Zuweisungen über alle Subnetze einer Site (oder aller Sites im „Alle Standorte"-Modus). Über die Seitenleiste erreichbar.

- Breite, sortierbare Tabelle: IP · Hostname · MAC · Subnetz · VLAN · Gerätetyp · Status (+ Standort-Spalte im „Alle Standorte"-Modus).
- Numerische IP-Sortierung, Suchfeld + VLAN-/Status-/Gerätetyp-Filter, Filterzustand in URL und über Sessions hinweg gespeichert.
- Zeilen-Klick öffnet das Bearbeiten-Sidepanel (Löschen sitzt im Sidepanel) — keine Buttons pro Zeile, volle Breite.
- Tabellen-Body scrollt intern mit stickyem Header: Seiten-Header, Filter und Spaltenköpfe bleiben sichtbar (Desktop + Mobile).
- Beim Anlegen einer eigenen IP wird das Subnetz automatisch aus der getippten IP abgeleitet (Subnet-Match); das Dropdown ist editierbar, das VLAN wird read-only angezeigt.
- DHCP-Range-Schutz beim Anlegen. ([#143](https://github.com/slgfire/ezswm/pull/143), schließt [#140](https://github.com/slgfire/ezswm/issues/140))

### Geändert — Netzwerke → Subnetze
Die Entität „Netzwerke" heißt im UI jetzt **Subnetze** (jedes davon war schon immer ein Subnetz/CIDR; das Label passt jetzt dazu).

- Alle Labels in EN und DE aktualisiert (Nav, Breadcrumb, Seitentitel, Buttons, Meldungen).
- Routen sind von `/sites/:id/networks` zu `/sites/:id/subnets` umgezogen. Eine globale Redirect-Middleware leitet alte Pfade per 301 weiter (auch Deep-Links auf ein einzelnes Subnetz), bestehende Bookmarks funktionieren weiter.
- Code, Typen (`Network`), API (`/api/networks`) und der Activity-`entity_type` bleiben intern `network` — reine UI-Umbenennung.
- Generische Netzwerkbegriffe (Netzwerkadresse, Netzwerk-Topologie, „Network error", Point-to-Point-/Host-Route-Netze, der öffentliche Port-Hinweis) bleiben unverändert.

### CI
- **Per-PR-Preview-Images:** jeder PR baut jetzt `ghcr.io/slgfire/ezswm:pr-<number>`, das du per `docker pull` ziehen und vor dem Merge testen kannst. ([#142](https://github.com/slgfire/ezswm/pull/142))
