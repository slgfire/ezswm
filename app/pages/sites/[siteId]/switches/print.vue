<template>
  <div class="p-4">
    <!-- Screen-only toolbar -->
    <div class="screen-only mb-4 flex items-center gap-3">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" size="sm" @click="$router.back()">
        {{ $t('common.back') }}
      </UButton>
      <span class="text-sm text-gray-400">
        {{ $t('print.switchCount', { n: switches.length }) }}
      </span>
      <UButton icon="i-heroicons-printer" size="sm" @click="onPrint">
        {{ $t('common.print') }}
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <!-- No switches -->
    <div v-else-if="switches.length === 0" class="py-12 text-center text-gray-400">
      {{ $t('print.noSwitches') }}
    </div>

    <!-- Each switch -->
    <div
      v-for="(sw, idx) in switches"
      :key="sw.id"
      :class="idx < switches.length - 1 ? 'print-page-break' : ''"
    >
      <div class="mb-3 flex items-center justify-between border-b pb-2" style="border-color: #ccc;">
        <div>
          <span class="text-lg font-bold print:text-black">{{ sw.name }}</span>
          <span class="ml-2 text-sm text-gray-500">
            {{ [sw.manufacturer, sw.model].filter(Boolean).join(' ') }}
            <template v-if="sw.management_ip"> · {{ sw.management_ip }}</template>
          </span>
        </div>
        <div class="text-xs text-gray-400">
          ezSWM · {{ printDate }}
        </div>
      </div>

      <SwitchPortGrid
        v-if="sw.ports?.length"
        :ports="sw.ports"
        :units="getTemplateUnits(sw)"
        :vlans="vlans"
        :selected-ports="[]"
        :lag-groups="getLagGroups(sw.id)"
        :lag-by-port-id="getLagByPortId(sw.id)"
      />
      <p v-else class="text-sm text-gray-400">{{ $t('switches.ports.noPortsMessage') }}</p>

      <SwitchPrintLegend
        v-if="sw.ports?.length"
        :ports="sw.ports"
        :vlans="vlans"
      />

      <div class="screen-only mb-8" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Use default layout — print CSS hides sidebar/header via .print-mode

const route = useRoute()
const siteId = route.params.siteId as string

const ids = computed(() => {
  const q = route.query.ids as string
  if (!q) return []
  return [...new Set(q.split(',').filter(Boolean))]
})

const { apiFetch } = useApiFetch()
const loading = ref(true)
const switches = ref<any[]>([])
const vlans = ref<any[]>([])
const templates = ref<any[]>([])
const lagGroupsMap = ref<Record<string, any[]>>({})

const printDate = new Date().toLocaleDateString()
let printed = false

useHead({ title: computed(() => `Print ${switches.value.length} Switches — ezSWM`) })

function onPrint() {
  document.body.classList.add('print-mode')
  window.print()
}

function onAfterPrint() {
  document.body.classList.remove('print-mode')
}

async function fetchData() {
  if (ids.value.length === 0) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const [allSwitches, allVlans, allTemplates] = await Promise.all([
      apiFetch<any>('/api/switches'),
      apiFetch<any>('/api/vlans', { params: siteId !== 'all' ? { site_id: siteId } : {} }),
      apiFetch<any>('/api/layout-templates'),
    ])

    const switchList = (allSwitches.data || allSwitches) as any[]
    vlans.value = (allVlans.data || allVlans) as any[]
    templates.value = (allTemplates.data || allTemplates) as any[]

    switches.value = ids.value
      .map(id => switchList.find(s => s.id === id))
      .filter(Boolean)

    for (const sw of switches.value) {
      try {
        lagGroupsMap.value[sw.id] = await apiFetch<any[]>(`/api/switches/${sw.id}/lag-groups`)
      } catch {
        lagGroupsMap.value[sw.id] = []
      }
    }
  } finally {
    loading.value = false
  }
}

function getTemplateUnits(sw: any): any[] {
  if (!sw.layout_template_id) return []
  const tpl = templates.value.find(t => t.id === sw.layout_template_id)
  return tpl?.units || []
}

function getLagGroups(switchId: string): any[] {
  return lagGroupsMap.value[switchId] || []
}

function getLagByPortId(switchId: string): Map<string, any> {
  const map = new Map()
  for (const lag of getLagGroups(switchId)) {
    for (const portId of lag.port_ids) {
      map.set(portId, lag)
    }
  }
  return map
}

// Auto-print exactly once after data loads
watch(loading, (isLoading) => {
  if (!isLoading && switches.value.length > 0 && !printed) {
    printed = true
    nextTick(() => {
      document.body.classList.add('print-mode')
      window.print()
    })
  }
})

onMounted(() => {
  document.body.classList.add('print-mode')
  window.addEventListener('afterprint', onAfterPrint)
  fetchData()
})

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', onAfterPrint)
  document.body.classList.remove('print-mode')
})
</script>
