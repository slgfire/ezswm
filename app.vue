<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>ezSWM</h1>
      </div>
      <nav>
        <NuxtLink to="/">Dashboard</NuxtLink>
        <NuxtLink to="/switches">Switches</NuxtLink>
        <NuxtLink to="/layouts">Layouts</NuxtLink>
      </nav>
    </aside>
    <main class="content">
      <header class="topbar panel panel--flat">
        <h2 class="topbar-title">ezSWM — Switch Management</h2>
        <ThemeToggle />
      </header>
      <NuxtPage />
      <footer class="panel app-footer">
        <strong>ezSWM</strong>
        <small>Open-source switch management</small>
        <a href="https://github.com/slgfire/website-saarlan-eccm" target="_blank" rel="noopener noreferrer">GitHub</a>
      </footer>
    </main>
  </div>
</template>
