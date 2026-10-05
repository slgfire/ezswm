# SPEC: Backend

This document defines the storage layer, repository pattern, API routes, validation, error handling, and authentication for ezSWM.

Related documents:
- [SPEC_DATA_MODEL.md](SPEC_DATA_MODEL.md)
- [SPEC_FRONTEND.md](SPEC_FRONTEND.md)
- [SPEC_INFRASTRUCTURE.md](SPEC_INFRASTRUCTURE.md)

---

## 1. Storage Layer

> The original design stored each entity as an atomically written JSON file. That design is historical and superseded: primary persistence is **SQLite accessed through Prisma**. JSON remains only as an exchange/compatibility format (see below).

### Database Location

- `DATABASE_URL` selects the SQLite file (`.env.example`: `file:./data/db.sqlite`; Docker image: `file:/app/data/db.sqlite`). `nuxt.config.ts` falls back to `file:../data/db.sqlite` (relative to `/prisma`).
- `DATA_DIR` (default `/app/data`, runtime config `NUXT_DATA_DIR`) is the persistent directory holding `db.sqlite` (plus WAL files), `.version`, `backups/` (pre-upgrade copies) and archived legacy JSON (`_archive_<ISO>/`).

### Schema and Client

- `prisma/schema.prisma` (provider `sqlite`) defines the tables; SQL migrations live in `prisma/migrations/` and are applied by `docker-entrypoint.sh` with `prisma migrate deploy`. Before applying migrations to an existing database with a changed version, the entrypoint copies the database (and WAL/SHM files) to `DATA_DIR/backups/` and keeps the 5 newest.
- `server/db/client.ts` exports a lazily created `PrismaClient` using `@prisma/adapter-better-sqlite3`. Tests may inject their own client.
- SQLite has no native arrays/JSON columns: array/object fields (for example `tags`, `configured_vlans`, `tagged_vlans`, `dns_servers`, layout `units`, OIDC `scopes`) are stored as JSON strings and (de)serialised in the repository layer.

### Initialization

The Nitro plugin `server/plugins/initData.ts` connects to the database on startup, ensures the singleton AppSettings row exists, and runs the legacy JSON migration when applicable (see below). It does not create per-entity JSON files.

### Concurrency Strategy

- Writes go through Prisma; multi-row changes that must be atomic use `prisma.$transaction` (for example whole-backup restore in `server/utils/dataRestore.ts`).
- There is no application-level locking beyond what SQLite provides.

### Legacy JSON Storage (compatibility only)

- `server/storage/jsonStorage.ts` still contains the old atomic temp-file → rename helper (`readJson`, `writeJson`, `initializeFile`); it is not used for primary persistence.
- `server/migrations/jsonToPrisma.ts`: if the database is empty and legacy files (`sites.json`, `switches.json`, `users.json`, `settings.json`, …) exist in `DATA_DIR`, a one-shot migration imports them into SQLite and archives the originals in `_archive_<ISO>/`. `POST /api/admin/recover-allocations` can recover archived IP allocations that were skipped.

---

## 2. Repository Layer

Each domain entity has a dedicated repository in `server/repositories/`. Repositories (Prisma) are the **intended** place for database access. Documented exceptions that import `server/db/client.ts` directly: backup/restore and data/entity export/import, activity undo, admin allocation recovery, `/api/health` and the startup plugin.

### Base Repository Interface

```typescript
// Conceptual shape; repositories are asynchronous (Prisma) and not all
// implement every method.
interface BaseRepository<T> {
  list(filters?: Record<string, unknown>): Promise<T[]>
  getById(id: string): Promise<T | null>
  create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<boolean>
}
```

### Repository Files

| File | Entity | Notes |
|------|--------|-------|
| `server/repositories/userRepository.ts` | User | Password hashing, username uniqueness |
| `server/repositories/switchRepository.ts` | Switch + Port | Ports in a separate `Port` table, bidirectional link management |
| `server/repositories/vlanRepository.ts` | VLAN | Color uniqueness, deletion cascade check |
| `server/repositories/networkRepository.ts` | Network | VLAN reference validation |
| `server/repositories/ipAllocationRepository.ts` | IPAllocation | Global IP uniqueness, subnet membership |
| `server/repositories/ipRangeRepository.ts` | IPRange | Range overlap detection, subnet membership |
| `server/repositories/layoutTemplateRepository.ts` | LayoutTemplate | Template export/import |
| `server/repositories/lagGroupRepository.ts` | LAGGroup | Port ownership validation |
| `server/repositories/activityRepository.ts` | ActivityEntry | Append-only, max 1000 entries, pruning |
| `server/repositories/settingsRepository.ts` | AppSettings | Single-object read/write |

### Repository-Specific Logic

#### SwitchRepository

- On create with `layout_template_id`: auto-generate ports from template
- On port update with `connected_device_id` + `connected_port_id`: update the remote port's connection fields (bidirectional)
- On port disconnect: remove connection on both sides
- On delete: remove all bidirectional links from connected switches, remove related LAGGroups

#### VlanRepository

- On create: auto-assign next available color from pool, enforce unique `vlan_id` and `color`
- On delete: check for referencing ports and networks, return list of affected entities

#### IPAllocationRepository

- On create/update: validate IP is within network subnet, check global IP uniqueness
- Duplicate IP detection across all networks

#### IPRangeRepository

- On create/update: validate start/end within subnet, check no overlap with existing ranges in same network

#### ActivityRepository

- On write: append entry, prune if > 1000 entries (remove oldest)
- Store `previous_state` for undo support

---

## 3. API Routes

All routes are internal Nuxt server routes under `server/api/`. No public API.

### Authentication Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/setup` | Initial admin creation (setup wizard) |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Get current user info |

### User Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List all users (admin only, later) |
| POST | `/api/users` | Create user (admin only, later) |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| PUT | `/api/users/:id/password` | Change password |

### Switch Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/switches` | List switches (supports filters) |
| POST | `/api/switches` | Create switch |
| GET | `/api/switches/:id` | Get switch with ports |
| PUT | `/api/switches/:id` | Update switch |
| DELETE | `/api/switches/:id` | Delete switch |
| POST | `/api/switches/:id/duplicate` | Clone switch |
| PUT | `/api/switches/:id/ports/:portId` | Update single port |
| PUT | `/api/switches/:id/ports/bulk` | Bulk update ports |

### VLAN Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vlans` | List VLANs (supports filters) |
| POST | `/api/vlans` | Create VLAN |
| GET | `/api/vlans/:id` | Get VLAN |
| PUT | `/api/vlans/:id` | Update VLAN |
| DELETE | `/api/vlans/:id` | Delete VLAN (with cascade check) |
| GET | `/api/vlans/:id/references` | Get entities referencing this VLAN |

### Network Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/networks` | List networks (supports filters) |
| POST | `/api/networks` | Create network |
| GET | `/api/networks/:id` | Get network |
| PUT | `/api/networks/:id` | Update network |
| DELETE | `/api/networks/:id` | Delete network (with cascade check) |
| GET | `/api/networks/:id/references` | Get allocations and ranges |
| GET | `/api/networks/:id/utilization` | Get IP utilization stats |

### IP Allocation Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/networks/:networkId/allocations` | List allocations for network |
| POST | `/api/networks/:networkId/allocations` | Create allocation |
| GET | `/api/networks/:networkId/allocations/:id` | Get allocation |
| PUT | `/api/networks/:networkId/allocations/:id` | Update allocation |
| DELETE | `/api/networks/:networkId/allocations/:id` | Delete allocation |

### IP Range Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/networks/:networkId/ranges` | List ranges for network |
| POST | `/api/networks/:networkId/ranges` | Create range |
| GET | `/api/networks/:networkId/ranges/:id` | Get range |
| PUT | `/api/networks/:networkId/ranges/:id` | Update range |
| DELETE | `/api/networks/:networkId/ranges/:id` | Delete range |

### Layout Template Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/layout-templates` | List templates |
| POST | `/api/layout-templates` | Create template |
| GET | `/api/layout-templates/:id` | Get template |
| PUT | `/api/layout-templates/:id` | Update template |
| DELETE | `/api/layout-templates/:id` | Delete template |
| GET | `/api/layout-templates/:id/export` | Export template as JSON |
| POST | `/api/layout-templates/import` | Import template from JSON |

### LAG Group Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/switches/:switchId/lag-groups` | List LAGs for switch |
| POST | `/api/switches/:switchId/lag-groups` | Create LAG |
| GET | `/api/switches/:switchId/lag-groups/:id` | Get LAG |
| PUT | `/api/switches/:switchId/lag-groups/:id` | Update LAG |
| DELETE | `/api/switches/:switchId/lag-groups/:id` | Delete LAG |

### Activity Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/activity` | List activity entries (paginated) |
| POST | `/api/activity/:id/undo` | Undo an action |

### Settings Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get app settings |
| PUT | `/api/settings` | Update app settings |

### Search Route

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search?q=` | Global search across all entities |

### Backup Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/backup/export` | Download full backup (single JSON document, `schema: "sqlite-v1"`; admin) |
| POST | `/api/backup/import` | Restore a `sqlite-v1` backup (replaces all tables in one transaction; admin) |

### Import/Export Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/import/template/:entity` | Download CSV/JSON import template |
| POST | `/api/import/:entity` | Import CSV/JSON data for entity |
| GET | `/api/export/:entity` | Export entity data as CSV/JSON |

### Utility Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check endpoint |
| GET | `/api/subnet-calculator?cidr=` | Calculate subnet info from CIDR |

### Topology Route

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/topology` | Get switch connection graph for topology view |

### Dashboard Route

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/stats` | Get all dashboard KPI data |

---

## 4. Request Validation

All API routes validate incoming requests using **Zod** schemas.

### Validation Location

- Request validation happens in API route handlers
- Zod schemas live alongside the API routes or in `server/validators/`
- Domain types in `types/` remain plain TypeScript interfaces
- Zod schemas are the source of runtime validation

### Validation Pattern

```typescript
// server/api/switches/index.post.ts
import { z } from 'zod'

const createSwitchSchema = z.object({
  name: z.string().min(1).max(100),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  // ...
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = createSwitchSchema.parse(body)
  // ... call repository
})
```

### Validation Error Response

Zod validation errors are caught and returned as structured error responses (see section 5).

---

## 5. Error Response Format

All API errors follow a consistent format:

```typescript
interface ApiError {
  status: number
  message: string
  errors?: ValidationError[]
}

interface ValidationError {
  field: string
  message: string
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | Deleted (DELETE) |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized (future: viewer role) |
| 404 | Entity not found |
| 409 | Conflict (duplicate IP, duplicate VLAN ID, etc.) |
| 500 | Internal server error |

### Error Examples

```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "ip_address", "message": "Invalid IPv4 format" },
    { "field": "name", "message": "Name is required" }
  ]
}
```

```json
{
  "status": 409,
  "message": "IP address 10.0.1.50 is already allocated in network 'Server-Net'"
}
```

---

## 6. Authentication & Authorization

### Technology

- **bcrypt** for password hashing
- **JWT** for session tokens
- Tokens stored client-side (httpOnly cookie)

### JWT Token

| Field | Value |
|-------|-------|
| `sub` | User ID |
| `username` | Username |
| `role` | User role |
| `iat` | Issued at |
| `exp` | Expiration |

### Token Expiration

- Default: **7 days**
- With "Remember me": **30 days**
- `JWT_SECRET` from environment variable

### Auth Middleware

- All API routes (except `/api/auth/setup`, `/api/auth/login`, `/api/health`) require a valid JWT
- Middleware extracts user from token and attaches to event context
- Setup wizard is only accessible when `settings.setup_completed === false`

### Setup Wizard Flow

1. On first start: the AppSettings row has `setup_completed: false`
2. User is redirected to setup page
3. Setup page creates admin user via `POST /api/auth/setup`
4. `setup_completed` is set to `true`
5. Setup endpoint becomes inaccessible

### Role-Based Access (Future)

- MVP: all authenticated users have full access
- Later: `viewer` role can only read, `admin` can read and write
- Role check happens in API middleware

---

## 7. Search Implementation

### Approach

Server-side search via `/api/search?q=<query>`.

### Searchable Fields

| Entity | Fields |
|--------|--------|
| Switch | name, model, manufacturer, serial_number, management_ip, location, notes |
| VLAN | vlan_id (as string), name, description, routing_device |
| Network | name, subnet, description |
| Port | label, description, connected_device, mac_address |
| IPAllocation | ip_address, hostname, mac_address, description |

### Search Logic

- Case-insensitive substring match
- Search across all entities in parallel
- Return grouped results: `{ switches: [...], vlans: [...], networks: [...], ports: [...], allocations: [...] }`
- Limit results per entity type (e.g., max 10 per type)
- Port results include parent switch reference

---

## 8. Backup & Restore

### Export

- `GET /api/backup/export` (`server/api/backup/export.get.ts`) returns one JSON document: `{ version, created_at, schema: "sqlite-v1", data: { sites, users, switches, switchGroups, ports, vlans, networks, ipAllocations, ipRanges, layoutTemplates, lagGroups, activity, settings, publicTokens, topologyLayouts, oidcConfig, patchPanels, patchPanelSockets, patchPanelTokens } }`; field shapes match the SQLite columns
- Filename format: `ezswm-backup-YYYY-MM-DD.json`
- Triggered manually via UI button; the file contains password hashes and the encrypted OIDC secret and must be treated as confidential
- `GET /api/data/export` is the narrower inventory export (no users/OIDC), not a restorable full backup

### Import/Restore

- `POST /api/backup/import` accepts the `sqlite-v1` JSON document (`restoreAll` in `server/utils/dataRestore.ts`); unsupported schemas are rejected
- **Overwrites** all current data: every table is wiped and bulk-inserted in FK-safe order inside a single `prisma.$transaction` (failures roll back); confirmation dialog in the UI
- No automatic pre-restore copy is created by this endpoint; the container entrypoint only keeps pre-upgrade database copies in `DATA_DIR/backups/` on version changes

---

## 9. Data Import/Export

### Import Templates

Downloadable template files per entity:

| Entity | CSV Template | JSON Template |
|--------|-------------|---------------|
| Switch | `switch-template.csv` | `switch-template.json` |
| VLAN | `vlan-template.csv` | `vlan-template.json` |
| Network | `network-template.csv` | `network-template.json` |
| IPAllocation | `ip-allocation-template.csv` | `ip-allocation-template.json` |

### Import Process

1. User uploads CSV or JSON file
2. Server parses and validates each row using Zod schemas
3. Returns validation report: `{ valid: number, errors: [{ row: number, field: string, message: string }] }`
4. User confirms import of valid rows
5. Valid rows are created via repository

### Import Limits

- Maximum file size: **5MB**
- Maximum rows: **5000**

### Export

- Per-entity export as CSV or JSON
- Includes all fields except internal IDs (optional: include IDs)

---

## 10. Undo Support

### Mechanism

- Activity entries store `previous_state` (full entity snapshot before change)
- `POST /api/activity/:id/undo` restores the previous state
- Only the most recent action per entity can be undone
- Create actions are undone by deleting the entity
- Delete actions are undone by recreating with previous state
- Update actions are undone by restoring previous state

### Limitations

- Undo is best-effort: if the entity has been modified since, undo may conflict
- Cascade effects (bidirectional links, etc.) may not be fully reversible
- Undo is only available for the last action (no multi-step undo)

---

## 11. Subnet Calculator

### Endpoint

`GET /api/subnet-calculator?cidr=10.0.1.0/24`

### Response

```json
{
  "cidr": "10.0.1.0/24",
  "network_address": "10.0.1.0",
  "broadcast_address": "10.0.1.255",
  "subnet_mask": "255.255.255.0",
  "wildcard_mask": "0.0.0.255",
  "first_usable": "10.0.1.1",
  "last_usable": "10.0.1.254",
  "total_hosts": 256,
  "usable_hosts": 254,
  "prefix_length": 24
}
```

### IPv4 Only

IPv6 support is not included in MVP. Architecture allows adding it later.
