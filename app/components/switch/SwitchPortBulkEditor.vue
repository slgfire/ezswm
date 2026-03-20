<template>
  <USlideover v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ $t('switches.ports.bulkEditTitle', { count: selectedPorts.length }) }}</h3>
          <UButton variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="close" />
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-xs text-gray-400">{{ $t('switches.ports.bulkEditHint', { count: selectedPorts.length }) }}</p>

        <UFormGroup :label="$t('common.status')">
          <USelect v-model="form.status" :options="statusOptions" :placeholder="$t('common.noChange')" />
        </UFormGroup>

        <UFormGroup :label="$t('switches.ports.speed')">
          <USelect v-model="form.speed" :options="speedOptions" :placeholder="$t('common.noChange')" />
        </UFormGroup>

        <UFormGroup :label="$t('switches.ports.nativeVlan')">
          <UInput v-model.number="form.native_vlan" type="number" :placeholder="$t('common.noChange')" />
        </UFormGroup>

        <UFormGroup :label="$t('switches.ports.taggedVlans')">
          <div v-if="allVlans.length" class="max-h-32 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-gray-700">
            <label
              v-for="v in allVlans"
              :key="v.vlan_id"
              class="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <input
                type="checkbox"
                :value="v.vlan_id"
                :checked="selectedTaggedVlans.includes(v.vlan_id)"
                class="rounded border-gray-300 text-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                @change="toggleTaggedVlan(v.vlan_id)"
              />
              <div class="h-2.5 w-2.5 rounded" :style="{ backgroundColor: v.color }" />
              <span>{{ v.vlan_id }}</span>
              <span class="text-xs text-gray-400">{{ v.name }}</span>
            </label>
          </div>
          <UInput v-else v-model="form.tagged_vlans_str" placeholder="e.g. 100,200,300" />
        </UFormGroup>

        <UFormGroup :label="$t('common.description')">
          <UInput v-model="form.description" :placeholder="$t('common.noChange')" />
        </UFormGroup>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <UButton variant="soft" color="gray" @click="close">{{ $t('common.cancel') }}</UButton>
          <UButton @click="apply">{{ $t('switches.ports.applyToPorts', { count: selectedPorts.length }) }}</UButton>
        </div>
      </template>
    </UCard>
  </USlideover>
</template>

<script setup lang="ts">
const props = defineProps<{
  switchId: string
  selectedPorts: string[]
}>()

const emit = defineEmits<{ saved: [], 'clear-selection': [] }>()
const { t } = useI18n()
const toast = useToast()
const { apiFetch } = useApiFetch()

const isOpen = ref(false)
const allVlans = ref<any[]>([])
const selectedTaggedVlans = ref<number[]>([])

function toggleTaggedVlan(vlanId: number) {
  const idx = selectedTaggedVlans.value.indexOf(vlanId)
  if (idx >= 0) selectedTaggedVlans.value.splice(idx, 1)
  else selectedTaggedVlans.value.push(vlanId)
}

async function fetchVlans() {
  try {
    const data = await apiFetch<any>('/api/vlans')
    allVlans.value = (data.data || data).sort((a: any, b: any) => a.vlan_id - b.vlan_id)
  } catch { /* ignore */ }
}

const statusOptions = computed(() => [
  { label: t('common.noChange'), value: '' },
  { label: t('legend.up'), value: 'up' },
  { label: t('legend.down'), value: 'down' },
  { label: t('legend.disabled'), value: 'disabled' }
])

const speedOptions = computed(() => [
  { label: t('common.noChange'), value: '' },
  { label: '100M', value: '100M' },
  { label: '1G', value: '1G' },
  { label: '2.5G', value: '2.5G' },
  { label: '10G', value: '10G' },
  { label: '100G', value: '100G' }
])

const form = reactive({
  status: '',
  speed: '',
  native_vlan: null as number | null,
  tagged_vlans_str: '',
  description: ''
})

function open() {
  isOpen.value = true
  fetchVlans()
}

defineExpose({ open })

function close() {
  isOpen.value = false
  emit('clear-selection')
}

async function apply() {
  const updates: Record<string, any> = {}
  if (form.status) updates.status = form.status
  if (form.speed) updates.speed = form.speed
  if (form.native_vlan) updates.native_vlan = form.native_vlan
  if (selectedTaggedVlans.value.length) {
    updates.tagged_vlans = [...selectedTaggedVlans.value]
  } else if (form.tagged_vlans_str) {
    updates.tagged_vlans = form.tagged_vlans_str.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v))
  }
  if (form.description) updates.description = form.description

  try {
    await $fetch(`/api/switches/${props.switchId}/ports/bulk`, {
      method: 'PUT',
      body: { port_ids: props.selectedPorts, updates }
    })
    toast.add({ title: t('switches.ports.updatedPorts', { count: props.selectedPorts.length }), color: 'green' })
    // Reset form
    form.status = ''
    form.speed = ''
    form.native_vlan = null
    form.tagged_vlans_str = ''
    form.description = ''
    selectedTaggedVlans.value = []
    emit('saved')
    close()
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Failed', color: 'red' })
  }
}
</script>
