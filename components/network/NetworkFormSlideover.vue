<template>
  <USlideover v-model="open">
    <UCard>
      <template #header>{{ title }}</template>
      <div class="space-y-3">
        <UInput v-model.number="form.vlanId" type="number" placeholder="VLAN ID" />
        <UInput v-model="form.name" placeholder="Name" />
        <div class="grid grid-cols-2 gap-3">
          <UInput v-model="form.subnet" placeholder="Subnet" />
          <UInput v-model.number="form.prefix" type="number" placeholder="Prefix" />
        </div>
        <UInput v-model="form.gateway" placeholder="Gateway" />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2"><UButton color="gray" @click="open=false">Cancel</UButton><UButton @click="emit('saved', form)">Save</UButton></div>
      </template>
    </UCard>
  </USlideover>
</template>
<script setup lang="ts">
const open = defineModel<boolean>({ required: true })
defineProps<{ title: string, initial?: any }>()
const emit = defineEmits<{ saved: [any] }>()
const form = reactive({ vlanId: 0, name: '', subnet: '', prefix: 24, gateway: '', routing: 'internal', category: 'production', description: '', notes: '' })
</script>
