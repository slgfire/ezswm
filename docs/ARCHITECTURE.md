# ezSWM Architecture

This document defines the technical architecture of the ezSWM project.

Related documents:

- CLAUDE.md
- docs/STRATEGY.md
- docs/MIGRATION_STATUS.md

---

# 1. High-Level Architecture

ezSWM is a lightweight infrastructure documentation tool built with:

- Nuxt 4
- TypeScript
- Nuxt UI
- Nuxt i18n
- JSON file storage
- Docker

Persistent data is stored in:

/app/data

Architecture layers:

1. UI Layer
2. Composables Layer
3. API Layer
4. Repository Layer
5. Storage Layer

---

# 2. Architectural Principles

## Separation of concerns

UI
- render data
- handle interactions

Composables
- client state
- API calls

API
- validate input
- call repositories

Repositories
- persistence logic

Storage
- JSON file access

## Repository-only file access

Only `server/repositories` may read/write JSON files.

## Atomic writes

All JSON writes must be atomic.

Write pattern:

1. write temporary file
2. replace original

## Strict typing

All domain models must have TypeScript interfaces.

Stored in:

types/

---

# 3. Project Structure

Recommended structure:

app/
components/
composables/
pages/

server/
api/
repositories/
storage/
utils/

types/
i18n/locales/

docs/

data/

---

# 4. UI Layer Architecture

The UI must follow the Nuxt UI dashboard template architecture.

Reference:
https://github.com/nuxt-ui-templates/dashboard

Layout must include:

- sidebar
- header
- dashboard content
- dark mode
- responsive panels

Do NOT build a custom shell.

---

# 5. Data Flow

Standard flow:

User
→ UI component
→ composable
→ API route
→ repository
→ storage
→ JSON file

Response flows back the same way.

---

# 6. Server API Layer

Responsibilities:

- parse requests
- validate payloads
- call repositories
- return structured responses

API must NOT:

- access JSON directly
- contain UI logic

Example routes:

server/api/switches/
server/api/networks/

---

# 7. Repository Layer

Repositories manage persistence operations.

Typical functions:

- list
- getById
- create
- update
- delete

Repositories may:

- call storage utilities
- enforce persistence rules

Repositories must NOT:

- render UI
- contain frontend logic

---

# 8. Storage Layer

Handles JSON files.

Responsibilities:

- ensure files exist
- read JSON
- write JSON atomically

Example files:

switches.json
networks.json
ipAllocations.json
ipRanges.json
layouts.json

---

# 9. Domain Model Overview

Core entities:

Switch
Port
Network
IPAllocation
IPRange
LayoutTemplate
LayoutBlock

All interfaces must live in:

types/

---

# 10. Validation Architecture

Reusable utilities must validate:

- IPv4 format
- subnet membership
- prefix → netmask
- duplicate IP detection
- IP range validation

Validation should occur primarily in API routes.

---

# 11. Search Architecture

Global search lives in the header.

Search scope:

- pages
- switches
- networks
- VLAN IDs
- subnets
- IP addresses
- hostnames

For MVP, client-side search is acceptable.

---

# 12. Internationalization Architecture

Locales must live in:

i18n/locales/en.json
i18n/locales/de.json

Correct configuration:

langDir: 'locales'

Avoid duplicated paths:

i18n/i18n/locales/en.json

Default language: English.

---

# 13. Docker and Runtime Architecture

Docker must use multi-stage builds.

Builder:

npm install
npm run build

Runtime:

node .output/server/index.mjs

compose.yaml mounts only:

./data:/app/data

---

# 14. Documentation Rules

Documents must stay aligned:

- CLAUDE.md
- docs/STRATEGY.md
- docs/ARCHITECTURE.md
- docs/MIGRATION_STATUS.md

After each stage:

- update MIGRATION_STATUS.md
- ensure architecture rules are respected

---

# 15. Initial Implementation Priorities

1. project bootstrap
2. Nuxt UI dashboard shell
3. storage scaffolding
4. domain types
5. repositories
6. CRUD APIs
7. core pages
8. port visualization
9. validation

---

# 16. Non-Goals for Early Stages

Avoid early complexity:

- role/permission systems
- advanced multi-user workflows
- database support
- drag-and-drop editors
- over-engineered abstractions

Focus on a stable MVP first.