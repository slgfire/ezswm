<template>
  <USlideover v-model="open">
    <UCard>
      <template #header>{{ title }}</template>
      <div class="space-y-3">
        <UInput v-model="form.name" placeholder="Name" />
        <UInput v-model="form.vendor" placeholder="Vendor" />
        <UInput v-model="form.model" placeholder="Model" />
        <UInput v-model="form.location" placeholder="Location" />
        <UInput v-model="form.managementIp" placeholder="Management IP" />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" @click="open = false">Cancel</UButton>
          <UButton @click="save">Save</UButton>
        </div>
      </template>
    </UCard>
  </USlideover>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ initial?: any, title: string }>()
const emit = defineEmits<{ saved: [any] }>()
const form = reactive({
  name: props.initial?.name || '', vendor: props.initial?.vendor || '', model: props.initial?.model || '', location: props.initial?.location || '', managementIp: props.initial?.managementIp || '',
  rack: props.initial?.rack || '', rackPosition: props.initial?.rackPosition || '', serialNumber: props.initial?.serialNumber || '', status: props.initial?.status || 'active', description: props.initial?.description || '', layoutTemplateId: props.initial?.layoutTemplateId || 'layout-48p-qsfp', ports: props.initial?.ports || []
})
const save = () => emit('saved', form)
</script>
