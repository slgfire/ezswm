# Strategic Roadmap: ezSWM

## Project Vision
A lightweight, database-free infrastructure documentation tool for switch and IP management.

Main scope:
- switch inventory
- port documentation
- switch front port visualization
- VLAN-based network documentation
- IP allocation management
- IP range management
- DHCP and infrastructure ranges

## Core Architecture Principles
- Repository Pattern: only `server/repositories` interact with JSON files
- Atomic Writes: prevent corrupted JSON data
- Nuxt 4 + TypeScript: strict typing for all domain models
- UI First: use the official Nuxt UI Dashboard template structure
- Container First: development and runtime must work through Docker

Reference UI template:
- https://github.com/nuxt-ui-templates/dashboard

---

## Phased Implementation Plan

### Phase 1: Architecture and Project Setup
- [ ] Initialize Nuxt 4 project with TypeScript
- [ ] Configure `nuxt.config.ts` for Nuxt UI, i18n, and app shell
- [ ] Set up `i18n/locales/en.json` and `i18n/locales/de.json`
- [ ] Verify `npm run dev`
- [ ] Verify `npm run build`
- [ ] Verify Docker build and runtime

### Phase 2: Data Model Definition
- [ ] Define TypeScript interfaces for:
  - `Switch`
  - `Port`
  - `Network`
  - `IPAllocation`
  - `IPRange`
  - `LayoutTemplate`
  - `LayoutBlock`

### Phase 3: Dashboard Shell
- [ ] Implement sidebar navigation
- [ ] Implement header bar with search, language switcher, and theme toggle
- [ ] Apply dark mode using Nuxt UI defaults
- [ ] Build reusable dashboard layout structure

### Phase 4: Storage Layer
- [ ] Set up `/app/data` structure
- [ ] Create JSON storage utilities
- [ ] Create repository classes
- [ ] Implement auto-initialization for missing files
- [ ] Ensure seed data does not overwrite user data

### Phase 5: Core Pages and CRUD
- [ ] Switches: list, create, update, delete, detail
- [ ] Networks: list, create, update, delete, detail
- [ ] IP allocations inside network detail
- [ ] IP ranges inside network detail

### Phase 6: Switch Port Visualization
- [ ] Render switch layout blocks
- [ ] Render realistic switch front panel grids
- [ ] Add side editor panel for port details
- [ ] Store port documentation and VLAN assignment

### Phase 7: Validation and UX
- [ ] Add form validation
- [ ] Add IPv4 and subnet validation
- [ ] Add duplicate IP detection
- [ ] Add toast notifications for CRUD actions

### Phase 8: Docker Validation
- [ ] Create multi-stage `Dockerfile`
- [ ] Create `compose.yaml` with `./data:/app/data`
- [ ] Validate production runtime with `.output`
- [ ] Run full end-to-end container test

---

## Deployment and Production
- Persistent path: `/app/data`
- Environment file: `.env.example`
- Runtime command: `node .output/server/index.mjs`