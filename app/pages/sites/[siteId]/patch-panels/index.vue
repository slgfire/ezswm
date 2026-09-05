<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('patchPanels.title') }}</h1>
      <UButton icon="i-heroicons-plus" size="sm" @click="openCreate">
        {{ $t('patchPanels.create') }}
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="pageLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <template v-else>
      <!-- Search -->
      <div v-if="allItems.length > 0" class="mb-4">
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="$t('common.search')"
          size="sm"
          class="w-64"
        />
      </div>

      <!-- List -->
      <div v-if="filteredItems.length > 0">
        <div v-for="group in groupedItems" :key="group.siteId" class="mb-4">
          <div v-if="groupedItems.length > 1" class="mb-2 flex items-center gap-3">
            <UIcon name="i-heroicons-building-office-2" class="h-4 w-4 text-gray-500" />
            <span class="text-sm font-semibold text-gray-400">{{ group.siteName }}</span>
            <div class="h-px flex-1 bg-default" />
          </div>
          <div class="list-container rounded-lg bg-default">
            <NuxtLink
              v-for="(panel, i) in group.items"
              :key="panel.id"
              :to="`/sites/${panel.site_id}/patch-panels/${panel.slug || panel.id}`"
              class="group flex items-center gap-4 px-5 py-3 transition-colors"
              :class="[
                i > 0 ? 'border-t border-default' : '',
                'row-hover'
              ]"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-base font-semibold text-gray-900 dark:text-white">{{ panel.name }}</span>
                  <UBadge variant="subtle" color="neutral" size="sm">{{ panel.port_count }} {{ $t('patchPanels.ports') }}</UBadge>
                </div>
                <div v-if="panel.description" class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                  {{ panel.description }}
                </div>
              </div>
              <div class="flex items-center gap-3 text-xs text-gray-400">
                <span>{{ occupiedCount(panel) }}/{{ panel.sockets.length }} {{ $t('patchPanels.occupied') }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- No results -->
      <div v-else-if="allItems.length > 0" class="py-12 text-center">
        <UIcon name="i-heroicons-funnel" class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('patchPanels.noResults') }}</p>
      </div>

      <!-- Empty state -->
      <SharedEmptyState
        v-else
        icon="i-heroicons-squares-plus"
        :title="$t('patchPanels.emptyTitle')"
        :description="$t('patchPanels.emptyDescription')"
      >
        <template #action>
          <UButton icon="i-heroicons-plus" @click="openCreate">{{ $t('patchPanels.create') }}</UButton>
        </template>
      </SharedEmptyState>
    </template>

    <!-- Create slideover -->
    <USlideover :open="showCreate" @update:open="onCreateOpenChange">
      <template #title>
        <span>{{ $t('patchPanels.create') }}</span>
      </template>

      <template #body>
        <UForm ref="createFormRef" :state="createForm" :validate="validateCreate" :validate-on="['blur', 'change']" novalidate class="space-y-4" @submit="onSubmitCreate">
          <UFormField v-if="siteId === 'all'" :label="$t('patchPanels.fields.site')" name="site_id" required>
            <USelect v-model="createForm.site_id" :items="siteOptions" class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.name')" name="name" required>
            <UInput v-model="createForm.name" required class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.description')" name="description">
            <UTextarea v-model="createForm.description" :rows="2" class="w-full" />
          </UFormField>
          <UFormField :label="$t('patchPanels.fields.portCount')" name="port_count" required>
            <USelect v-model="createForm.port_count" :items="portCountOptions" class="w-full" />
            <p class="mt-1 text-xs text-gray-500">{{ $t('patchPanels.portCountHint') }}</p>
          </UFormField>
        </UForm>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="subtle" color="neutral" @click="requestCloseCreate">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="creating" @click="createFormRef?.submit()">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import type { PatchPanel } from '~~/types/patchPanel'

const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const { t } = useI18n()
useHead({ title: t('patchPanels.title') })
const toast = useToast()
const router = useRouter()

const { items, fetch: fetchPanels, create } = usePatchPanels()
const { items: allSites, fetch: fetchAllSites } = useSites()
const pageLoading = ref(true)

const allItems = computed(() => items.value)
const search = ref('')

const siteMap = computed(() => {
  const map: Record<string, string> = {}
  for (const s of allSites.value) map[s.id] = s.name
  return map
})

const siteOptions = computed(() =>
  allSites.value.map(s => ({ label: s.name, value: s.id }))
)

const filteredItems = computed(() => {
  if (!search.value) return allItems.value
  const q = search.value.toLowerCase()
  return allItems.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q)
  )
})

const groupedItems = computed(() => {
  if (siteId.value !== 'all') return [{ siteId: '', siteName: '', items: filteredItems.value }]
  const groups: { siteId: string; siteName: string; items: PatchPanel[] }[] = []
  const groupMap = new Map<string, PatchPanel[]>()
  for (const item of filteredItems.value) {
    const sid = item.site_id || ''
    if (!groupMap.has(sid)) groupMap.set(sid, [])
    groupMap.get(sid)!.push(item)
  }
  for (const [sid, items] of groupMap) {
    groups.push({ siteId: sid, siteName: siteMap.value[sid] || sid, items })
  }
  return groups
})

function occupiedCount(panel: PatchPanel): number {
  return panel.sockets.filter(s => s.outlet_number || s.location).length
}

// Create slideover
const showCreate = ref(false)
const creating = ref(false)
const createFormRef = ref<{ submit: () => void } | null>(null)

const createForm = ref({
  site_id: '' as string,
  name: '',
  description: '',
  port_count: '24'
})

const portCountOptions = [
  { label: '12', value: '12' },
  { label: '24', value: '24' },
  { label: '48', value: '48' }
]

const { takeSnapshot: snapshotCreate, requestClose: requestCloseCreate, onOpenChange: onCreateOpenChange } = useSlideoverGuard(
  createForm,
  () => { showCreate.value = false }
)

function openCreate() {
  createForm.value = {
    site_id: siteId.value !== 'all' ? siteId.value : (allSites.value[0]?.id || ''),
    name: '',
    description: '',
    port_count: '24'
  }
  showCreate.value = true
  snapshotCreate()
}

function validateCreate(state: typeof createForm.value) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  if (siteId.value === 'all' && !state.site_id) {
    errors.push({ name: 'site_id', message: t('patchPanels.validation.siteRequired') })
  }
  return errors
}

async function onSubmitCreate() {
  creating.value = true
  try {
    const body = {
      site_id: createForm.value.site_id,
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim() || undefined,
      port_count: Number(createForm.value.port_count)
    }
    const result = await create(body)
    toast.add({ title: t('patchPanels.messages.created'), color: 'success' })
    showCreate.value = false
    await loadData()
    if (result?.id) {
      await router.push(`/sites/${result.site_id}/patch-panels/${result.slug || result.id}`)
    }
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    creating.value = false
  }
}

const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

async function loadData() {
  await fetchPanels(siteParams.value)
}

onMounted(async () => {
  const fetches: Promise<void>[] = [loadData()]
  if (siteId.value === 'all') fetches.push(fetchAllSites())
  await Promise.all(fetches)
  pageLoading.value = false
})
</script>
