<template>
  <USlideover v-model="open">
    <UCard>
      <template #header>Edit Port {{ form.portNumber }}</template>
      <div class="space-y-3">
        <UInput v-model="form.label" placeholder="Label" />
        <USelect v-model="form.status" :options="['up','down','disabled']" />
        <UInput v-model.number="form.vlan" type="number" placeholder="VLAN" />
        <UInput v-model="form.connectedDevice" placeholder="Connected device" />
        <USelect v-model="form.duplex" :options="['auto','half','full']" />
      </div>
      <template #footer>
        <div class="flex justify-end"><UButton @click="emit('saved', form)">Save</UButton></div>
      </template>
    </UCard>
  </USlideover>
</template>
<script setup lang="ts">
const open = defineModel<boolean>({ required: true })
const props = defineProps<{ port: any }>()
const emit = defineEmits<{ saved: [any] }>()
const form = reactive({ ...props.port })
</script>
