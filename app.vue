<script setup lang="ts">
const route = useRoute()

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Network operations overview' },
  '/switches': { title: 'Switches', subtitle: 'Switch inventory and lifecycle' },
  '/networks': { title: 'Networks & IPAM', subtitle: 'Subnets, ranges, and allocations' },
  '/settings': { title: 'Settings', subtitle: 'System configuration and defaults' },
  '/settings/general': { title: 'Settings · General', subtitle: 'Global system preferences' },
  '/settings/switch-models': { title: 'Settings · Switch models', subtitle: 'Standardized model definitions' },
  '/settings/port-layouts': { title: 'Settings · Port layouts', subtitle: 'Reusable port layout templates' },
  '/settings/ipam-defaults': { title: 'Settings · IPAM defaults', subtitle: 'Default network allocation settings' },
  '/settings/appearance': { title: 'Settings · Appearance', subtitle: 'Theme and visual preferences' }
}

const navigationGroups = [
  {
    title: 'Operations',
    items: [{ label: 'Dashboard', to: '/', icon: '◉' }]
  },
  {
    title: 'Switching',
    items: [{ label: 'Switches', to: '/switches', icon: '⇆' }]
  },
  {
    title: 'Network',
    items: [{ label: 'Networks', to: '/networks', icon: '⌁' }]
  },
  {
    title: 'System',
    items: [{ label: 'Settings', to: '/settings', icon: '⚙' }]
  }
]

const headerMeta = computed(() => {
  const match = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => route.path === prefix || route.path.startsWith(`${prefix}/`))

  return match?.[1] || { title: 'ezSWM', subtitle: 'Switch and IP management' }
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand panel">
        <p class="sidebar-brand__title">ezSWM</p>
        <small>Easy Switch and IP Management</small>
      </div>

      <nav class="sidebar-nav">
        <div v-for="group in navigationGroups" :key="group.title" class="nav-group">
          <p class="nav-group__title">{{ group.title }}</p>
          <NuxtLink v-for="item in group.items" :key="item.label" :to="item.to" class="nav-item">
            <span class="nav-item__icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </nav>
    </aside>

    <div class="content">
      <header class="topbar panel panel--flat">
        <div>
          <h2 class="topbar-title">{{ headerMeta.title }}</h2>
          <small>{{ headerMeta.subtitle }}</small>
        </div>
        <div class="row topbar-actions">
          <input class="topbar-search" placeholder="Search switches, VLANs, IPs" />
          <button type="button" class="button button--ghost">Refresh</button>
          <ThemeToggle />
        </div>
      </header>

      <main class="content-main">
        <NuxtPage />
      </main>

      <footer class="app-footer">
        <div class="app-footer__brand">
          <strong>ezSWM</strong>
          <small>Open-source network documentation</small>
        </div>
        <a href="https://github.com/slgfire/website-saarlan-eccm" target="_blank" rel="noopener noreferrer">GitHub</a>
      </footer>
    </div>
  </div>
</template>
