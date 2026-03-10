<template>
  <div class="app-shell">
    <aside class="sidebar">
      <h1>Switch Manager</h1>
      <nav>
        <NuxtLink to="/">Dashboard</NuxtLink>
        <NuxtLink to="/switches">Switches</NuxtLink>
        <NuxtLink to="/layouts">Layouts</NuxtLink>
      </nav>
    </aside>
    <main class="content">
      <NuxtPage />
    </main>
  </div>
</template>
