# Switch Manager (Nuxt 3)

Webanwendung zur Verwaltung und Visualisierung von Netzwerk-Switches mit konfigurierbaren Port-Layouts.

## Architekturvorschlag

- **Nuxt 3 Fullstack**: Pages für UI, server/api für serverseitige CRUD-Operationen.
- **Dateibasierte Persistenz**: Eine robuste JSON-Datenzugriffsschicht (`server/utils/storage.ts`) schreibt/liest `data/store.json`.
- **Kein separates Backend**: Alles läuft innerhalb von Nuxt/Nitro.
- **Layout-System**: Port-Rendering basiert ausschließlich auf `LayoutTemplate.cells` (row/col → portNumber Mapping).

## Ordnerstruktur

- `types/models.ts` – TypeScript-Interfaces
- `server/utils/storage.ts` – JSON-Speicher, Seeds, IDs, Initialisierung
- `server/api/**` – CRUD-Endpunkte innerhalb Nuxt
- `pages/**` – Dashboard, Listen, Detail- und Formularseiten
- `components/**` – UI-Bausteine inkl. `SwitchPortGrid`, `LayoutTemplateEditor`
- `data/` – persistente JSON-Daten

## Datenmodell (Kurz)

- `Location`, `Rack`, `Vendor`, `SwitchModel`
- `LayoutTemplate` + `LayoutCell`
- `Switch` + eingebettete `Port[]`

### Layout-Konzept

- Ein `Switch` referenziert `layoutTemplateId`.
- Optional kann `layoutOverride` gesetzt werden.
- Das UI rendert Ports streng anhand `cells`-Mapping:
  - row + col bestimmen Position
  - `portNumber` verbindet visuelle Zelle mit Portdaten

## JSON-Speicherkonzept

Beim ersten Start wird automatisch Seed-Datenmaterial erzeugt, falls `data/store.json` fehlt.

Beispielstruktur:

```json
{
  "locations": [],
  "racks": [],
  "vendors": [],
  "switchModels": [],
  "layoutTemplates": [],
  "switches": []
}
```

## Seed-Daten enthalten

1. 24-Port-Demo-Switch
2. 48-Port oben 1–24 / unten 25–48
3. 48-Port oben ungerade / unten gerade
4. 48+4 Uplink (SFP+) Beispiel

Mit gemischten Port-Statuswerten: `free`, `used`, `disabled`, `error`.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

## Produktion mit Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

Danach erreichbar unter `http://localhost:3000` (oder `APP_PORT`).

Persistenz erfolgt über Bind-Mount `./data:/app/data`.
