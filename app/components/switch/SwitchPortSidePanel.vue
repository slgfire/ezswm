<template>
  <USlideover v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ port?.label || `Port ${port?.unit}/${port?.index}` }}</h3>
          <UButton variant="ghost" icon="i-heroicons-x-mark" @click="isOpen = false" />
        </div>
      </template>

      <div v-if="port" class="space-y-4">
        <div class="flex gap-2">
          <UBadge>{{ port.type }}</UBadge>
          <UBadge :color="port.status === 'up' ? 'green' : port.status === 'disabled' ? 'red' : 'gray'">{{ port.status }}</UBadge>
        </div>

        <UFormGroup label="Status">
          <USelect v-model="form.status" :options="['up', 'down', 'disabled']" />
        </UFormGroup>

        <UFormGroup label="Speed">
          <USelect v-model="form.speed" :options="speeds" placeholder="Select speed" />
        </UFormGroup>

        <UFormGroup label="Native VLAN">
          <UInput v-model.number="form.native_vlan" type="number" placeholder="VLAN ID" />
        </UFormGroup>

        <UFormGroup label="Tagged VLANs">
          <UInput v-model="taggedVlansStr" placeholder="e.g. 100,200,300" />
        </UFormGroup>

        <UFormGroup label="Connected Device">
          <UInput v-model="form.connected_device" />
        </UFormGroup>

        <UFormGroup label="Connected Port">
          <UInput v-model="form.connected_port" />
        </UFormGroup>

        <UFormGroup label="Description">
          <UInput v-model="form.description" />
        </UFormGroup>

        <UFormGroup label="MAC Address">
          <UInput v-model="form.mac_address" placeholder="XX:XX:XX:XX:XX:XX" />
        </UFormGroup>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="isOpen = false">Cancel</UButton>
          <UButton @click="save">Save</UButton>
        </div>
      </template>
    </UCard>
  </USlideover>
</template>

<script setup lang="ts">
const props = defineProps<{
  port: any
  switchId: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const isOpen = defineModel<boolean>()
const toast = useToast()
const speeds = ['100M', '1G', '10G', '25G', '40G', '100G']

const form = reactive({
  status: '',
  speed: '',
  native_vlan: null as number | null,
  connected_device: '',
  connected_port: '',
  description: '',
  mac_address: ''
})

const taggedVlansStr = ref('')

watch(() => props.port, (p) => {
  if (p) {
    form.status = p.status
    form.speed = p.speed || ''
    form.native_vlan = p.native_vlan || null
    form.connected_device = p.connected_device || ''
    form.connected_port = p.connected_port || ''
    form.description = p.description || ''
    form.mac_address = p.mac_address || ''
    taggedVlansStr.value = (p.tagged_vlans || []).join(',')
  }
}, { immediate: true })

async function save() {
  const tagged_vlans = taggedVlansStr.value
    ? taggedVlansStr.value.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v))
    : []

  try {
    await $fetch(`/api/switches/${props.switchId}/ports/${props.port.id}`, {
      method: 'PUT',
      body: { ...form, tagged_vlans }
    })
    toast.add({ title: 'Port updated', color: 'green' })
    emit('saved')
    isOpen.value = false
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Failed', color: 'red' })
  }
}
</script>
