# SPEC: Frontend

This document defines the UI architecture, pages, components, composables, layout, and user experience for ezSWM.

Related documents:
- [SPEC_DATA_MODEL.md](SPEC_DATA_MODEL.md)
- [SPEC_BACKEND.md](SPEC_BACKEND.md)
- [SPEC_INFRASTRUCTURE.md](SPEC_INFRASTRUCTURE.md)

---

## 1. UI Framework & Layout

### Base

- **Nuxt UI v2** with official Dashboard template structure
- Reference: https://github.com/nuxt-ui-templates/dashboard
- Do NOT create a custom dashboard shell

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│ Header (search, user menu, theme toggle)        │
├──────────┬──────────────────────────────────────┤
│          │ Breadcrumbs                          │
│ Sidebar  │──────────────────────────────────────│
│ (nav)    │                                      │
│          │ Page Content                         │
│          │                                      │
│          │                                      │
│          │                                      │
│          │                                      │
├──────────┴──────────────────────────────────────┤
│ Footer (version info)                           │
└─────────────────────────────────────────────────┘
```

### Requirements

- Sidebar navigation (collapsible on mobile)
- Header bar with global search, user menu, theme toggle
- Breadcrumb navigation (Dashboard > Switches > Switch-01 > Port 5)
- Dark mode as default, toggle in settings
- Fully responsive: desktop, tablet, smartphone
- Footer with app version

---

## 2. Sidebar Navigation

### Structure

```
ezSWM (logo/text)
─────────────────
Dashboard
─────────────────
Switches
VLANs
Networks
─────────────────
Topology
Subnet Calculator
─────────────────
Import/Export
Backup
─────────────────
Settings
Users (admin only, later)
```

### Behavior

- Active page highlighted
- Collapsible to icons on small screens
- Sidebar items show entity count badges (optional)

---

## 3. Pages

### 3.1 Setup Wizard (`/setup`)

Shown only on first start when `setup_completed === false`.

- Step 1: Welcome message, app overview
- Step 2: Create admin account (username, display name, password, language)
- Step 3: Confirmation, redirect to login

### 3.2 Login (`/login`)

- Username + password fields
- "Remember me" checkbox (7 days vs 30 days session)
- Language selector
- Redirect to dashboard after login

### 3.3 Dashboard (`/`)

Customizable dashboard with rearrangeable and hideable widgets.

#### KPI Widgets

| Widget | Content |
|--------|---------|
| Switch Count | Total number of switches |
| Network Count | Total number of networks |
| VLAN Count | Total number of VLANs |
| IP Utilization | Per-network bar showing allocated/free/reserved |
| Port Status | Breakdown by up/down/disabled across all switches |
| Undocumented Switches | Progress bar: switches with all ports documented vs total |
| Orphan VLANs | VLANs without any assigned network |
| High Usage Warning | Networks with >80% IP utilization |
| Duplicate IPs | List of conflicting IP addresses |
| Recent Activity | Activity feed (last N changes) |

#### Favorites Section

- Pinned switches and networks shown at the top
- Quick access cards with key info

#### Dashboard Customization

- Drag & drop widget reordering
- Toggle widgets on/off
- Preferences saved per user in `UserPreferences`

### 3.4 Switches List (`/switches`)

- Paginated table with columns: name, model, location, management_ip, port count, status summary
- Filters: location, manufacturer, model
- Search within list
- Actions: create new, bulk actions
- Favorite toggle (star icon)

### 3.5 Switch Detail (`/switches/:id`)

Two main sections:

#### Info Panel
- Switch metadata (name, model, manufacturer, serial, location, management IP, firmware, notes)
- Edit inline or via edit mode
- Duplicate button
- Delete button (with confirmation)

#### Port Visualization
- Visual switch front panel based on LayoutTemplate
- Ports rendered with recognizable shapes (RJ45 vs SFP distinguishable)
- Color-coded by VLAN color
- Trunk ports visually distinct (striped pattern or badge)
- Ports with LAG membership indicated
- Unit separation for stacked switches (visual divider + label)
- Click port → opens **side panel** with port details

#### Port Side Panel
- Shows all port fields
- Edit port details inline
- VLAN selection (native + tagged)
- Connected device (freetext or switch reference dropdown)
- LAG group assignment
- Save/cancel actions

#### Port Bulk Edit
- Select multiple ports (checkbox or range selection)
- Bulk actions: set VLAN, set status, set speed, clear description

### 3.6 Switch Create (`/switches/create`)

- Form: name, model, manufacturer, serial, location, rack_position, management_ip, firmware, notes
- LayoutTemplate selector (dropdown with preview)
- On save: redirect to detail page
- Ports auto-generated from template

### 3.7 VLANs List (`/vlans`)

- Paginated table: VLAN ID, name, color (swatch), status, routing device, network count
- Filters: status (active/inactive)
- Color swatch in each row
- Actions: create, edit, delete

### 3.8 VLAN Detail (`/vlans/:id`)

- VLAN metadata with color swatch
- List of associated networks
- List of ports using this VLAN (grouped by switch)
- Edit, delete actions

### 3.9 VLAN Create/Edit (`/vlans/create`, `/vlans/:id/edit`)

- Form: VLAN ID, name, description, status, routing device
- Color picker: auto-suggested from pool, or free choice
- Color uniqueness validated in real-time

### 3.10 Networks List (`/networks`)

- Paginated table: name, subnet, gateway, VLAN (with color), IP utilization bar
- Filters: VLAN, utilization level
- Favorite toggle

### 3.11 Network Detail (`/networks/:id`)

Three sections:

#### Info Panel
- Network metadata
- Associated VLAN (with color)
- Subnet info (calculated: network address, broadcast, usable range, total hosts)

#### IP Utilization Bar
- Visual bar showing the entire subnet
- Color-coded segments: allocated (by status), ranges (by type), free space
- Clickable segments for details

#### IP Allocations Table
- Paginated table: IP, hostname, MAC, device type, status, description
- Create/edit/delete actions
- Duplicate IP warnings highlighted

#### IP Ranges Table
- Table: start IP, end IP, type, description
- Visual range bar
- Create/edit/delete actions

### 3.12 Network Create (`/networks/create`)

- Form: name, VLAN (optional dropdown), subnet (CIDR), gateway (optional), DNS servers, description
- Subnet validation in real-time
- Gateway validation (must be in subnet)

### 3.13 Topology (`/topology`)

- Visual network diagram showing switch-to-switch connections
- Tree layout (Core → Distribution → Access) as default
- Auto-layout with manual drag & drop repositioning
- Connection lines show which VLANs traverse the uplink (VLAN colors on lines)
- LAG connections shown as thicker/double lines
- Click switch node → navigate to switch detail
- Export as **PDF** or **PNG**

### 3.14 Subnet Calculator (`/tools/subnet-calculator`)

- Input: CIDR notation (e.g., 10.0.1.0/24)
- Output:
  - Network address
  - Broadcast address
  - Subnet mask
  - Wildcard mask
  - First/last usable IP
  - Total hosts
  - Usable hosts
- Real-time calculation as user types

### 3.15 Import/Export (`/import-export`)

- Tab-based UI: Import | Export

#### Import Tab
- Select entity type (switches, VLANs, networks, IP allocations)
- Download template button (CSV or JSON)
- File upload area (drag & drop or click)
- Validation results table: row number, status (valid/error), error details
- Confirm import button (imports valid rows only)

#### Export Tab
- Select entity type
- Select format (CSV or JSON)
- Download button

### 3.16 Backup (`/backup`)

- **Export**: "Download Backup" button → ZIP download
- **Restore**: Upload ZIP file, confirmation dialog ("This will overwrite all data"), pre-restore backup created automatically

### 3.17 Settings (`/settings`)

Tabs: General | Account | Users (admin, later)

#### General Tab
- App name
- App logo upload
- Default VLAN for new ports
- Default port status for new ports
- Pagination size
- Port speed list (add/remove values)
- Dark mode toggle

#### Account Tab
- Change display name
- Change password
- Language selection (EN/DE)

#### Users Tab (future, admin only)
- List users
- Create/edit/delete users
- Assign roles

### 3.18 Layout Templates (`/layout-templates`)

- List of templates: name, manufacturer, model, unit count, total ports
- Create/edit/delete
- Visual preview of template layout
- Export/import buttons

### 3.19 Layout Template Editor (`/layout-templates/:id/edit`)

- Visual editor for defining units and blocks
- Add/remove units
- Per unit: add/remove blocks
- Per block: type, count, start_index, rows, label
- Live preview of resulting switch layout
- Validation: no overlapping port indices

---

## 4. Components

### Layout Components

| Component | Description |
|-----------|-------------|
| `AppSidebar` | Sidebar navigation with links and badges |
| `AppHeader` | Header with search, user menu, theme toggle |
| `AppBreadcrumbs` | Dynamic breadcrumb navigation |
| `AppFooter` | Footer with version info |

### Switch Components

| Component | Description |
|-----------|-------------|
| `SwitchPortGrid` | Visual switch front panel renderer |
| `SwitchPortItem` | Individual port in the grid (shape, color, status) |
| `SwitchPortSidePanel` | Side panel for editing port details |
| `SwitchPortBulkEditor` | Bulk edit panel for multiple ports |
| `SwitchInfoCard` | Switch metadata display/edit card |
| `SwitchUnitDivider` | Visual separator between stack units |

### VLAN Components

| Component | Description |
|-----------|-------------|
| `VlanColorSwatch` | Small color circle/square for VLAN display |
| `VlanColorPicker` | Color selection with pool + free picker |
| `VlanBadge` | VLAN ID + name + color badge |

### Network Components

| Component | Description |
|-----------|-------------|
| `SubnetUtilizationBar` | Visual bar showing IP allocation within subnet |
| `IpAllocationTable` | Paginated table of IP allocations |
| `IpRangeTable` | Table of IP ranges with visual bars |
| `SubnetInfoCard` | Calculated subnet information display |

### Topology Components

| Component | Description |
|-----------|-------------|
| `TopologyCanvas` | Main topology diagram canvas |
| `TopologySwitchNode` | Switch node in the diagram |
| `TopologyLink` | Connection line with VLAN info |
| `TopologyExportButton` | PDF/PNG export button |

### Layout Template Components

| Component | Description |
|-----------|-------------|
| `TemplateEditor` | Visual editor for layout templates |
| `TemplatePreview` | Live preview of template layout |
| `TemplateUnitEditor` | Editor for a single unit's blocks |
| `TemplateBlockEditor` | Editor for a single block (type, count, rows) |

### Shared Components

| Component | Description |
|-----------|-------------|
| `EntityTable` | Reusable paginated, filterable, sortable table |
| `ConfirmDialog` | Reusable confirmation dialog with affected entity list |
| `EmptyState` | Welcome/guidance display when no data exists |
| `FavoriteToggle` | Star/pin toggle button |
| `SearchGlobal` | Global search in header |
| `ImportUploader` | File upload with validation results |
| `DashboardWidget` | Wrapper for dashboard KPI widgets |

---

## 5. Composables

### Data Composables

| Composable | Description |
|------------|-------------|
| `useSwitches()` | CRUD operations for switches |
| `useSwitch(id)` | Single switch with ports |
| `useVlans()` | CRUD operations for VLANs |
| `useNetworks()` | CRUD operations for networks |
| `useIpAllocations(networkId)` | Allocations within a network |
| `useIpRanges(networkId)` | Ranges within a network |
| `useLayoutTemplates()` | CRUD for layout templates |
| `useLagGroups(switchId)` | LAG groups for a switch |
| `useActivity()` | Activity feed data |
| `useUsers()` | User management |
| `useSettings()` | App settings |

### UI Composables

| Composable | Description |
|------------|-------------|
| `useAuth()` | Login, logout, current user, JWT management |
| `useSearch()` | Global search state and results |
| `useDashboard()` | Dashboard stats and widget preferences |
| `useSubnetCalculator()` | Subnet calculation logic |
| `useTopology()` | Topology graph data and layout |
| `useImportExport()` | Import/export file handling |
| `useBackup()` | Backup export/import |

---

## 6. Internationalization (i18n)

### Configuration

- Default language: **English**
- Available: English, German
- Language stored per user
- Locale files: `i18n/locales/en.json`, `i18n/locales/de.json`

### Translation Scope

Everything is translated:

- Navigation labels
- Page titles
- Form labels and placeholders
- Button texts
- Validation error messages
- Toast notifications (success + error)
- Tooltips
- Empty state messages
- Confirmation dialogs
- Table column headers
- Dashboard widget titles

### Locale Key Structure

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "switches": "Switches",
    "vlans": "VLANs",
    "networks": "Networks",
    "topology": "Topology",
    "tools": "Tools",
    "subnetCalculator": "Subnet Calculator",
    "importExport": "Import/Export",
    "backup": "Backup",
    "settings": "Settings",
    "users": "Users"
  },
  "switches": {
    "title": "Switches",
    "create": "Create Switch",
    "edit": "Edit Switch",
    "delete": "Delete Switch",
    "duplicate": "Duplicate Switch",
    "fields": {
      "name": "Name",
      "model": "Model",
      "manufacturer": "Manufacturer",
      ...
    },
    "messages": {
      "created": "Switch created successfully",
      "updated": "Switch updated successfully",
      "deleted": "Switch deleted successfully",
      "duplicated": "Switch duplicated successfully"
    }
  },
  ...
}
```

---

## 7. Notifications

### Toast Notifications

- **Success**: green, shown for 3 seconds, auto-dismiss
  - "Switch 'Core-01' created successfully"
- **Error**: red, persistent until dismissed
  - "IP address 10.0.1.50 is already allocated in network 'Server-Net'"
- **Warning**: yellow, shown for 5 seconds
  - "Network 'Server-Net' has >80% IP utilization"
- **Info**: blue, shown for 3 seconds
  - "Backup downloaded successfully"

### Confirmation Dialogs

Used for:
- Deleting any entity
- Deleting entities with references (shows affected entity list)
- Bulk port changes
- Backup restore (overwrites all data)
- Import confirmation

---

## 8. Dark Mode

- **Default**: Dark mode enabled
- Toggle: available in settings page
- Implementation: Nuxt UI built-in dark mode via `useColorMode()`
- Preference stored per user
- All components must support both modes

---

## 9. Responsive Design

### Breakpoints

Follow Nuxt UI / Tailwind defaults:
- `sm`: 640px (smartphone landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (wide desktop)

### Mobile Behavior

- Sidebar: collapses to hamburger menu
- Tables: horizontal scroll or card layout on small screens
- Port visualization: horizontal scroll, touch-friendly port selection
- Topology: pinch to zoom, drag to pan
- Side panels: become full-screen overlays on mobile
- Dashboard widgets: stack vertically

---

## 10. Print View

### Switch Detail Print

- Optimized CSS for printing switch detail page
- Port grid rendered in print-friendly layout (black & white compatible, VLAN info as text)
- Switch metadata included
- Port table with all details
- Hide navigation, header, footer
- Triggered via browser print or "Print" button

---

## 11. Empty States

When no data exists for a page, show a friendly empty state:

| Page | Empty State Message | Action |
|------|-------------------|--------|
| Dashboard | "Welcome to ezSWM! Start by creating your first switch." | Button: "Create Switch" |
| Switches | "No switches yet. Create your first switch to get started." | Button: "Create Switch" |
| VLANs | "No VLANs defined yet." | Button: "Create VLAN" |
| Networks | "No networks configured yet." | Button: "Create Network" |
| Topology | "No switch connections found. Connect switches to see the topology." | Link: "Go to Switches" |
| Layout Templates | "No layout templates yet. Create a template for your switch models." | Button: "Create Template" |

---

## 12. Form Behavior

- After creating an entity: redirect to **detail page**
- After updating: stay on current page, show success toast
- Unsaved changes: warn before navigation ("You have unsaved changes")
- Validation: real-time as user types (debounced)
- Required fields marked with asterisk
- Error messages shown below fields

---

## 13. Pagination

- Classic pagination with page numbers
- URL parameter: `?page=1&per_page=25`
- Per-page count configurable in settings (default: 25)
- Shown below tables: "Showing 1-25 of 150 entries"
- Page navigation: First, Prev, 1, 2, 3, ..., Next, Last

---

## 14. Filtering

Available on all list pages:

### Filter UI
- Filter bar above table
- Dropdown/select filters for enum fields
- Text input for freetext search within list
- Active filters shown as removable chips
- "Clear all filters" button

### Filterable Fields per Entity

| Entity | Filterable Fields |
|--------|------------------|
| Switch | location, manufacturer, model, is_favorite |
| VLAN | status, has_networks (yes/no) |
| Network | vlan_id, utilization level |
| IPAllocation | status, device_type |
| IPRange | type |
