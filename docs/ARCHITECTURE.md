# ezSWM Architecture Overview

## Stack
- Nuxt 4 with TypeScript
- Nuxt UI dashboard-style layout
- Nuxt i18n (English only)
- JSON repositories in `/app/data`

## Layers
1. **UI Layer**: `app.vue` + pages for dashboard, switches, networks, settings.
2. **API Layer**: Nitro handlers in `server/api` for CRUD and search.
3. **Domain Validation Layer**: Zod schemas in `server/schemas/domain.ts`.
4. **Repository Layer**: `server/repositories` only place reading/writing JSON.
5. **Storage Layer**: `server/storage/json-storage.ts` for auto-creation and atomic writes.

## Data Files
- `/app/data/switches.json`
- `/app/data/networks.json`
- `/app/data/allocations.json`
- `/app/data/ranges.json`

## Validation
- Network `netmask` derives from `prefix`.
- IP allocations: valid IPv4, in subnet, no duplicate in same network.
- IP ranges: inside subnet and `startIp <= endIp`.
