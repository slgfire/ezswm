# Graph Report - /home/ezswm-claude  (2026-07-24)

## Corpus Check
- 411 files · ~369,424 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1955 nodes · 3106 edges · 174 communities (126 shown, 48 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- testHelpers ts
- subnets id vue
- jsonToPrisma ts
- ip addresses index vue
- userRepository ts
- SwitchPortSidePanel vue
- switches id vue
- scripts
- vlans index vue
- activityRepository ts
- subnets index vue
- switches index vue
- AppHeader vue
- TopologyGraph vue
- data management vue
- edit vue
- LagGroupSlideover vue
- layout templates create vue
- vlanRepository ts
- layout templates index vue
- networkRepository ts
- vlans id vue
- layoutTemplateRepository ts
- VLAN
- deviceLibrary ts
- PublicPortList vue
- switch ts
- Installation and Deployment Flow
- SwitchPortItem vue
- id index vue
- layoutTemplate ts
- settings vue
- siteId index vue
- switches create vue
- client ts
- ipAllocation ts
- SwitchPortBulkEditor vue
- sites index vue
- dependencies
- Repository Agent Instructions
- SwitchPortGrid vue
- types index ts
- SwitchPublicAccess vue
- subnets create vue
- utils changelog ts
- QuickCreateModal vue
- ipRangeRepository ts
- IpAddressForm vue
- setup vue
- switches print vue
- docs package json
- switchRepository ts
- LibraryImport vue
- TopologyDetailPanel vue
- VlanMultiSelect vue
- topology vue
- vlans create vue
- SiteSwitcher vue
- SwitchConfiguredVlans vue
- VlanRemoveConfirmDialog vue
- VlanDropdown vue
- dataRestore ts
- subnetCalculations ts
- topology ts
- qr print vue
- compilerOptions
- AppSidebar vue
- getNodeRole
- layoutTemplatePoe ts
- SwitchPortTable vue
- login vue
- sites create vue
- activityFormat ts
- Operations User Guide
- topology layout put ts
- jsonStorage ts
- AppBreadcrumbs vue
- ChangelogModal vue
- CopyButton vue
- fetchAllocations
- export entity get ts
- activity ts
- closeNetworkMoveDialog
- topologyRoleColors ts
- fetchSwitches
- emit
- useAuth ts
- auth vue
- subnet calculator vue
- Release History
- Switch Detail with Port
- opencode json
- device library search get
- ConfirmHost vue
- VlanColorSwatch vue
- useSlideoverGuard ts
- useUnsavedChanges ts
- onRowClick
- lagCopyName ts
- roleColors ts
- semver ts
- repowise
- nuxt d ts
- graphify js
- tsconfig json
- repowise
- seed demo sh
- template get ts
- FAQ and Troubleshooting
- GitHub Bug Report Template
- AppFooter vue
- ConfirmDialog vue
- default vue
- checkAllocationRefs
- loadNetwork
- bcryptjs
- better sqlite3
- docker entrypoint sh
- Switch Port Grid with
- Network Detail with IP
- Topology Detail with Connections
- VLAN Detail Side Panel
- ezSWM Gradient Logo with
- nuxt
- nuxt ui
- prisma adapter better sqlite3
- yaml
- zod
- ezSWM Apple Touch Icon
- ezSWM Logo Icon 192
- bump version sh
- template entity get ts
- publicTokenSchemas ts
- edit behavior spec ts
- Login Screen
- Settings General View
- Sites List View
- Subnet Calculator View

## God Nodes (most connected - your core abstractions)
1. `activityRepository` - 34 edges
2. `switchRepository` - 30 edges
3. `networkRepository` - 27 edges
4. `prisma` - 23 edges
5. `Port` - 23 edges
6. `vlanRepository` - 20 edges
7. `createTestPrisma()` - 20 edges
8. `LayoutTemplate` - 19 edges
9. `Switch` - 19 edges
10. `ipAllocationRepository` - 18 edges

## Surprising Connections (you probably didn't know these)
- `ezSWM Favicon Brand Mark` --conceptually_related_to--> `ezSWM Project`  [INFERRED]
  docs/public/favicon.svg → README.md
- `JSON Storage Constraint` --semantically_similar_to--> `SQLite Embedded Storage`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `ezSWM Gradient Logo with Wordmark` --semantically_similar_to--> `ezSWM Gradient Logo with Wordmark (Public)`  [INFERRED] [semantically similar]
  docs/public/logo.png → public/logo.png
- `LagSubGroup` --references--> `TopologyLink`  [EXTRACTED]
  app/components/topology/TopologyDetailPanel.vue → types/topology.ts
- `Architecture Rules` --conceptually_related_to--> `REST API Surface`  [INFERRED]
  CLAUDE.md → docs/api/reference.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Spec Document Set** — _ai_specs_spec_data_model_document, _ai_specs_spec_backend_document, _ai_specs_spec_frontend_document, _ai_specs_spec_infrastructure_document [EXTRACTED 1.00]
- **GitHub Automation Pipeline** — _github_dependabot_code, _github_workflows_ci_code, _github_workflows_docker_code, _github_workflows_docs_code, _github_workflows_release_tag_code [INFERRED 0.85]
- **Operator Documentation Bundle** — _ai_installation_document, _ai_user_guide_document, _ai_faq_document, _ai_api_reference_document [INFERRED 0.85]
- **Switch Management UI Views** — docs_public_images_screenshot_switches_switches_inventory_view, docs_public_images_screenshot_switch_detail_switch_detail_port_map, docs_public_images_screenshot_lag_portgrid_switch_port_grid_view, docs_public_images_screenshot_lag_highlight_switch_port_lag_highlight_view, docs_public_images_screenshot_templates_layout_templates_view [INFERRED 0.85]
- **Network VLAN Topology Views** — docs_public_images_screenshot_networks_networks_list_view, docs_public_images_screenshot_network_detail_network_detail_ip_overview, docs_public_images_screenshot_vlans_vlans_list_view, docs_public_images_screenshot_vlans_detail_vlan_detail_side_panel, docs_public_images_screenshot_topology_topology_graph_view, docs_public_images_screenshot_topology_detail_topology_detail_with_connections_panel [INFERRED 0.85]
- **Branding Asset Set** — docs_public_logo_ezswm_logo_gradient_with_wordmark, public_logo_ezswm_logo_gradient_with_wordmark, public_icon_192_ezswm_logo_icon_192, public_icon_512_ezswm_logo_icon_512, public_apple_touch_icon_ezswm_logo_touch_icon, public_favicon_ezswm_favicon_logo [INFERRED 0.95]

## Communities (174 total, 48 thin omitted)

### Community 0 - "testHelpers ts"
Cohesion: 0.06
Nodes (29): lagGroupRepository, LagRow, rowsToLags(), rowToLag(), publicTokenRepository, TokenRow, siteRepository, SiteRow (+21 more)

### Community 1 - "subnets id vue"
Cohesion: 0.03
Nodes (60): addPanelError, addPanelMode, allocDeleteRefs, allocForm, allocStatusOptions, associatedVlan, BadgeColor, breadcrumbOverrides (+52 more)

### Community 2 - "jsonToPrisma ts"
Cohesion: 0.06
Nodes (56): getCreatedAt(), getUpdatedAt(), Json, JSON_FILES, LegacyActivity, LegacyAllocation, LegacyLag, LegacyNetwork (+48 more)

### Community 3 - "ip addresses index vue"
Cohesion: 0.04
Nodes (44): allocStatusOptions, ApiError, BadgeColor, columns, currentMoveVlanLabel, deleteMessage, deleteTarget, deleting (+36 more)

### Community 4 - "userRepository ts"
Cohesion: 0.08
Nodes (23): PUBLIC_PATHS, settingsRepository, userRepository, UserRow, clearAuthCookie(), getTokenFromEvent(), hashPassword(), JwtPayload (+15 more)

### Community 5 - "SwitchPortSidePanel vue"
Cohesion: 0.04
Nodes (44): allAllocations, allNetworks, allocationOptions, allSwitches, allVlans, { apiFetch }, { confirm }, connectionMode (+36 more)

### Community 6 - "switches id vue"
Cohesion: 0.04
Nodes (37): { activities: switchActivity, fetchActivity }, breadcrumbOverrides, bulkEditorRef, canCreateLag, { confirm }, currentTemplateName, deleting, deletingLag (+29 more)

### Community 7 - "scripts"
Cohesion: 0.04
Nodes (45): eslint, @iconify-json/tabler, @nuxt/eslint, devDependencies, eslint, @iconify-json/tabler, @nuxt/eslint, @playwright/test (+37 more)

### Community 8 - "vlans index vue"
Cohesion: 0.05
Nodes (34): deleteMessage, deleteTarget, deleting, editForm, editFormRef, editStatusOptions, filteredItems, groupedItems (+26 more)

### Community 9 - "activityRepository ts"
Cohesion: 0.12
Nodes (17): activityRepository, ActivityRow, parseJsonOrUndefined(), rowToActivity(), createIpAllocationSchema, updateIpAllocationSchema, createNetworkSchema, updateNetworkSchema (+9 more)

### Community 10 - "subnets index vue"
Cohesion: 0.06
Nodes (27): deleteMessage, deleteTarget, deleting, filteredItems, groupedItems, initial, ipToNum(), { items: allSites, fetch: fetchAllSites } (+19 more)

### Community 11 - "switches index vue"
Cohesion: 0.06
Nodes (26): allItems, deleteMessage, deleteTarget, deleting, { items: allSites, fetch: fetchAllSites }, { items, loading: composableLoading, fetch: fetchSwitches, remove, duplicate }, loadData(), loading (+18 more)

### Community 12 - "AppHeader vue"
Cohesion: 0.07
Nodes (24): closeSearch(), colorMode, colorModeBtn, { currentSiteId: headerSiteId }, escapeHtml(), flatResults, hasResults, highlight() (+16 more)

### Community 13 - "TopologyGraph vue"
Cohesion: 0.06
Nodes (17): colorMode, edgeMap, eventHandlers, ghostMap, { graphConfigs }, graphEdges, graphLayouts, graphNodes (+9 more)

### Community 14 - "data management vue"
Cohesion: 0.07
Nodes (22): backupFile, entityTypeOptions, exportFormat, exportLoading, exportType, formatOptions, importFile, importParsedData (+14 more)

### Community 15 - "edit vue"
Cohesion: 0.07
Nodes (23): airflowOptions, breadcrumbOverrides, { clearDirty }, EditForm, errors, form, FormBlock, FormUnit (+15 more)

### Community 16 - "LagGroupSlideover vue"
Cohesion: 0.10
Nodes (25): { allVlans, vlanForm, vlanPortModeOptions, fetchVlans }, applyVlanConfig(), { confirm }, { create, update }, createOrUpdateLocalLag(), editingLag, emit, form (+17 more)

### Community 17 - "layout templates create vue"
Cohesion: 0.07
Nodes (23): activeTab, airflowOptions, { clearDirty }, cloneId, { create, getById }, errors, form, handleSubmit() (+15 more)

### Community 18 - "vlanRepository ts"
Cohesion: 0.17
Nodes (7): ipAllocationRepository, networkRepository, vlanRepository, VlanRow, resolveSiteIdQuery(), resolveSiteIdToUuid(), FakeEvent

### Community 19 - "layout templates index vue"
Cohesion: 0.08
Nodes (19): allItems, { apiFetch }, deleteTarget, filteredItems, handleDelete(), { items, loading, fetch, remove }, loadData(), manufacturerOptions (+11 more)

### Community 20 - "networkRepository ts"
Cohesion: 0.19
Nodes (19): RFC-3021, AllocationRow, assertDhcpRangeFree(), IPAllocationUpdateInput, NetworkRow, validateNetworkInputs(), syncManagementIpAllocation(), doRangesOverlap() (+11 more)

### Community 21 - "vlans id vue"
Cohesion: 0.08
Nodes (21): associatedNetworks, breadcrumbOverrides, deleting, editForm, editing, id, { items: allNetworks, fetch: fetchNetworks }, loading (+13 more)

### Community 22 - "layoutTemplateRepository ts"
Cohesion: 0.15
Nodes (12): buildExpectedPorts(), generatePortLabel(), layoutTemplateRepository, syncPortsToTemplate(), TemplateRow, airflowEnum, createLayoutTemplateSchema, layoutBlockSchema (+4 more)

### Community 23 - "VLAN"
Cohesion: 0.15
Nodes (9): emit, props, Wrapped, SiteWithCounts, enrichAllocations(), sites, Network, Site (+1 more)

### Community 24 - "deviceLibrary ts"
Cohesion: 0.17
Nodes (20): ExpectedPort, compareNatural(), convertNetboxToTemplate(), generateBlockId(), getNamePrefixForGrouping(), getTrailingNumber(), groupInterfacesToBlocks(), incrementMemberLabel() (+12 more)

### Community 25 - "PublicPortList vue"
Cohesion: 0.15
Nodes (20): activeFilter, filterChips, filteredPorts, getEffectiveUsage(), getHelperUsage(), getPortPurpose(), getPrimaryVlanColor(), getPrimaryVlanId() (+12 more)

### Community 26 - "switch ts"
Cohesion: 0.13
Nodes (7): emit, portStats, props, emit, props, Switch, SwitchRole

### Community 27 - "Installation and Deployment Flow"
Cohesion: 0.10
Nodes (22): Architecture Rules, JSON Storage Constraint, Local Build Compose Service, JWT Secret Environment Mapping, Release Runtime Compose Service, Infrastructure Data Model ERD, REST API Surface, sqlite-v1 Backup Schema (+14 more)

### Community 28 - "SwitchPortItem vue"
Cohesion: 0.10
Nodes (17): hasTooltipContent, hovered, isConsole, isManagement, isQsfp, isSfpType, isTrunk, portClasses (+9 more)

### Community 29 - "id index vue"
Cohesion: 0.10
Nodes (14): breadcrumbOverrides, { getById, remove }, getTotalPortCount(), getUnitPortCount(), loading, PreviewPort, previewPorts, route (+6 more)

### Community 30 - "layoutTemplate ts"
Cohesion: 0.15
Nodes (12): { data, pending, error }, PublicSwitchPayload, PublicVlan, route, tokenStr, AffectedEntry, configuredVlansSchema, LayoutUnit (+4 more)

### Community 31 - "settings vue"
Cohesion: 0.10
Nodes (16): accountForm, { clearDirty }, dirtyTracker, generalForm, languageOptions, passwordForm, portStatusOptions, savingGeneral (+8 more)

### Community 32 - "siteId index vue"
Cohesion: 0.10
Nodes (17): BadgeColor, hasSomeData, loading, portDisabledPercent, portUpPercent, relTime(), route, showAllNetworks (+9 more)

### Community 33 - "switches create vue"
Cohesion: 0.10
Nodes (17): autoFilled, { clearDirty }, { create }, form, { items: templates, fetch: fetchTemplates }, onSubmit(), roleOptions, route (+9 more)

### Community 34 - "client ts"
Cohesion: 0.13
Nodes (9): PrevState, SIMPLE_ENTITIES, prisma, findLatestArchive(), LegacyAlloc, LegacyNetwork, LegacySite, recoverArchivedAllocations() (+1 more)

### Community 35 - "ipAllocation ts"
Cohesion: 0.13
Nodes (12): allocForm, emit, modeModel, openModel, props, rangeForm, IpAllocationSubmitPayload, UnifiedRow (+4 more)

### Community 36 - "SwitchPortBulkEditor vue"
Cohesion: 0.13
Nodes (18): allVlans, { apiFetch }, apply(), bulkHelperUsageOptions, close(), emit, fetchVlans(), form (+10 more)

### Community 37 - "sites index vue"
Cohesion: 0.12
Nodes (16): deleteMessage, deleteTarget, deleting, editForm, editTarget, loading, loadSites(), onDelete() (+8 more)

### Community 38 - "dependencies"
Cohesion: 0.11
Nodes (19): jsonwebtoken, marked, nanoid, @nuxtjs/i18n, dependencies, jsonwebtoken, marked, nanoid (+11 more)

### Community 39 - "Repository Agent Instructions"
Cohesion: 0.22
Nodes (18): API Reference, Architecture Overview, Migration Status, Dashboard Shell Refactor Plan, Dashboard Shell Refactor Spec, Backend Specification, Data Model Specification, Frontend Specification (+10 more)

### Community 40 - "SwitchPortGrid vue"
Cohesion: 0.12
Nodes (11): emit, getPortsForBlock(), getRowsForBlock(), highlightedLagId, isTouch, lagExpanded, onPortClick(), props (+3 more)

### Community 41 - "types index ts"
Cohesion: 0.15
Nodes (10): props, usedVlans, ApiError, ApiResponse, PaginatedResponse, ValidationError, RangeType, PortStatus (+2 more)

### Community 42 - "SwitchPublicAccess vue"
Cohesion: 0.12
Nodes (12): drawerOpen, handleDownloadPng(), handleDownloadSvg(), props, publicUrl, qrCanvas, showRevokeConfirm, { t } (+4 more)

### Community 43 - "subnets create vue"
Cohesion: 0.12
Nodes (16): { clearDirty }, { create }, dirtyTracker, dnsInput, form, { items: vlans, fetch: fetchVlans }, onSubmit(), parseDns() (+8 more)

### Community 44 - "utils changelog ts"
Cohesion: 0.23
Nodes (9): cache, CacheEntry, loadChangelog(), parseChangelog(), renderReleaseHtml(), sanitizeHtml(), ChangelogRelease, ChangelogResponse (+1 more)

### Community 45 - "QuickCreateModal vue"
Cohesion: 0.16
Nodes (14): { create }, emit, form, handleLibraryImport(), mode, model, onSubmit(), portTypeOptions (+6 more)

### Community 46 - "ipRangeRepository ts"
Cohesion: 0.23
Nodes (5): ipRangeRepository, RangeRow, createIpRangeSchema, updateIpRangeSchema, IPRange

### Community 47 - "IpAddressForm vue"
Cohesion: 0.14
Nodes (13): derivedNetwork, effectiveNetworkId, emit, form, FormState, manualNetworkId, networkOptions, onSubmit() (+5 more)

### Community 48 - "setup vue"
Cohesion: 0.13
Nodes (10): accountForm, currentStep, error, languageOptions, loading, orphanTotal, router, { setLocale } (+2 more)

### Community 49 - "switches print vue"
Cohesion: 0.14
Nodes (9): getTemplateUnits(), ids, incrementMemberLabel(), loading, route, siteId, switches, templates (+1 more)

### Community 50 - "docs package json"
Cohesion: 0.13
Nodes (14): devDependencies, mermaid, vitepress, vitepress-plugin-mermaid, name, private, scripts, build (+6 more)

### Community 51 - "switchRepository ts"
Cohesion: 0.16
Nodes (9): generatePortLabel(), generatePortsFromTemplate(), includePorts, PortRow, rowToPort(), rowToSwitch(), SwitchRow, TxClient (+1 more)

### Community 52 - "LibraryImport vue"
Cohesion: 0.15
Nodes (11): error, loadingPreview, preview, previewPorts, results, searching, searchQuery, selected (+3 more)

### Community 53 - "TopologyDetailPanel vue"
Cohesion: 0.15
Nodes (9): BadgeColor, emit, isOpen, LagSubGroup, nodeLinks, panelDescription, props, SwitchGroup (+1 more)

### Community 54 - "VlanMultiSelect vue"
Cohesion: 0.17
Nodes (9): colorMap, configuredSet, emit, groupedOptions, onSelect(), props, remoteConfiguredSet, selected (+1 more)

### Community 55 - "topology vue"
Cohesion: 0.15
Nodes (7): { data, layout, loading, fetchTopology, saveLayout, resetLayout }, graphRef, isAllContext, route, selectedNode, selectedNodeId, siteId

### Community 56 - "vlans create vue"
Cohesion: 0.15
Nodes (10): { clearDirty }, { create }, form, route, router, siteId, statusOptions, submitting (+2 more)

### Community 57 - "SiteSwitcher vue"
Cohesion: 0.21
Nodes (11): findSite(), loadSites(), onSiteChange(), route, router, selectedSiteId, { setSite }, siteOptions (+3 more)

### Community 58 - "SwitchConfiguredVlans vue"
Cohesion: 0.21
Nodes (11): addVlan(), availableToAdd, configuredVlanDetails, confirmRemove(), emit, props, removeDialog, removeVlan() (+3 more)

### Community 59 - "VlanRemoveConfirmDialog vue"
Cohesion: 0.18
Nodes (10): confirm(), decisions, emit, isOpen, props, replacementOptions, { t }, ConfirmOptions (+2 more)

### Community 60 - "VlanDropdown vue"
Cohesion: 0.17
Nodes (9): colorMap, configuredSet, emit, groupedOptions, props, remoteConfiguredSet, selectedVlan, { t } (+1 more)

### Community 61 - "dataRestore ts"
Cohesion: 0.23
Nodes (8): @prisma/client, @prisma/client, assertUuidIds(), DataPayload, FK_INSERT_ORDER, restoreAll(), REVERSE_FK_DELETE_ORDER, validatePayload()

### Community 62 - "subnetCalculations ts"
Cohesion: 0.38
Nodes (9): abbreviateEndIp(), findNetworkForIP(), ipToLong(), isIPInSubnet(), isValidIPv4(), parseSubnetInfo(), rangeIpCount(), SubnetInfo (+1 more)

### Community 63 - "topology ts"
Cohesion: 0.40
Nodes (5): TopologyData, TopologyGhostNode, TopologyLayout, TopologyLink, TopologyNode

### Community 64 - "qr print vue"
Cohesion: 0.20
Nodes (6): canvasRefs, ids, loading, route, Sticker, stickers

### Community 65 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, esModuleInterop, module, moduleResolution, skipLibCheck, strict, target, include (+1 more)

### Community 66 - "AppSidebar vue"
Cohesion: 0.22
Nodes (7): changelogOpen, config, { currentSiteId }, navSections, route, sitePrefix, { updateAvailable, load }

### Community 67 - "getNodeRole"
Cohesion: 0.28
Nodes (9): emit, getNameMaxChars(), getNodeFilter(), getNodeRole(), getNodeSize(), getNodeStroke(), isGhostNode(), nodeBackgroundForRole() (+1 more)

### Community 68 - "layoutTemplatePoe ts"
Cohesion: 0.28
Nodes (7): handleLibraryImport(), handleSubmit(), validate(), buildLayoutTemplatePoeOptions(), layoutTemplatePoeSelection(), normalizeLayoutTemplatePoeSelection(), poeOptionValues

### Community 69 - "SwitchPortTable vue"
Cohesion: 0.25
Nodes (4): expanded, portStats, props, vlanMap

### Community 70 - "login vue"
Cohesion: 0.25
Nodes (5): error, form, loading, { login }, router

### Community 71 - "sites create vue"
Cohesion: 0.29
Nodes (7): { clearDirty }, form, onSubmit(), submitting, { t }, toast, validate()

### Community 72 - "activityFormat ts"
Cohesion: 0.32
Nodes (6): formatActivity(), formatActivity(), formatActivitySummary(), formatEntityChange(), formatPortChange(), TranslateFn

### Community 73 - "Operations User Guide"
Cohesion: 0.32
Nodes (8): Operations User Guide (German), LAG Group Management, Layout Templates Workflow, Operations User Guide, Topology Visualization, Dashboard UI Screenshot, Data Management UI Screenshot, Port Footer + Site Scope Fix Session

### Community 74 - "topology layout put ts"
Cohesion: 0.46
Nodes (3): topologyLayoutRepository, resolveSiteParam(), saveLayoutSchema

### Community 75 - "jsonStorage ts"
Cohesion: 0.50
Nodes (7): ensureDataDir(), getDataDir(), getFilePath(), initializeFile(), isDataDirWritable(), readJson(), writeJson()

### Community 76 - "AppBreadcrumbs vue"
Cohesion: 0.29
Nodes (6): breadcrumbOverrides, crumbs, iconMap, labelMap, route, { t }

### Community 77 - "ChangelogModal vue"
Cohesion: 0.29
Nodes (5): listReleases, { locale }, newest, open, { releases, loaded, failed, updateAvailable, load }

### Community 78 - "CopyButton vue"
Cohesion: 0.33
Nodes (6): copied, copy(), copyToClipboard(), props, { t }, toast

### Community 79 - "fetchAllocations"
Cohesion: 0.29
Nodes (7): fetchAllocations(), confirmDelete(), confirmNetworkMove(), onSubmit(), openNetworkMoveDialog(), confirmDeleteAlloc(), onCreateAllocation()

### Community 80 - "export entity get ts"
Cohesion: 0.33
Nodes (5): CSV_HEADERS, EntityType, escapeCsvValue(), ExportFormat, toCsv()

### Community 81 - "activity ts"
Cohesion: 0.40
Nodes (3): DashboardStats, ActivityAction, ActivityEntry

### Community 82 - "closeNetworkMoveDialog"
Cohesion: 0.33
Nodes (6): closeNetworkMoveDialog(), onFormClose(), onNetworkMoveOpenChange(), onRowSelect(), openAdd(), openEdit()

### Community 84 - "fetchSwitches"
Cohesion: 0.40
Nodes (5): openCreate(), openEdit(), fetchSwitches(), onSwitchSelect(), useRemoteConnection()

### Community 85 - "emit"
Cohesion: 0.40
Nodes (5): emit, onRemoveFromLag(), onSaveClick(), resetPort(), save()

### Community 88 - "subnet calculator vue"
Cohesion: 0.50
Nodes (3): cidr, result, SubnetResult

### Community 89 - "Release History"
Cohesion: 0.50
Nodes (4): Release History, SQLite Migration v0.21.0, Release Notes Include (DE), Release Notes Include (EN)

### Community 90 - "Switch Detail with Port"
Cohesion: 0.50
Nodes (4): Switch Detail with Port Map, Switches Inventory View, Layout Templates View, Switch Detail with Port Map (Duplicate Asset)

### Community 91 - "opencode json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 97 - "onRowClick"
Cohesion: 0.67
Nodes (3): onRowClick(), openEditAlloc(), openRangeEdit()

## Ambiguous Edges - Review These
- `Release History` → `Release Notes Include (DE)`  [AMBIGUOUS]
  docs/de/release-notes.md · relation: references

## Knowledge Gaps
- **928 isolated node(s):** `repowise`, `$schema`, `.opencode/plugins/graphify.js`, `repowise`, `FormState` (+923 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Release History` and `Release Notes Include (DE)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `dependencies` connect `dependencies` to `nuxt ui`, `prisma adapter better sqlite3`, `yaml`, `zod`, `scripts`, `SwitchPublicAccess vue`, `bcryptjs`, `better sqlite3`, `dataRestore ts`, `nuxt`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `@prisma/client` connect `dataRestore ts` to `dependencies`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `repowise`, `$schema`, `.opencode/plugins/graphify.js` to the rest of the system?**
  _928 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `testHelpers ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059018367961457395 - nodes in this community are weakly interconnected._
- **Should `subnets id vue` be split into smaller, more focused modules?**
  _Cohesion score 0.02702702702702703 - nodes in this community are weakly interconnected._
- **Should `jsonToPrisma ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055130784708249496 - nodes in this community are weakly interconnected._