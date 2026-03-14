<script setup lang="ts">
const { t } = useI18n()
const { data: settings } = await useFetch('/api/settings')
const { data: layouts, refresh: refreshLayouts } = await useFetch<any[]>('/api/layouts')

const layoutOpen = ref(false)
const editLayout = ref<any>(null)
const layoutForm = reactive<any>({ name: '', vendor: '', model: '', description: '', blocks: [] })

const startLayout = (item?: any) => {
  editLayout.value = item || null
  Object.assign(layoutForm, item ? JSON.parse(JSON.stringify(item)) : { name: '', vendor: '', model: '', description: '', blocks: [{ id: crypto.randomUUID(), name: 'Ports', type: 'rj45', rows: 1, columns: 24, startPort: 1, endPort: 24, order: 1 }] })
  layoutOpen.value = true
}

const addBlock = () => layoutForm.blocks.push({ id: crypto.randomUUID(), name: 'New block', type: 'rj45', rows: 1, columns: 8, startPort: 1, endPort: 8, order: layoutForm.blocks.length + 1 })

const saveLayout = async () => {
  if (editLayout.value) await $fetch(`/api/layouts/${editLayout.value.id}`, { method: 'PUT', body: layoutForm })
  else await $fetch('/api/layouts', { method: 'POST', body: layoutForm })
  layoutOpen.value = false
  await refreshLayouts()
}

const deleteLayout = async (id: string) => {
  await $fetch(`/api/layouts/${id}`, { method: 'DELETE' })
  await refreshLayouts()
}
</script>

<template>
  <div>
    <PageHeader :title="t('pages.settings.title')" :description="t('pages.settings.description')" />

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard><template #header><h3 class="font-semibold">General</h3></template><p class="text-sm text-muted">Organization: {{ settings?.general?.organizationName }}</p></UCard>
      <UCard><template #header><h3 class="font-semibold">Switch models</h3></template><p class="text-sm text-muted">Model-to-layout mapping is scaffolded through templates.</p></UCard>
      <UCard><template #header><h3 class="font-semibold">IPAM defaults</h3></template><p class="text-sm text-muted">Default prefix: /{{ settings?.ipamDefaults?.defaultPrefix }}</p></UCard>
      <UCard><template #header><h3 class="font-semibold">Appearance</h3></template><p class="text-sm text-muted">Use the global color mode button in the header.</p></UCard>
      <UCard><template #header><h3 class="font-semibold">Language</h3></template><p class="text-sm text-muted">English default, German available.</p></UCard>
    </div>

    <UCard class="mt-4">
      <template #header>
        <div class="flex justify-between">
          <h3 class="font-semibold">Port layouts</h3>
          <UButton size="xs" icon="i-lucide-plus" @click="startLayout()" />
        </div>
      </template>
      <div class="space-y-2">
        <div v-for="layout in layouts || []" :key="layout.id" class="flex items-center justify-between rounded border border-default px-3 py-2">
          <div>
            <p class="font-medium">{{ layout.name }}</p>
            <p class="text-xs text-muted">{{ layout.blocks.length }} block(s)</p>
          </div>
          <div class="space-x-2">
            <UButton size="xs" variant="soft" icon="i-lucide-pencil" @click="startLayout(layout)" />
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash" @click="deleteLayout(layout.id)" />
          </div>
        </div>
      </div>
    </UCard>

    <USlideover v-model:open="layoutOpen" title="Port layout template">
      <template #body>
        <div class="space-y-3">
          <UInput v-model="layoutForm.name" label="Name" />
          <UInput v-model="layoutForm.vendor" label="Vendor" />
          <UInput v-model="layoutForm.model" label="Model" />
          <UTextarea v-model="layoutForm.description" label="Description" />

          <div class="flex items-center justify-between">
            <h4 class="font-semibold">Blocks</h4>
            <UButton size="xs" variant="soft" icon="i-lucide-plus" @click="addBlock">Add</UButton>
          </div>

          <UCard v-for="(block, index) in layoutForm.blocks" :key="block.id">
            <div class="grid gap-2 md:grid-cols-2">
              <UInput v-model="block.name" label="Name" />
              <USelect v-model="block.type" :items="['rj45','sfp','sfp+','qsfp','mgmt']" label="Type" />
              <UInput v-model="block.rows" type="number" label="Rows" />
              <UInput v-model="block.columns" type="number" label="Columns" />
              <UInput v-model="block.startPort" type="number" label="Start Port" />
              <UInput v-model="block.endPort" type="number" label="End Port" />
              <UInput v-model="block.order" type="number" label="Order" />
            </div>
          </UCard>

          <UButton block @click="saveLayout">Save template</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
