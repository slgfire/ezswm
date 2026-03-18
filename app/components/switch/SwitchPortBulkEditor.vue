<template>
  <UCard v-if="selectedPorts.length > 0" class="border-primary-500 border">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold">Bulk Edit ({{ selectedPorts.length }} ports)</span>
        <UButton size="xs" variant="ghost" icon="i-heroicons-x-mark" @click="$emit('clear-selection')" />
      </div>
    </template>
    <div class="grid grid-cols-2 gap-4">
      <UFormGroup label="Status">
        <USelect v-model="form.status" :options="['', 'up', 'down', 'disabled']" placeholder="No change" />
      </UFormGroup>
      <UFormGroup label="Native VLAN">
        <UInput v-model.number="form.native_vlan" type="number" placeholder="No change" />
      </UFormGroup>
      <UFormGroup label="Speed">
        <USelect v-model="form.speed" :options="['', '100M', '1G', '2.5G', '10G', '100G']" placeholder="No change" />
      </UFormGroup>
    </div>
    <template #footer>
      <UButton @click="apply">Apply to {{ selectedPorts.length }} ports</UButton>
    </template>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  switchId: string
  selectedPorts: string[]
}>()

const emit = defineEmits<{ saved: [], 'clear-selection': [] }>()
const toast = useToast()

const form = reactive({ status: '', native_vlan: null as number | null, speed: '' })

async function apply() {
  const updates: Record<string, any> = {}
  if (form.status) updates.status = form.status
  if (form.native_vlan) updates.native_vlan = form.native_vlan
  if (form.speed) updates.speed = form.speed

  try {
    await $fetch(`/api/switches/${props.switchId}/ports/bulk`, {
      method: 'PUT',
      body: { port_ids: props.selectedPorts, updates }
    })
    toast.add({ title: `Updated ${props.selectedPorts.length} ports`, color: 'green' })
    emit('saved')
    emit('clear-selection')
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Failed', color: 'red' })
  }
}
</script>
