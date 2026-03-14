<script setup lang="ts">
import type { AppSettings, LayoutTemplate } from '~/types/models'

const { t } = useI18n()
const section = ref('general')
const layoutOpen = ref(false)
const editingLayout = ref<LayoutTemplate | null>(null)

const { data: settings } = await useFetch<AppSettings>('/api/settings')
const { data: layouts, refresh } = await useFetch<LayoutTemplate[]>('/api/layout-templates')

const layoutForm = ref<Omit<LayoutTemplate, 'id'>>({
  name: '', vendor: '', model: '', description: '', blocks: []
})

function newLayout() {
  editingLayout.value = null
  layoutForm.value = { name: '', vendor: '', model: '', description: '', blocks: [{ id: 'block-1', name: 'Block', type: 'rj45', rows: 1, columns: 24, startPort: 1, endPort: 24, order: 1 }] }
  layoutOpen.value = true
}

function editLayout(layout: LayoutTemplate) {
  editingLayout.value = layout
  layoutForm.value = { ...layout, blocks: layout.blocks.map((block) => ({ ...block })) }
  layoutOpen.value = true
}

async function saveLayout() {
  if (editingLayout.value) {
    await $fetch(`/api/layout-templates/${editingLayout.value.id}`, { method: 'PUT', body: layoutForm.value })
  } else {
    await $fetch('/api/layout-templates', { method: 'POST', body: layoutForm.value })
  }
  layoutOpen.value = false
  await refresh()
}

async function removeLayout(id: string) {
  await $fetch(`/api/layout-templates/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">{{ t('settings.title') }}</h1>

    <UTabs v-model="section" :items="[
      { value: 'general', label: t('settings.general') },
      { value: 'switchModels', label: t('settings.switchModels') },
      { value: 'portLayouts', label: t('settings.portLayouts') },
      { value: 'ipamDefaults', label: t('settings.ipamDefaults') },
      { value: 'appearance', label: t('settings.appearance') },
      { value: 'language', label: t('settings.language') }
    ]" />

    <UCard v-if="section === 'general'">
      <p><strong>{{ t('settings.organization') }}:</strong> {{ settings?.general.organizationName }}</p>
      <p><strong>{{ t('settings.timezone') }}:</strong> {{ settings?.general.timezone }}</p>
    </UCard>

    <UCard v-else-if="section === 'switchModels'">
      <p class="text-muted">{{ t('settings.placeholderSwitchModels') }}</p>
    </UCard>

    <UCard v-else-if="section === 'portLayouts'">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="font-semibold">{{ t('settings.portLayouts') }}</h2>
          <UButton size="sm" icon="i-lucide-plus" @click="newLayout">{{ t('common.create') }}</UButton>
        </div>
      </template>
      <UTable :data="layouts || []" :columns="[
        { accessorKey: 'name', header: t('common.name') },
        { accessorKey: 'vendor', header: t('switch.vendor') },
        { accessorKey: 'model', header: t('switch.model') }
      ]">
        <template #expanded="{ row }">
          <div class="flex gap-2 p-2">
            <UButton size="sm" color="neutral" variant="soft" @click="editLayout(row.original)">{{ t('common.edit') }}</UButton>
            <UButton size="sm" color="error" variant="soft" @click="removeLayout(row.original.id)">{{ t('common.delete') }}</UButton>
          </div>
        </template>
      </UTable>
    </UCard>

    <UCard v-else-if="section === 'ipamDefaults'">
      <p><strong>{{ t('settings.defaultPrefix') }}:</strong> /{{ settings?.ipamDefaults.defaultPrefix }}</p>
    </UCard>

    <UCard v-else-if="section === 'appearance'">
      <p><strong>{{ t('settings.compactTables') }}:</strong> {{ settings?.appearance.compactTables ? t('common.enabled') : t('common.disabled') }}</p>
    </UCard>

    <UCard v-else>
      <p><strong>{{ t('settings.defaultLanguage') }}:</strong> {{ settings?.language.defaultLocale }}</p>
    </UCard>

    <USlideover v-model:open="layoutOpen" :title="editingLayout ? t('settings.editLayout') : t('settings.createLayout')">
      <template #body>
        <div class="space-y-3">
          <UInput v-model="layoutForm.name" :label="t('common.name')" />
          <UInput v-model="layoutForm.vendor" :label="t('switch.vendor')" />
          <UInput v-model="layoutForm.model" :label="t('switch.model')" />
          <UTextarea v-model="layoutForm.description" :label="t('common.description')" />

          <UCard v-for="(block, index) in layoutForm.blocks" :key="block.id">
            <div class="grid grid-cols-2 gap-2">
              <UInput v-model="block.name" :label="t('settings.blockName')" />
              <USelect v-model="block.type" :items="['rj45','sfp','sfp+','qsfp','mgmt']" :label="t('settings.blockType')" />
              <UInput v-model="block.rows" type="number" :label="t('settings.rows')" />
              <UInput v-model="block.columns" type="number" :label="t('settings.columns')" />
              <UInput v-model="block.startPort" type="number" :label="t('settings.startPort')" />
              <UInput v-model="block.endPort" type="number" :label="t('settings.endPort')" />
              <UButton color="error" variant="soft" @click="layoutForm.blocks.splice(index, 1)">{{ t('common.delete') }}</UButton>
            </div>
          </UCard>

          <UButton color="neutral" variant="soft" @click="layoutForm.blocks.push({ id: crypto.randomUUID(), name: 'Block', type: 'rj45', rows: 1, columns: 12, startPort: 1, endPort: 12, order: layoutForm.blocks.length + 1 })">
            {{ t('settings.addBlock') }}
          </UButton>
          <UButton block @click="saveLayout">{{ t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
