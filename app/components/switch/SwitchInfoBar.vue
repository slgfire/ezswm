<template>
  <div class="-mt-2 list-container rounded-lg bg-default">
    <button
      class="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-left cursor-pointer hover:bg-elevated/50 transition-colors rounded-lg"
      @click="emit('update:showDetails', !props.showDetails)"
    >
      <div v-if="item.model">
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.model') }}</div>
        <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.manufacturer ? `${item.manufacturer} ${item.model}` : item.model }}</div>
      </div>
      <div v-if="item.model && (item.location || item.management_ip)" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div v-if="item.location">
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.location') }}</div>
        <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.location }}{{ item.rack_position ? ` / ${item.rack_position}` : '' }}</div>
      </div>
      <div v-if="item.location && item.management_ip" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div v-if="item.management_ip">
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.managementIp') }}</div>
        <SharedCopyButton :value="item.management_ip!"><span class="font-mono text-sm font-bold text-gray-900 dark:text-white">{{ item.management_ip }}</span></SharedCopyButton>
      </div>
      <div v-if="item.ports?.length" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div v-if="item.ports?.length">
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.ports') }}</div>
        <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          {{ item.ports.length }}
          <span class="flex items-center gap-1.5 text-xs font-normal">
            <span v-if="portStats.up" class="flex items-center gap-0.5 text-green-500"><span class="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />{{ portStats.up }}</span>
            <span v-if="portStats.down" class="flex items-center gap-0.5 text-gray-400"><span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />{{ portStats.down }}</span>
            <span v-if="portStats.disabled" class="flex items-center gap-0.5 text-red-400"><span class="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />{{ portStats.disabled }}</span>
          </span>
        </div>
      </div>
      <div v-if="currentTemplateName" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div v-if="currentTemplateName">
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.infoBar.template') }}</div>
        <div class="text-sm text-gray-600 dark:text-gray-300">{{ currentTemplateName }}</div>
      </div>
      <!-- Expand/collapse chevron -->
      <div class="ml-auto flex items-center">
        <UIcon name="i-heroicons-chevron-down" :class="['h-4 w-4 text-gray-400 transition-transform duration-200', props.showDetails ? 'rotate-180' : '']" />
      </div>
    </button>

    <!-- Expanded details (inline below info bar) -->
    <div v-show="props.showDetails" class="border-t border-default px-5 py-4">
      <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.name') }}</dt>
          <dd>{{ item.name }}</dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.model') }}</dt>
          <dd>{{ item.model || '-' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.manufacturer') }}</dt>
          <dd>{{ item.manufacturer || '-' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.serialNumber') }}</dt>
          <dd>{{ item.serial_number || '-' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.location') }}</dt>
          <dd>{{ item.location || '-' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.rackPosition') }}</dt>
          <dd>{{ item.rack_position || '-' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.managementIp') }}</dt>
          <dd class="font-mono"><SharedCopyButton v-if="item.management_ip" :value="item.management_ip">{{ item.management_ip }}</SharedCopyButton><span v-else>-</span></dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.firmwareVersion') }}</dt>
          <dd>{{ item.firmware_version || '-' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.layoutTemplate') }}</dt>
          <dd>{{ currentTemplateName || '-' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.role') }}</dt>
          <dd>
            <UBadge v-if="item.role" :color="roleColor(item.role)" variant="subtle" size="sm">
              {{ $t(`switches.roles.${item.role}`) }}
            </UBadge>
            <span v-else>-</span>
          </dd>
        </div>
        <div v-if="item.tags?.length" class="col-span-2 sm:col-span-3 lg:col-span-4">
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('switches.fields.tags') }}</dt>
          <dd class="flex flex-wrap gap-1 pt-0.5">
            <UBadge v-for="tg in item.tags" :key="tg" color="neutral" variant="soft" size="sm">{{ tg }}</UBadge>
          </dd>
        </div>
        <div v-if="item.notes" class="col-span-2 sm:col-span-3 lg:col-span-4">
          <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('common.notes') }}</dt>
          <dd class="whitespace-pre-wrap">{{ item.notes }}</dd>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Switch } from '~~/types/switch'

const props = defineProps<{
  item: Switch
  portStats: { up: number; down: number; disabled: number }
  currentTemplateName: string | null
  showDetails: boolean
}>()

const emit = defineEmits<{ 'update:showDetails': [value: boolean] }>()
</script>
