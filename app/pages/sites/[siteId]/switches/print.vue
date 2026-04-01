<template>
  <div class="print-preview" style="background: #fff; color: #000; min-height: 100vh; padding: 16px;">
    <!-- Toolbar -->
    <div class="mb-4 flex items-center gap-3" style="color: #333;">
      <UButton icon="i-heroicons-x-mark" variant="ghost" size="sm" @click="onClose">
        {{ $t('common.close') }}
      </UButton>
      <span class="text-sm" style="color: #888;">
        {{ switches.length }} {{ switches.length === 1 ? 'Switch' : 'Switches' }}
      </span>
      <UButton icon="i-heroicons-printer" size="sm" @click="onPrint">
        {{ $t('common.print') }}
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="text-sm" style="color: #999;">Loading...</div>
    </div>

    <!-- No switches -->
    <div v-else-if="switches.length === 0" class="py-12 text-center" style="color: #999;">
      {{ $t('print.noSwitches') }}
    </div>

    <!-- Each switch -->
    <div
      v-for="(sw, idx) in switches"
      :key="sw.id"
      :class="idx < switches.length - 1 ? 'print-page-break mb-8' : ''"
    >
      <div class="mb-2 font-bold" style="font-size: 14px; color: #000;">{{ sw.name }}</div>

      <SwitchPortGrid
        v-if="sw.ports?.length"
        :ports="sw.ports"
        :units="getTemplateUnits(sw)"
        :vlans="vlans"
        :selected-ports="[]"
        :stack-size="sw.stack_size || 1"
      />
      <p v-else class="text-sm" style="color: #999;">No ports</p>

      <!-- VLAN legend -->
      <div v-if="getUsedVlans(sw).length" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[9px]" style="border-color: #ddd; color: #000;">
        <span style="font-weight: bold; color: #555;">VLANs:</span>
        <span v-for="vlan in getUsedVlans(sw)" :key="vlan.vlan_id" class="flex items-center gap-1">
          <span class="inline-block h-2 w-2" style="border-radius: 1px; print-color-adjust: exact; -webkit-print-color-adjust: exact;" :style="{ backgroundColor: vlan.color }" />
          <b>{{ vlan.vlan_id }}</b> {{ vlan.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'print' })

const route = useRoute()
const siteId = route.params.siteId as string

const ids = computed(() => {
  const q = route.query.ids as string
  if (!q) return []
  return [...new Set(q.split(',').filter(Boolean))]
})

const loading = ref(true)
const switches = ref<any[]>([])
const vlans = ref<any[]>([])
const templates = ref<any[]>([])

useHead({ title: 'Print — ezSWM', titleTemplate: '' })

function onClose() {
  window.close()
}

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
      $fetch<any>('/api/switches'),
      $fetch<any>('/api/vlans', { params: siteId !== 'all' ? { site_id: siteId } : undefined }),
      $fetch<any>('/api/layout-templates'),
    ])

    const switchList = (Array.isArray(allSwitches) ? allSwitches : allSwitches?.data || allSwitches?.items || []) as any[]
    vlans.value = (Array.isArray(allVlans) ? allVlans : allVlans?.data || allVlans?.items || []) as any[]
    templates.value = (Array.isArray(allTemplates) ? allTemplates : allTemplates?.data || allTemplates?.items || []) as any[]

    switches.value = ids.value
      .map(id => switchList.find((s: any) => s.id === id))
      .filter(Boolean)
  } catch (e) {
    console.error('[print] fetchData failed:', e)
  } finally {
    loading.value = false
  }
}

function getUsedVlans(sw: any): any[] {
  if (!vlans.value.length || !sw.ports?.length) return []
  const usedIds = new Set<number>()
  for (const p of sw.ports) {
    if (p.native_vlan) usedIds.add(p.native_vlan)
    if (p.access_vlan) usedIds.add(p.access_vlan)
    if (p.tagged_vlans) for (const vid of p.tagged_vlans) usedIds.add(vid)
  }
  return vlans.value.filter(v => usedIds.has(v.vlan_id) && v.color).sort((a, b) => a.vlan_id - b.vlan_id)
}

function getTemplateUnits(sw: any): any[] {
  if (!sw.layout_template_id) return []
  const tpl = templates.value.find(t => t.id === sw.layout_template_id)
  const baseUnits = tpl?.units || []
  const stackSize = sw.stack_size ?? 1

  if (stackSize > 1 && baseUnits.length > 0) {
    const stacked: any[] = []
    for (let member = 1; member <= stackSize; member++) {
      for (const unit of baseUnits) {
        stacked.push({
          ...unit,
          unit_number: unit.unit_number + (member - 1) * baseUnits.length,
          label: unit.label ? `Member ${member} - ${unit.label}` : `Member ${member}`,
          blocks: unit.blocks.map((b: any) => ({
            ...b,
            label: b.label ? incrementMemberLabel(b.label, member) : b.label
          }))
        })
      }
    }
    return stacked
  }
  return baseUnits
}

function incrementMemberLabel(label: string, memberIdx: number): string {
  if (memberIdx === 1) return label
  const match = label.match(/^(.*?)(\d+)(.*)$/)
  if (match) return `${match[1]}${parseInt(match[2]!, 10) + memberIdx - 1}${match[3]}`
  return `${memberIdx}/${label}`
}

onMounted(() => {
  window.addEventListener('afterprint', onAfterPrint)
  fetchData()
})

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', onAfterPrint)
  document.body.classList.remove('print-mode')
})
</script>
