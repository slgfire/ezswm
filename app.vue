<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>Switch Manager</h1>
      </div>
      <nav>
        <NuxtLink to="/">Dashboard</NuxtLink>
        <NuxtLink to="/switches">Switches</NuxtLink>
        <NuxtLink to="/layouts">Layouts</NuxtLink>
      </nav>
    </aside>
    <main class="content">
      <header class="topbar panel panel--flat">
        <h2 class="topbar-title">Netzwerkverwaltung</h2>
        <ThemeToggle />
      </header>
      <NuxtPage />
    </main>
  </div>
</template>
