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
        <NuxtLink to="/networks">Networks & IPAM</NuxtLink>
      </nav>
    </aside>
    <div class="content">
      <header class="topbar panel panel--flat">
        <h2 class="topbar-title">ezSWM — Network Documentation</h2>
        <ThemeToggle />
      </header>
      <main class="content-main">
        <NuxtPage />
      </main>
      <footer class="app-footer">
        <div class="app-footer__brand">
          <strong>ezSWM</strong>
          <small>Easy Switch and IP Management</small>
        </div>
        <a href="https://github.com/slgfire/website-saarlan-eccm" target="_blank" rel="noopener noreferrer">GitHub</a>
      </footer>
    </div>
  </div>
</template>
