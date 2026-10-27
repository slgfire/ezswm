---
layout: home
hero:
  name: ezSWM
  text: Switch- und IP-Verwaltung
  tagline: Switches, VLANs und IP-Adressen an einem Ort dokumentieren.
  image:
    src: /images/screenshot-dashboard-synthetic-current.png
    alt: ezSWM-Dashboard mit Beispiel-Netzwerkinventar und IP-Auslastung
  actions:
    - theme: brand
      text: Erste Schritte
      link: /de/guide/installation
    - theme: alt
      text: API-Referenz
      link: /de/api/reference
features:
  - icon: 🔌
    title: Switch-Inventar
    details: Switches mit Front-Panel Port-Visualisierung, VLAN-Farbcodierung und Layout-Templates für jedes Hardware-Modell verwalten.
  - icon: 🌐
    title: VLAN- & Subnetz-Management
    details: VLANs mit individuellen Farben dokumentieren, Subnetze mit CIDR-Notation verwalten und IP-Zuweisungen und -Bereiche nachverfolgen.
  - icon: 📦
    title: Kein externer Datenbankserver
    details: Die Daten liegen in einer eingebetteten SQLite-Datenbank (via Prisma) im Datenordner; JSON dient nur für Backups und Import/Export. In Sekunden mit Docker bereitstellen.
  - icon: 🏢
    title: Multi-Standort-Unterstützung
    details: Infrastruktur über mehrere Standorte oder Orte organisieren, jeweils mit eigenen Switches, VLANs und Subnetzen.
---
