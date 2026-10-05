# SPEC: Data Model

This document defines all domain entities, their fields, relationships, validation rules, and storage schema for ezSWM.

> **Storage status:** primary persistence is SQLite via Prisma. `prisma/schema.prisma` (and `prisma/migrations/`) is the authoritative table/column definition; the entity tables below describe the logical model and may lag behind newer columns and entities (Site, SwitchGroup, PatchPanel*, PublicToken, OidcConfig, OidcLoginTxn, TopologyLayout, local/OIDC user fields). The earlier one-JSON-file-per-entity design (`users.json`, `switches.json`, …) is historical; those files are only read by the one-shot legacy migration. Array/object fields are stored as JSON strings inside SQLite columns and (de)serialised in repositories; this is column serialisation within the primary database, not JSON file storage.

Related documents:
- [SPEC_BACKEND.md](SPEC_BACKEND.md)
- [SPEC_FRONTEND.md](SPEC_FRONTEND.md)
- [SPEC_INFRASTRUCTURE.md](SPEC_INFRASTRUCTURE.md)

---

## 1. Entity Overview

| Entity | Description | Prisma model / legacy JSON file |
|--------|-------------|-----------|
| User | Application user account | `User` (legacy `users.json`) |
| Switch | Physical or logical switch | `Switch` (legacy `switches.json`) |
| Port | Individual port on a switch | `Port` table (legacy: embedded in `switches.json`) |
| VLAN | Virtual LAN definition | `Vlan` (legacy `vlans.json`) |
| Network | IP subnet, optionally linked to a VLAN | `Network` (legacy `networks.json`) |
| IPAllocation | Single IP assignment within a network | `IpAllocation` (legacy `ip-allocations.json`) |
| IPRange | IP address range within a network | `IpRange` (legacy `ip-ranges.json`) |
| LayoutTemplate | Reusable switch model definition | `LayoutTemplate`; units/blocks are a JSON string in `units` (legacy `layout-templates.json`) |
| LayoutBlock | Group of ports within a template | Nested inside the `LayoutTemplate.units` JSON string |
| LAGGroup | Link aggregation group | `LagGroup` (legacy `lag-groups.json`) |
| ActivityEntry | Activity feed entry | `ActivityEntry` (legacy `activity.json`) |
| AppSettings | Global application settings | `AppSettings` singleton row, id `singleton` (legacy `settings.json`) |
| UserPreferences | Per-user preferences | Fields on `User` (legacy: embedded in `users.json`) |

---

## 2. ID Format

Entity IDs are **UUIDs** (v4, string) generated server-side with `randomUUID()` from `node:crypto` in the repositories (for example `siteRepository.ts`, `switchRepository.ts`, `userRepository.ts`).

- Exceptions (not UUIDs): the singleton rows `AppSettings` and `OidcConfig` use the fixed id `"singleton"`; `TopologyLayout` is keyed by its `site_id`.
- Public access token values (`PublicToken.token`, `PatchPanelToken.token`) are separate secrets generated with `nanoid(32)`; they are not entity IDs.
- Field tables below that say `string (UUID)` refer to these IDs.

### Historical ID format (nanoid)

The original design (and legacy JSON data from before 0.21.0) used **nanoid** IDs:

- Length: 21 characters (nanoid default)
- Format: URL-safe characters (A-Za-z0-9_-)

The legacy migration remaps nanoid IDs to UUIDs (`server/utils/idMapping.ts`), and full-backup restore rejects nanoid-shaped IDs (`server/api/backup/import.post.ts`).

---

## 3. Timestamp Convention

All entities with `created_at` and `updated_at` fields:

- Stored as **ISO 8601 UTC** strings (e.g., `"2026-03-16T14:30:00.000Z"`)
- Displayed in the UI according to user locale settings
- `created_at` is set once on creation
- `updated_at` is set on every modification

---

## 4. Entity: User

Represents an application user account.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `username` | string | yes | Login name, unique |
| `display_name` | string | yes | Display name in UI |
| `password_hash` | string | yes | bcrypt hashed password |
| `role` | enum | yes | `admin` \| `viewer` (MVP: all users are `admin`) |
| `language` | enum | yes | `en` \| `de` — per-user language setting |
| `is_setup_user` | boolean | yes | Whether this is the initial setup admin |
| `created_at` | string (ISO 8601) | yes | Creation timestamp |
| `updated_at` | string (ISO 8601) | yes | Last modification timestamp |

### Validation Rules

- `username`: 3-50 characters, alphanumeric + underscore, unique
- `display_name`: 1-100 characters
- `password`: minimum 8 characters (before hashing)
- `role`: MVP defaults to `admin`, `viewer` role planned for later

---

## 5. Entity: Switch

Represents a physical or logical (stacked) network switch.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `name` | string | yes | Hostname of the switch |
| `model` | string | no | Model designation |
| `manufacturer` | string | no | Manufacturer name |
| `serial_number` | string | no | Serial number |
| `location` | string | no | Freetext location (building, room, hall) |
| `rack_position` | string | no | Position in rack |
| `management_ip` | string | no | Management IPv4 address |
| `firmware_version` | string | no | Firmware version |
| `layout_template_id` | string (UUID) | no | Reference to LayoutTemplate |
| `ports` | Port[] | yes | Array of port objects |
| `is_favorite` | boolean | yes | Pinned to dashboard (default: false) |
| `notes` | string | no | Freetext notes |
| `created_at` | string (ISO 8601) | yes | Creation timestamp |
| `updated_at` | string (ISO 8601) | yes | Last modification timestamp |

### Validation Rules

- `name`: 1-100 characters, unique across all switches
- `management_ip`: valid IPv4 format if provided
- `layout_template_id`: must reference existing LayoutTemplate if provided
- `ports`: initialized from LayoutTemplate on creation if template is set

---

## 6. Entity: Port

Stored in the separate `Port` table (legacy JSON: embedded within a Switch). Represents a single port on a switch.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `unit` | number | yes | Stack unit number (1-based) |
| `index` | number | yes | Port index within unit (1-based) |
| `label` | string | no | Display name (e.g., "Gi0/1") |
| `type` | enum | yes | `rj45` \| `sfp` \| `sfp+` \| `console` \| `management` |
| `speed` | enum | no | `100M` \| `1G` \| `10G` \| `25G` \| `40G` \| `100G` |
| `status` | enum | yes | `up` \| `down` \| `disabled` (default: `down`) |
| `native_vlan` | number | no | Untagged/native VLAN ID |
| `tagged_vlans` | number[] | yes | Array of tagged VLAN IDs (default: []) |
| `connected_device` | string | no | Freetext or reference to another switch name |
| `connected_device_id` | string (UUID) | no | Reference to another Switch (for auto-bidirectional links) |
| `connected_port_id` | string (UUID) | no | Reference to the port on the connected switch |
| `connected_port` | string | no | Port label on the connected device (freetext fallback) |
| `description` | string | no | Freetext description |
| `mac_address` | string | no | MAC address of connected device |
| `lag_group_id` | string (UUID) | no | Reference to LAGGroup |

### Validation Rules

- `unit`: positive integer
- `index`: positive integer, unique within same unit on same switch
- `native_vlan`: valid VLAN ID (1-4094) if provided, must reference existing VLAN
- `tagged_vlans`: each must be valid VLAN ID (1-4094), must reference existing VLANs
- `speed`: must be from configured speed list (extendable via settings)
- `connected_device_id` + `connected_port_id`: if set, bidirectional link is created automatically

### Port Display Logic

- **Access Port**: has `native_vlan` only, no `tagged_vlans` → shown with solid VLAN color
- **Trunk Port**: has `tagged_vlans` (and optionally `native_vlan`) → shown with distinct visual (striped/icon)

---

## 7. Entity: VLAN

Represents a Virtual LAN definition. Separate from Network.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `vlan_id` | number | yes | VLAN number (1-4094) |
| `name` | string | yes | VLAN name (e.g., "Server", "Voice") |
| `description` | string | no | Freetext description |
| `status` | enum | yes | `active` \| `inactive` (default: `active`) |
| `routing_device` | string | no | Where routing happens (e.g., "Core-Switch-01", "Firewall-01") |
| `color` | string | yes | Hex color code for UI visualization |
| `is_favorite` | boolean | yes | Pinned to dashboard (default: false) |
| `created_at` | string (ISO 8601) | yes | Creation timestamp |
| `updated_at` | string (ISO 8601) | yes | Last modification timestamp |

### Validation Rules

- `vlan_id`: integer 1-4094, unique across all VLANs
- `name`: 1-100 characters
- `color`: valid hex color (e.g., `#FF5733`), unique across all VLANs
- On creation: auto-suggest next available color from pool of 25 predefined colors
- After pool exhaustion: user picks via color picker, uniqueness still enforced

### VLAN Color Pool (25 predefined colors)

```
#E74C3C  #E67E22  #F1C40F  #2ECC71  #1ABC9C
#3498DB  #9B59B6  #34495E  #E84393  #00CEC9
#6C5CE7  #FDCB6E  #FF7675  #74B9FF  #A29BFE
#55EFC4  #81ECEC  #DFE6E9  #636E72  #B2BEC3
#FAB1A0  #FF9FF3  #48DBFB  #C8D6E5  #FFA502
```

### Deletion Behavior

When deleting a VLAN that is referenced by ports or networks:
- Show confirmation dialog listing all affected entities
- User decides: cancel or cascade delete references

---

## 8. Entity: Network

Represents an IP subnet. Optionally linked to a VLAN. A VLAN can have 0, 1, or many Networks.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `name` | string | yes | Network name (e.g., "Server-Net Building A") |
| `vlan_id` | string (UUID) | no | Reference to VLAN entity (optional) |
| `subnet` | string | yes | CIDR notation (e.g., "10.0.1.0/24") |
| `gateway` | string | no | Gateway IPv4 address (optional, e.g., /31 has none) |
| `dns_servers` | string[] | yes | DNS server IPs (default: []) |
| `description` | string | no | Freetext description |
| `is_favorite` | boolean | yes | Pinned to dashboard (default: false) |
| `created_at` | string (ISO 8601) | yes | Creation timestamp |
| `updated_at` | string (ISO 8601) | yes | Last modification timestamp |

### Validation Rules

- `name`: 1-100 characters
- `subnet`: valid IPv4 CIDR notation
- `gateway`: valid IPv4 address within the subnet, if provided
- `dns_servers`: each must be valid IPv4 address
- `vlan_id`: must reference existing VLAN if provided

### Deletion Behavior

When deleting a Network that has IPAllocations or IPRanges:
- Show confirmation dialog listing affected entities
- User decides: cancel or cascade delete

---

## 9. Entity: IPAllocation

Represents a single IP address assignment within a Network.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `network_id` | string (UUID) | yes | Reference to Network |
| `ip_address` | string | yes | IPv4 address |
| `hostname` | string | no | Hostname of the device |
| `mac_address` | string | no | MAC address |
| `device_type` | enum | no | `server` \| `switch` \| `printer` \| `phone` \| `ap` \| `camera` \| `other` |
| `description` | string | no | Freetext description |
| `status` | enum | yes | `active` \| `reserved` \| `inactive` (default: `active`) |
| `created_at` | string (ISO 8601) | yes | Creation timestamp |
| `updated_at` | string (ISO 8601) | yes | Last modification timestamp |

### Validation Rules

- `ip_address`: valid IPv4 address, must be within the referenced network's subnet
- **Duplicate IP detection**: `ip_address` must be unique across ALL networks (global uniqueness)
- `network_id`: must reference existing Network
- `mac_address`: valid MAC format if provided (XX:XX:XX:XX:XX:XX)

---

## 10. Entity: IPRange

Represents a range of IP addresses within a Network (static pool, DHCP pool, or reserved block).

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `network_id` | string (UUID) | yes | Reference to Network |
| `start_ip` | string | yes | Start of range (IPv4) |
| `end_ip` | string | yes | End of range (IPv4) |
| `type` | enum | yes | `static` \| `dhcp` \| `reserved` |
| `description` | string | no | Freetext description |
| `created_at` | string (ISO 8601) | yes | Creation timestamp |
| `updated_at` | string (ISO 8601) | yes | Last modification timestamp |

### Validation Rules

- `start_ip` and `end_ip`: valid IPv4 addresses, must be within the referenced network's subnet
- `start_ip` must be less than or equal to `end_ip`
- Ranges within the same network must not overlap
- `network_id`: must reference existing Network

---

## 11. Entity: LayoutTemplate

Reusable switch model definition. Users create and manage templates via the UI.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `name` | string | yes | Template name (e.g., "Cisco 2960-24T") |
| `manufacturer` | string | no | Manufacturer name |
| `model` | string | no | Model designation |
| `description` | string | no | Freetext description |
| `units` | LayoutUnit[] | yes | Array of stack units |
| `created_at` | string (ISO 8601) | yes | Creation timestamp |
| `updated_at` | string (ISO 8601) | yes | Last modification timestamp |

### Validation Rules

- `name`: 1-100 characters, unique across all templates
- `units`: at least 1 unit

### Export/Import

- Templates can be exported as JSON file for sharing between ezSWM instances
- Import validates schema and uniqueness before adding

---

## 12. Entity: LayoutUnit

Embedded within LayoutTemplate. Represents one physical unit in a stack.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `unit_number` | number | yes | Unit position in stack (1-based) |
| `label` | string | no | Display label (e.g., "Unit 1", "Top") |
| `blocks` | LayoutBlock[] | yes | Array of port blocks |

---

## 13. Entity: LayoutBlock

Embedded within LayoutUnit. Represents a group of identical ports.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `type` | enum | yes | `rj45` \| `sfp` \| `sfp+` \| `console` \| `management` |
| `count` | number | yes | Number of ports in this block |
| `start_index` | number | yes | Starting port index (1-based) |
| `rows` | number | yes | Number of rows for visual layout |
| `label` | string | no | Display label (e.g., "GigabitEthernet", "Uplink") |

### Validation Rules

- `count`: positive integer
- `start_index`: positive integer
- `rows`: positive integer, must evenly divide into `count` (e.g., 24 ports / 2 rows = 12 per row)
- Port indices must not overlap between blocks within the same unit

### Example: Cisco 2960-24T (single unit)

```json
{
  "id": "tpl_abc123",
  "name": "Cisco 2960-24T",
  "manufacturer": "Cisco",
  "model": "2960-24T",
  "units": [
    {
      "unit_number": 1,
      "label": "Unit 1",
      "blocks": [
        {
          "id": "blk_001",
          "type": "rj45",
          "count": 24,
          "start_index": 1,
          "rows": 2,
          "label": "GigabitEthernet"
        },
        {
          "id": "blk_002",
          "type": "sfp",
          "count": 2,
          "start_index": 25,
          "rows": 2,
          "label": "Uplink"
        }
      ]
    }
  ]
}
```

### Example: 2x 24-Port Stack

```json
{
  "id": "tpl_def456",
  "name": "Cisco 2960-24T Stack (2 units)",
  "manufacturer": "Cisco",
  "model": "2960-24T",
  "units": [
    {
      "unit_number": 1,
      "label": "Unit 1",
      "blocks": [
        { "id": "blk_010", "type": "rj45", "count": 24, "start_index": 1, "rows": 2, "label": "GigabitEthernet" },
        { "id": "blk_011", "type": "sfp", "count": 2, "start_index": 25, "rows": 2, "label": "Uplink" }
      ]
    },
    {
      "unit_number": 2,
      "label": "Unit 2",
      "blocks": [
        { "id": "blk_020", "type": "rj45", "count": 24, "start_index": 1, "rows": 2, "label": "GigabitEthernet" },
        { "id": "blk_021", "type": "sfp", "count": 2, "start_index": 25, "rows": 2, "label": "Uplink" }
      ]
    }
  ]
}
```

Port numbering restarts per unit: Unit 1 has ports 1-26, Unit 2 has ports 1-26.

---

## 14. Entity: LAGGroup

Represents a Link Aggregation Group (Port-Channel / LACP).

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `switch_id` | string (UUID) | yes | Reference to the Switch owning this LAG |
| `name` | string | yes | LAG name (e.g., "Po1", "LAG-to-Core") |
| `port_ids` | string[] | yes | Array of Port IDs that are members |
| `remote_device` | string | no | Freetext: what is on the other end |
| `remote_device_id` | string (UUID) | no | Reference to another Switch (if applicable) |
| `description` | string | no | Freetext description |
| `created_at` | string (ISO 8601) | yes | Creation timestamp |
| `updated_at` | string (ISO 8601) | yes | Last modification timestamp |

### Validation Rules

- `port_ids`: at least 2 ports, all must belong to the same switch
- `switch_id`: must reference existing Switch
- Ports in a LAG should have identical speed and VLAN configuration

---

## 15. Entity: ActivityEntry

Represents an entry in the global activity feed.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Unique identifier |
| `user_id` | string (UUID) | yes | Who performed the action |
| `action` | enum | yes | `create` \| `update` \| `delete` |
| `entity_type` | string | yes | Entity type (e.g., "switch", "vlan", "network") |
| `entity_id` | string (UUID) | yes | ID of the affected entity |
| `entity_name` | string | yes | Name/label of the affected entity (for display after deletion) |
| `changes` | object | no | Key-value of changed fields (for undo support) |
| `previous_state` | object | no | Full entity state before change (for undo support) |
| `timestamp` | string (ISO 8601) | yes | When the action occurred |

### Storage Rules

- Activity entries are append-only
- Maximum 1000 entries stored, oldest are pruned
- `previous_state` enables undo functionality

---

## 16. Entity: AppSettings

Global application settings, stored as the single `AppSettings` row (id `singleton`; legacy: one `settings.json` object).

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `app_name` | string | `"ezSWM"` | Application display name |
| `app_logo_url` | string | `null` | Custom logo URL (or null for default SVG) |
| `default_vlan` | number | `null` | Default VLAN ID for new ports |
| `default_port_status` | enum | `"down"` | Default status for new ports |
| `pagination_size` | number | `25` | Items per page in lists |
| `port_speeds` | string[] | `["100M","1G","10G","25G","40G","100G"]` | Available port speed options |
| `setup_completed` | boolean | `false` | Whether initial setup wizard has been completed |

---

## 17. Entity Relationship Diagram (Text)

```
User (standalone)

LayoutTemplate
  └── LayoutUnit[] (JSON string in `units`)
       └── LayoutBlock[] (nested in the JSON)

Switch
  ├── layout_template_id → LayoutTemplate
  └── Port[] (`Port` table; legacy JSON: embedded)
       ├── native_vlan → VLAN.vlan_id
       ├── tagged_vlans[] → VLAN.vlan_id
       ├── connected_device_id → Switch.id (bidirectional)
       ├── connected_port_id → Port.id (bidirectional)
       └── lag_group_id → LAGGroup.id

VLAN (standalone, referenced by vlan_id number)

Network
  └── vlan_id → VLAN.id (optional)

IPAllocation
  └── network_id → Network.id

IPRange
  └── network_id → Network.id

LAGGroup
  ├── switch_id → Switch.id
  ├── port_ids[] → Port.id
  └── remote_device_id → Switch.id (optional)

ActivityEntry
  └── user_id → User.id
```

### Key Relationship Rules

1. **VLAN ↔ Network**: 0..n Networks per VLAN, 0..1 VLAN per Network
2. **VLAN ↔ Port**: referenced by VLAN number (`vlan_id`), not entity ID
3. **Switch ↔ LayoutTemplate**: many Switches can reference one Template
4. **Switch ↔ Switch** (via Port): bidirectional links auto-managed
5. **Port ↔ LAGGroup**: a Port can belong to at most one LAG
6. **Network ↔ IPAllocation/IPRange**: cascade delete with user confirmation

---

## 18. Storage Layout and Legacy JSON Files

### Current storage (SQLite)

```
/app/data/
├── db.sqlite            # primary persistence (Prisma), plus -wal / -shm files
├── .version             # last started app version (docker-entrypoint.sh)
├── backups/             # pre-upgrade database copies (newest 5)
└── _archive_<ISO>/      # original legacy JSON files after the one-shot migration
```

- The database file is created/updated by `prisma migrate deploy` (migrations in `prisma/migrations/`).
- On startup, `server/plugins/initData.ts` ensures the singleton `AppSettings` row exists with defaults; it never overwrites existing data.
- Array/object columns are JSON strings (see header comment of `prisma/schema.prisma`).

### Legacy JSON files (historical, migration input only)

Earlier versions stored one JSON file per entity in `/app/data/` (`users.json`, `switches.json` with embedded ports, `vlans.json`, `networks.json`, `ip-allocations.json`, `ip-ranges.json`, `layout-templates.json`, `lag-groups.json`, `activity.json`, `settings.json`, and later `sites.json`, `public-tokens.json`, `topology-layouts.json`). If the database is empty and any of these exist, `server/migrations/jsonToPrisma.ts` imports them once and moves them to `_archive_<ISO>/`.

### JSON as exchange format

- Full backup: `GET /api/backup/export` / `POST /api/backup/import`, a single JSON document with `schema: "sqlite-v1"` whose field shapes match the SQLite columns.
- Inventory export `GET /api/data/export`, CSV/JSON entity import/export, and layout-template JSON export/import.

---

## 19. Cross-Entity Validation Rules

| Rule | Scope | Description |
|------|-------|-------------|
| Unique IP | Global | No two IPAllocations may have the same `ip_address` across all networks |
| IP in subnet | Per network | `ip_address` must fall within the network's `subnet` CIDR |
| Range in subnet | Per network | `start_ip` and `end_ip` must fall within the network's `subnet` |
| No range overlap | Per network | IP ranges within the same network must not overlap |
| Unique VLAN ID | Global | No two VLANs may have the same `vlan_id` number |
| Unique VLAN color | Global | No two VLANs may have the same `color` |
| Valid VLAN ref | Port | `native_vlan` and `tagged_vlans` must reference existing VLAN `vlan_id` values |
| Bidirectional link | Port pair | Setting `connected_device_id` + `connected_port_id` must update both sides |
| LAG port ownership | LAGGroup | All `port_ids` must belong to the same `switch_id` |
| Template port match | Switch | Port count must match template if template is assigned |
