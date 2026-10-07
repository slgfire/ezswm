<template>
  <USlideover v-model:open="openModel">
    <template #title>
      <div v-if="readonly && editTarget" class="flex items-center gap-2">
        <span>{{ $t('networks.allocations.title') }}</span>
        <code class="font-mono text-sm">{{ editTarget.ip_address }}</code>
      </div>
      <div v-else-if="editTarget" class="flex items-center gap-2">
        <code class="font-mono text-sm">{{ editTarget.ip_address }}</code>
        <span v-if="editTarget.hostname" class="text-sm text-muted">{{ editTarget.hostname }}</span>
      </div>
      <span v-else>{{ $t('common.add') }}</span>
    </template>

    <template #actions>
      <div v-if="editTarget && !readonly" class="flex items-center gap-1">
        <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" :title="$t('common.delete')" @click="deleteAllocation" />
      </div>
    </template>

    <template #body>
      <!-- Mode toggle (only for new entries, hide range option for /31 and /32) -->
      <div v-if="!editTarget && !readonly" class="mb-4 flex items-center gap-1">
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

      <dl v-if="readonly && editTarget" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('networks.allocations.fields.ipAddress') }}</dt>
          <dd class="mt-1 font-mono text-sm text-highlighted">{{ editTarget.ip_address }}</dd>
        </div>
        <div>
          <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('networks.allocations.fields.hostname') }}</dt>
          <dd class="mt-1 text-sm text-highlighted">{{ editTarget.hostname || '-' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('networks.allocations.fields.deviceType') }}</dt>
          <dd class="mt-1 text-sm text-highlighted">{{ editTarget.device_type ? $t(`networks.allocations.deviceTypes.${editTarget.device_type}`) : '-' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('networks.allocations.fields.status') }}</dt>
          <dd class="mt-1 text-sm text-highlighted">{{ $t(`networks.allocations.statuses.${editTarget.status}`) }}</dd>
        </div>
        <div>
          <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('networks.allocations.fields.macAddress') }}</dt>
          <dd class="mt-1 font-mono text-sm text-highlighted">{{ editTarget.mac_address || '-' }}</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('common.description') }}</dt>
          <dd class="mt-1 whitespace-pre-wrap text-sm text-highlighted">{{ editTarget.description || '-' }}</dd>
        </div>
      </dl>

      <!-- IP Address form -->
      <form v-else-if="!readonly && modeModel === 'ip'" class="space-y-4" @submit.prevent="submitAllocation">
        <UFormField :label="$t('networks.allocations.fields.ipAddress')" required>
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
      <form v-else-if="!readonly && modeModel === 'range'" class="space-y-4" @submit.prevent="submitRange">
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('networks.ranges.fields.startIp')" required>
            <UInput v-model="rangeForm.start_ip" placeholder="10.0.1.100" required :color="error ? 'error' : undefined" class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.ranges.fields.endIp')" required>
            <UInput v-model="rangeForm.end_ip" placeholder="10.0.1.200" required :color="error ? 'error' : undefined" class="w-full" />
          </UFormField>
        </div>
        <UFormField :label="$t('networks.ranges.fields.type')" required>
          <USelect v-model="rangeForm.type" :items="rangeTypeOptions" class="w-full" />
        </UFormField>
        <UFormField :label="$t('common.description')">
          <UInput v-model="rangeForm.description" class="w-full" />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div v-if="readonly" class="flex justify-end gap-2">
        <UButton variant="subtle" color="neutral" @click="emit('close')">{{ $t('common.close') }}</UButton>
      </div>
      <div v-else class="flex justify-end gap-2">
        <UButton variant="subtle" color="neutral" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="saving" @click="modeModel === 'ip' ? submitAllocation() : submitRange()">{{ editTarget ? $t('common.save') : $t('common.add') }}</UButton>
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
  readonly?: boolean
  error: string
  saving: boolean
  isSpecialNet: boolean
  deviceTypeOptions: { label: string; value: string }[]
  allocStatusOptions: { label: string; value: string }[]
  rangeTypeOptions: { label: string; value: string }[]
}>()

const allocForm = defineModel<{ ip_address: string; hostname: string; mac_address: string; device_type: string; description: string; status: string }>('allocForm', { required: true })
const rangeForm = defineModel<{ start_ip: string; end_ip: string; type: string; description: string }>('rangeForm', { required: true })

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

const readonly = computed(() => props.readonly === true)

const modeModel = computed({
  get: () => props.mode,
  set: (v) => { if (!readonly.value) emit('update:mode', v) },
})

function submitAllocation() {
  if (readonly.value) return
  emit('submit-allocation')
}

function submitRange() {
  if (readonly.value) return
  emit('submit-range')
}

function deleteAllocation() {
  if (readonly.value) return
  emit('delete-alloc')
}
</script>
