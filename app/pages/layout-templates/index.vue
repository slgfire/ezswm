<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('templates.title') }}</h1>
      <UButton icon="i-heroicons-plus" size="sm" @click="showCreateModal = true">
        {{ $t('templates.create') }}
      </UButton>
    </div>

    <!-- Toolbar -->
    <div v-if="!loading && allItems.length > 0" class="mb-4 flex flex-wrap items-center gap-3">
      <UInput
        v-model="searchQuery"
        :placeholder="$t('common.search')"
        icon="i-heroicons-magnifying-glass"
        size="sm"
        class="w-64"
        @update:model-value="onSearch"
      />
      <USelectMenu :search-input="false"
        v-if="manufacturers.length > 0"
        v-model="selectedManufacturer"
        :items="manufacturerOptions"
        value-key="value"
        
        :placeholder="$t('templates.allManufacturers')"
        size="sm"
        class="w-48"
        @update:model-value="onFilter"
      />
      <USelectMenu :search-input="false"
        v-model="selectedPortType"
        :items="portTypeOptions"
        value-key="value"
        
        :placeholder="$t('templates.allPortTypes')"
        size="sm"
        class="w-44"
        @update:model-value="onFilter"
      />
      <div class="ml-auto flex items-center gap-1">
        <UTooltip :text="$t('templates.viewGrid')">
          <UButton
            icon="i-heroicons-squares-2x2"
            size="xs"
            :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
            @click="viewMode = 'grid'"
          />
        </UTooltip>
        <UTooltip :text="$t('templates.viewList')">
          <UButton
            icon="i-heroicons-bars-3"
            size="xs"
            :variant="viewMode === 'table' ? 'solid' : 'ghost'"
            @click="viewMode = 'table'"
          />
        </UTooltip>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <!-- Card Grid View -->
    <template v-else-if="filteredItems.length > 0 && viewMode === 'grid'">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="tpl in filteredItems"
          :key="tpl.id"
          class="stagger-item card-glow group relative cursor-pointer overflow-hidden rounded-lg bg-default"
          @click="navigateTo(`/layout-templates/${tpl.id}`)"
        >
          <!-- Port Preview -->
          <div class="border-b border-default bg-elevated px-4 py-3">
            <TemplateMiniPreview :template="tpl" />
          </div>

          <!-- Hover actions -->
          <div class="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-neutral-700/95">
            <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click.stop="navigateTo(`/layout-templates/${tpl.id}/edit`)" />
            <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click.stop="onDuplicate(tpl)" />
            <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.stop="confirmDelete(tpl)" />
          </div>

          <!-- Card Body -->
          <div class="p-4">
            <div class="min-w-0">
              <h3 class="truncate font-semibold text-gray-900 dark:text-white">{{ tpl.name }}</h3>
              <p v-if="tpl.manufacturer || tpl.model" class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                {{ [tpl.manufacturer, tpl.model].filter(Boolean).join(' · ') }}
              </p>
            </div>

            <!-- Badges -->
            <div class="mt-3 flex flex-wrap gap-1.5">
              <UBadge variant="subtle" size="sm">
                {{ getTotalPortCount(tpl) }} Ports
              </UBadge>
              <UBadge variant="subtle" size="sm" color="neutral">
                {{ tpl.units?.length || 0 }} {{ tpl.units?.length === 1 ? 'Unit' : 'Units' }}
              </UBadge>
              <UBadge
                v-for="pt in getPortTypes(tpl)"
                :key="pt.type"
                :color="pt.color"
                variant="subtle"
                size="xs"
              >
                {{ pt.label }}
              </UBadge>
            </div>

            <!-- Usage -->
            <div :class="['mt-3 flex items-center gap-1.5 text-xs', tpl.switch_count ? 'text-gray-400 dark:text-gray-500' : 'text-orange-400 dark:text-orange-500']">
              <UIcon :name="tpl.switch_count ? 'i-heroicons-link' : 'i-heroicons-exclamation-triangle'" class="h-3.5 w-3.5" />
              <span>{{ $t('templates.usedBy', { count: tpl.switch_count || 0 }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- List View -->
    <template v-else-if="filteredItems.length > 0 && viewMode === 'table'">
      <div class="flex flex-col gap-2">
        <div
          v-for="tpl in filteredItems"
          :key="tpl.id"
          class="card-glow group flex cursor-pointer items-center gap-4 rounded-lg bg-default px-4 py-3"
          @click="navigateTo(`/layout-templates/${tpl.id}`)"
        >
          <!-- Mini Preview -->
          <div class="hidden w-40 shrink-0 sm:block">
            <TemplateMiniPreview :template="tpl" />
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="truncate font-semibold text-gray-900 dark:text-white">{{ tpl.name }}</h3>
              <span v-if="tpl.manufacturer || tpl.model" class="hidden truncate text-sm text-gray-400 dark:text-gray-500 md:inline">
                {{ [tpl.manufacturer, tpl.model].filter(Boolean).join(' · ') }}
              </span>
            </div>
            <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
              <UBadge variant="subtle" size="sm">
                {{ getTotalPortCount(tpl) }} Ports
              </UBadge>
              <UBadge variant="subtle" size="sm" color="neutral">
                {{ tpl.units?.length || 0 }} {{ tpl.units?.length === 1 ? 'Unit' : 'Units' }}
              </UBadge>
              <UBadge
                v-for="pt in getPortTypes(tpl)"
                :key="pt.type"
                :color="pt.color"
                variant="subtle"
                size="xs"
              >
                {{ pt.label }}
              </UBadge>
              <span :class="['ml-1 flex items-center gap-1 text-xs', tpl.switch_count ? 'text-gray-400 dark:text-gray-500' : 'text-orange-400 dark:text-orange-500']">
                <UIcon :name="tpl.switch_count ? 'i-heroicons-link' : 'i-heroicons-exclamation-triangle'" class="h-3 w-3" />
                {{ $t('templates.usedBy', { count: tpl.switch_count || 0 }) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
            <UTooltip :text="$t('common.edit')">
              <UButton :to="`/layout-templates/${tpl.id}/edit`" icon="i-heroicons-pencil-square" size="xs" variant="ghost" color="primary" @click.stop />
            </UTooltip>
            <UTooltip :text="$t('common.duplicate')">
              <UButton icon="i-heroicons-document-duplicate" size="xs" variant="ghost" @click.stop="onDuplicate(tpl)" />
            </UTooltip>
            <UTooltip :text="$t('common.delete')">
              <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" @click.stop="confirmDelete(tpl)" />
            </UTooltip>
          </div>
        </div>
      </div>
    </template>

    <!-- No results after filtering -->
    <div v-else-if="!loading && allItems.length > 0 && filteredItems.length === 0" class="py-12 text-center">
      <UIcon name="i-heroicons-funnel" class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('templates.noResults') }}</p>
    </div>

    <!-- Empty state -->
    <SharedEmptyState
      v-else-if="!loading"
      icon="i-heroicons-rectangle-group"
      :title="$t('templates.emptyTitle')"
      :description="$t('templates.emptyDescription')"
    >
      <template #action>
        <UButton icon="i-heroicons-plus" @click="showCreateModal = true">
          {{ $t('templates.create') }}
        </UButton>
      </template>
    </SharedEmptyState>

    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('templates.delete')"
      :message="$t('templates.confirmDelete')"
      @confirm="handleDelete"
    />

    <UModal v-model:open="showCreateModal" :title="$t('templates.create')" :description="$t('templates.manualDescription')">
      <template #body>
        <div class="p-2">
          <h2 class="text-lg font-semibold mb-4 text-center">{{ $t('templates.create') }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Manual -->
            <button
              class="group flex flex-col items-center gap-3 p-6 rounded-xl border border-default hover:border-primary/50 hover:bg-primary/5 transition-all"
              @click="navigateTo('/layout-templates/create')"
            >
              <UIcon name="i-heroicons-pencil-square" class="text-3xl text-primary" />
              <span class="font-medium">{{ $t('templates.manual') }}</span>
              <span class="text-sm text-dimmed text-center">{{ $t('templates.manualDescription') }}</span>
            </button>

            <!-- Library Import -->
            <button
              class="group flex flex-col items-center gap-3 p-6 rounded-xl border border-default hover:border-primary/50 hover:bg-primary/5 transition-all"
              @click="navigateTo('/layout-templates/create?mode=import')"
            >
              <UIcon name="i-heroicons-cloud-arrow-down" class="text-3xl text-primary" />
              <span class="font-medium">{{ $t('templates.importFromLibrary') }}</span>
              <span class="text-sm text-dimmed text-center">{{ $t('templates.importDescription') }}</span>
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { LayoutTemplate } from '~~/types/layoutTemplate'

const { t } = useI18n()
useHead({ title: t('templates.title') })
const toast = useToast()
const { items, loading, fetch, remove } = useLayoutTemplates()

const showCreateModal = ref(false)
const viewMode = ref<'grid' | 'table'>('grid')
const searchQuery = ref('')
const selectedManufacturer = ref('')
const selectedPortType = ref('')
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const manufacturers = ref<string[]>([])

const allItems = computed(() => items.value as (LayoutTemplate & { switch_count?: number })[])

const manufacturerOptions = computed(() => [
  { value: '', label: t('templates.allManufacturers') },
  ...manufacturers.value.map(m => ({ value: m, label: m }))
])

const portTypeOptions = computed(() => [
  { value: '', label: t('templates.allPortTypes') },
  { value: 'rj45', label: 'RJ45' },
  { value: 'sfp', label: 'SFP' },
  { value: 'sfp+', label: 'SFP+' },
  { value: 'qsfp', label: 'QSFP' },
  { value: 'console', label: 'Console' },
  { value: 'management', label: 'Management' }
])

const filteredItems = computed(() => {
  let result = allItems.value

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.manufacturer && t.manufacturer.toLowerCase().includes(q)) ||
      (t.model && t.model.toLowerCase().includes(q))
    )
  }

  if (selectedManufacturer.value) {
    result = result.filter(t => t.manufacturer === selectedManufacturer.value)
  }

  if (selectedPortType.value) {
    result = result.filter((t: LayoutTemplate) =>
      t.units?.some((u: any) => u.blocks?.some((b: any) => b.type === selectedPortType.value))
    )
  }

  return result
})

const portTypeColorMap: Record<string, string> = {
  rj45: 'primary',
  sfp: 'info',
  'sfp+': 'info',
  qsfp: 'warning',
  console: 'warning',
  management: 'success'
}

function getTotalPortCount(template: LayoutTemplate): number {
  if (!template.units) return 0
  return template.units.reduce((total: number, unit: any) =>
    total + (unit.blocks || []).reduce((bt: number, b: any) => bt + (b.count || 0), 0), 0)
}

function getPortTypes(template: LayoutTemplate): { type: string; label: string; color: any }[] {
  const types = new Set<string>()
  for (const unit of template.units || []) {
    for (const block of unit.blocks || []) {
      types.add(block.type)
    }
  }
  return [...types].map(type => ({
    type,
    label: type.toUpperCase(),
    color: portTypeColorMap[type] || 'gray'
  }))
}

function onDuplicate(row: any) {
  navigateTo(`/layout-templates/create?clone=${row.id}`)
}

function confirmDelete(row: any) {
  deleteTarget.value = row
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await remove(deleteTarget.value.id)
    toast.add({ title: t('templates.messages.deleted'), color: 'success' })
    await loadData()
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    showDeleteDialog.value = false
    deleteTarget.value = null
  }
}

function onSearch() {
  // Client-side filtering via computed
}

function onFilter() {
  // Client-side filtering via computed
}

const { apiFetch } = useApiFetch()

async function loadData() {
  await fetch()
  try {
    const response = await apiFetch<any>('/api/layout-templates', { params: { per_page: 999 } })
    manufacturers.value = response?.manufacturers || []
  } catch { /* silent */ }
}

onMounted(() => { loadData() })
</script>
