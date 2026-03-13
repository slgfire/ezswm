<template>
  <div class="stack">
    <div class="row row-between">
      <h1>Settings</h1>
      <small>Prepare and maintain global system configuration.</small>
    </div>

    <div class="panel stack">
      <h3 class="section-title">Configuration areas</h3>
      <div class="settings-grid">
        <NuxtLink to="/settings/general" class="settings-link">General</NuxtLink>
        <NuxtLink to="/settings/switch-models" class="settings-link">Switch models</NuxtLink>
        <NuxtLink to="/settings/port-layouts" class="settings-link">Port layouts</NuxtLink>
        <NuxtLink to="/settings/ipam-defaults" class="settings-link">IPAM defaults</NuxtLink>
        <NuxtLink to="/settings/appearance" class="settings-link">Appearance</NuxtLink>
      </div>
    </div>
  </div>
</template>
