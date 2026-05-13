<template>
  <USlideover v-model:open="openModel">
    <template #title>
      <div v-if="editTarget" class="flex items-center gap-2">
        <code class="font-mono text-sm">{{ editTarget.ip_address }}</code>
        <span v-if="editTarget.hostname" class="text-sm text-gray-400">{{ editTarget.hostname }}</span>
      </div>
      <span v-else>{{ $t('common.add') }}</span>
    </template>

    <template #actions>
      <div v-if="editTarget" class="flex items-center gap-1">
        <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" :title="$t('common.delete')" @click="emit('delete-alloc')" />
      </div>
    </template>

    <template #body>
      <!-- Mode toggle (only for new entries, hide range option for /31 and /32) -->
      <div v-if="!editTarget" class="mb-4 flex items-center gap-1">
        <button
          class="px-2.5 py-1 text-xs font-medium rounded border transition-colors"
          :class="modeModel === 'ip'
            ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
            : 'bg-neutral-100 border-neutral-300 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'"
          @click="modeModel = 'ip'"
        >{{ $t('networks.unified.addIp') }}</button>
        <button
          v-if="!isSpecialNet"
          class="px-2.5 py-1 text-xs font-medium rounded border transition-colors"
          :class="modeModel === 'range'
            ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
            : 'bg-neutral-100 border-neutral-300 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'"
          @click="modeModel = 'range'"
        >{{ $t('networks.unified.addRange') }}</button>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
        {{ error }}
      </div>

      <!-- IP Address form -->
      <form v-if="modeModel === 'ip'" class="space-y-4" @submit.prevent="emit('submit-allocation')">
        <UFormField :label="$t('networks.allocations.fields.ipAddress') + ' *'">
          <UInput v-model="allocForm.ip_address" placeholder="10.0.1.10" required :color="error ? 'error' : undefined" class="w-full" />
        </UFormField>
        <UFormField :label="$t('networks.allocations.fields.hostname')">
          <UInput v-model="allocForm.hostname" class="w-full" />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('networks.allocations.fields.deviceType')">
            <USelect v-model="allocForm.device_type" :items="deviceTypeOptions" placeholder="-" class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.allocations.fields.status')">
            <USelect v-model="allocForm.status" :items="allocStatusOptions" class="w-full" />
          </UFormField>
        </div>
        <UFormField :label="$t('networks.allocations.fields.macAddress')">
          <UInput v-model="allocForm.mac_address" placeholder="AA:BB:CC:DD:EE:FF" class="w-full" />
        </UFormField>
        <UFormField :label="$t('common.description')">
          <UInput v-model="allocForm.description" class="w-full" />
        </UFormField>
      </form>

      <!-- IP Range form -->
      <form v-if="modeModel === 'range'" class="space-y-4" @submit.prevent="emit('submit-range')">
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('networks.ranges.fields.startIp') + ' *'">
            <UInput v-model="rangeForm.start_ip" placeholder="10.0.1.100" required :color="error ? 'error' : undefined" class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.ranges.fields.endIp') + ' *'">
            <UInput v-model="rangeForm.end_ip" placeholder="10.0.1.200" required :color="error ? 'error' : undefined" class="w-full" />
          </UFormField>
        </div>
        <UFormField :label="$t('networks.ranges.fields.type') + ' *'">
          <USelect v-model="rangeForm.type" :items="rangeTypeOptions" class="w-full" />
        </UFormField>
        <UFormField :label="$t('common.description')">
          <UInput v-model="rangeForm.description" class="w-full" />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="saving" @click="modeModel === 'ip' ? emit('submit-allocation') : emit('submit-range')">{{ editTarget ? $t('common.save') : $t('common.add') }}</UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { IPAllocation } from '~~/types/ipAllocation'

const props = defineProps<{
  open: boolean
  editTarget: IPAllocation | null
  mode: 'ip' | 'range'
  error: string
  saving: boolean
  allocForm: { ip_address: string; hostname: string; mac_address: string; device_type: string; description: string; status: string }
  rangeForm: { start_ip: string; end_ip: string; type: string; description: string }
  isSpecialNet: boolean
  deviceTypeOptions: { label: string; value: string }[]
  allocStatusOptions: { label: string; value: string }[]
  rangeTypeOptions: { label: string; value: string }[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:mode': [value: 'ip' | 'range']
  'submit-allocation': []
  'submit-range': []
  'delete-alloc': []
  'close': []
}>()

const openModel = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const modeModel = computed({
  get: () => props.mode,
  set: (v) => emit('update:mode', v),
})
</script>
