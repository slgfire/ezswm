---
title: Release Notes
---

# Release Notes

Das **In-App-Changelog** (gerendert aus GitHub-Releases) erreichst du über die Versionsnummer im Sidebar-Footer.

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
