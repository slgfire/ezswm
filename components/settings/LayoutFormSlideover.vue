<template>
  <USlideover v-model="open">
    <UCard>
      <template #header>New layout template</template>
      <div class="space-y-3">
        <UInput v-model="form.name" placeholder="Name" />
        <UInput v-model="form.vendor" placeholder="Vendor" />
        <UInput v-model="form.model" placeholder="Model" />
      </div>
      <template #footer><div class="flex justify-end"><UButton @click="emit('saved', form)">Save</UButton></div></template>
    </UCard>
  </USlideover>
</template>
<script setup lang="ts">
const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ saved: [any] }>()
const form = reactive({ name: '', vendor: '', model: '', description: '', blocks: [] as any[] })
</script>
