---
layout: home
hero:
  name: ezSWM
  text: Switch & IP Management
  tagline: Document switches, VLANs, and IP addresses in one place.
  image:
    src: /images/screenshot-dashboard-synthetic-current.png
    alt: ezSWM dashboard showing sample network inventory and IP usage
  actions:
    - theme: brand
      text: Get Started
      link: /guide/installation
    - theme: alt
      text: API Reference
      link: /api/reference
features:
  - icon: 🔌
    title: Switch Inventory
    details: Track switches with front-panel port visualization, VLAN color-coding, and layout templates for any hardware model.
  - icon: 🌐
    title: VLAN & Subnet Management
    details: Document VLANs with unique colors, manage subnets with CIDR notation, and track IP allocations and ranges.
  - icon: 📦
    title: No External Database Server
    details: Data lives in an embedded SQLite database (via Prisma) inside the data folder; JSON is only used for backups and import/export. Deploy with Docker in seconds.
  - icon: 🏢
    title: Multi-Site Support
    details: Organize infrastructure across multiple sites or locations, each with their own switches, VLANs, and subnets.
---
