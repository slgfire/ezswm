---
title: API-Referenz
---

# API-Referenz

Alle Endpunkte erfordern eine Authentifizierung per JWT-Cookie, außer `/api/health`, `/api/auth/login` und `/api/auth/setup`.

## Datenmodell

```mermaid
erDiagram
    Site ||--o{ Switch : contains
    Site ||--o{ VLAN : contains
    Site ||--o{ Subnet : contains
    Switch ||--o{ Port : has
    Switch }o--|| LayoutTemplate : uses
    Port }o--o| VLAN : native_vlan
    Port }o--o{ VLAN : trunk_vlans
    Subnet ||--o{ IPAllocation : contains
    Subnet ||--o{ IPRange : contains
    Subnet }o--|| VLAN : assigned_to
```

---

## Authentifizierung

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | `/api/auth/login` | Anmelden und JWT-Cookie erhalten |
| POST | `/api/auth/logout` | Abmelden und JWT-Cookie löschen |
| GET | `/api/auth/me` | Aktuell authentifizierten Benutzer abrufen |
| POST | `/api/auth/setup` | Ersteinrichtung des Admin-Kontos |

## Switches

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/switches` | Alle Switches auflisten |
| POST | `/api/switches` | Neuen Switch erstellen |
| GET | `/api/switches/:id` | Switch nach ID abrufen |
| PUT | `/api/switches/:id` | Switch nach ID aktualisieren |
| DELETE | `/api/switches/:id` | Switch nach ID löschen |
| POST | `/api/switches/:id/duplicate` | Switch duplizieren |
| PUT | `/api/switches/sort` | Sortierreihenfolge der Switches aktualisieren |

## Switch-Ports

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| PUT | `/api/switches/:id/ports/:portId` | Switch-Port aktualisieren |
| DELETE | `/api/switches/:id/ports/:portId` | Switch-Port löschen |
| PUT | `/api/switches/:id/ports/bulk` | Switch-Ports per Massenoperation aktualisieren |

## Switch-LAG-Gruppen

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/switches/:id/lag-groups` | LAG-Gruppen eines Switches auflisten |
| POST | `/api/switches/:id/lag-groups` | LAG-Gruppe erstellen |
| GET | `/api/switches/:id/lag-groups/:id` | LAG-Gruppe nach ID abrufen |
| PUT | `/api/switches/:id/lag-groups/:id` | LAG-Gruppe nach ID aktualisieren |
| DELETE | `/api/switches/:id/lag-groups/:id` | LAG-Gruppe nach ID löschen |

## VLANs

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/vlans` | Alle VLANs auflisten |
| POST | `/api/vlans` | Neues VLAN erstellen |
| GET | `/api/vlans/:id` | VLAN nach ID abrufen |
| PUT | `/api/vlans/:id` | VLAN nach ID aktualisieren |
| DELETE | `/api/vlans/:id` | VLAN nach ID löschen |
| GET | `/api/vlans/:id/references` | Objekte abrufen, die dieses VLAN referenzieren |
| GET | `/api/vlans/suggest-color` | Farbvorschlag für ein neues VLAN |

## Subnetze

::: tip
In der UI heißt diese Entität seit v0.20.0 **Subnetze**. Die API-Pfade bleiben aus Kompatibilitätsgründen bei `/api/networks`.
:::

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/networks` | Alle Subnetze auflisten |
| POST | `/api/networks` | Neues Subnetz erstellen |
| GET | `/api/networks/:id` | Subnetz nach ID abrufen |
| PUT | `/api/networks/:id` | Subnetz nach ID aktualisieren |
| DELETE | `/api/networks/:id` | Subnetz nach ID löschen |
| GET | `/api/networks/:id/references` | Objekte abrufen, die dieses Subnetz referenzieren |
| GET | `/api/networks/:id/utilization` | IP-Auslastungsstatistiken des Subnetzes abrufen |

## Subnetz-IP-Zuweisungen

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/networks/:id/allocations` | Zuweisungen eines Subnetzes auflisten |
| POST | `/api/networks/:id/allocations` | IP-Zuweisung erstellen |
| GET | `/api/networks/:id/allocations/:allocId` | Zuweisung nach ID abrufen |
| PUT | `/api/networks/:id/allocations/:allocId` | Zuweisung nach ID aktualisieren |
| DELETE | `/api/networks/:id/allocations/:allocId` | Zuweisung nach ID löschen |

## Subnetz-IP-Bereiche

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/networks/:id/ranges` | IP-Bereiche eines Subnetzes auflisten |
| POST | `/api/networks/:id/ranges` | IP-Bereich erstellen |
| GET | `/api/networks/:id/ranges/:rangeId` | IP-Bereich nach ID abrufen |
| PUT | `/api/networks/:id/ranges/:rangeId` | IP-Bereich nach ID aktualisieren |
| DELETE | `/api/networks/:id/ranges/:rangeId` | IP-Bereich nach ID löschen |

## Layout-Templates

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/layout-templates` | Alle Layout-Templates auflisten |
| POST | `/api/layout-templates` | Layout-Template erstellen |
| GET | `/api/layout-templates/:id` | Layout-Template nach ID abrufen |
| PUT | `/api/layout-templates/:id` | Layout-Template nach ID aktualisieren |
| DELETE | `/api/layout-templates/:id` | Layout-Template nach ID löschen |
| POST | `/api/layout-templates/:id/duplicate` | Layout-Template duplizieren |
| GET | `/api/layout-templates/:id/export` | Layout-Template als Datei exportieren |
| POST | `/api/layout-templates/import` | Layout-Template aus Datei importieren |

## Benutzer

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/users` | Alle Benutzer auflisten |
| POST | `/api/users` | Neuen Benutzer erstellen |
| GET | `/api/users/:id` | Benutzer nach ID abrufen |
| PUT | `/api/users/:id` | Benutzer nach ID aktualisieren |
| DELETE | `/api/users/:id` | Benutzer nach ID löschen |
| PUT | `/api/users/:id/password` | Benutzerpasswort ändern |

## Einstellungen

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/settings` | Anwendungseinstellungen abrufen |
| PUT | `/api/settings` | Anwendungseinstellungen aktualisieren |

## Dashboard & Werkzeuge

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/health` | Health-Check-Endpunkt (keine Auth.) |
| GET | `/api/dashboard/stats` | Dashboard-Statistiken abrufen |
| GET | `/api/search` | Globale Suche über alle Entitäten |
| GET | `/api/subnet-calculator` | Subnetz-Details aus CIDR berechnen |

### Topologie

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| GET | `/api/sites/:siteId/topology` | Topologie-Daten (Nodes, Links, Ghost-Nodes) für einen Standort |
| GET | `/api/sites/:siteId/topology-layout` | Gespeicherte Node-Positionen abrufen |
| PUT | `/api/sites/:siteId/topology-layout` | Node-Positionen speichern |
| DELETE | `/api/sites/:siteId/topology-layout` | Gespeichertes Layout zurücksetzen |

## Datenverwaltung

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/backup/export` | Vollständiger DB-Dump als JSON (`schema: "sqlite-v1"`). |
| POST | `/api/backup/import` | **501** in 0.21.x — wird für SQLite umgebaut, siehe [#156](https://github.com/slgfire/ezswm/issues/156). |
| GET | `/api/data/export` | Alias von `/api/backup/export`. |
| POST | `/api/data/import` | **501** in 0.21.x — siehe [#156](https://github.com/slgfire/ezswm/issues/156). |
| GET | `/api/data/template` | Leere Datenvorlage herunterladen. |
| GET | `/api/export/:entity` | Einzelne Entity-Tabelle als JSON oder CSV exportieren. |
| POST | `/api/import/:entity` | **501** in 0.21.x — siehe [#156](https://github.com/slgfire/ezswm/issues/156). |
| GET | `/api/import/template/:entity` | CSV-Vorlage für Entität herunterladen. |

### Backup-Export-Format

```json
{
  "version": "0.21.0",
  "created_at": "2026-06-03T20:34:46.634Z",
  "schema": "sqlite-v1",
  "data": {
    "users": [...],
    "switches": [...],
    "ports": [...],
    "vlans": [...],
    "networks": [...],
    "ipAllocations": [...],
    "ipRanges": [...],
    "layoutTemplates": [...],
    "lagGroups": [...],
    "activity": [...],
    "settings": [...],
    "publicTokens": [...],
    "topologyLayouts": [...]
  }
}
```

Feld-Formen spiegeln die SQLite-Spalten. JSON-Spalten (`tags`, `configured_vlans`, `tagged_vlans` auf Ports, Template-`units`, Activity-`changes`/`previous_state`/`metadata`, Network-`dns_servers`, Topology-`node_positions`) kommen als JSON-Strings — der Restore-Pfad parsed sie beim Wiedereinspielen.

## Aktivität

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/activity` | Aktuelle Aktivitätsprotokoll-Einträge auflisten. |
| POST | `/api/activity/:id/undo` | **501** in 0.21.x — wird für SQLite umgebaut, siehe [#156](https://github.com/slgfire/ezswm/issues/156). |
