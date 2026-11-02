<template>
  <div v-if="members.length" class="switch-port-miniature" data-testid="switch-port-miniature">
    <!-- Stack: compact per-member status summary; full member faceplates only on request -->
    <div v-if="isStack" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <ul class="flex flex-wrap items-center gap-1.5" data-testid="switch-port-miniature-summary">
        <li
          v-for="m in members"
          :key="m.member"
          class="flex items-center gap-1.5 whitespace-nowrap rounded border border-default bg-elevated/60 px-1.5 py-0.5"
        >
          <span class="text-[10px] font-semibold text-toned" aria-hidden="true">{{ mapped ? $t('switches.stackMember', { n: m.member }) : $t('switches.miniature.stackMembers', { n: stackCount }) }}</span>
          <span class="flex h-1.5 w-8 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700" aria-hidden="true">
            <span class="bg-green-500" :style="{ width: share(m, 'up') }" />
            <span class="bg-neutral-400 dark:bg-neutral-500" :style="{ width: share(m, 'down') }" />
            <span class="bg-red-500" :style="{ width: share(m, 'disabled') }" />
          </span>
          <span class="font-mono text-[10px] text-muted" aria-hidden="true">{{ $t('switches.miniature.portCount', { n: total(m) }) }}</span>
          <span class="sr-only">{{ mapped ? memberSummary(m) : `${$t('switches.miniature.stackMembers', { n: stackCount })}: ${portSummary(m)}` }}</span>
        </li>
      </ul>
      <button
        type="button"
        class="pointer-events-auto inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-primary-800 dark:text-primary-400 transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 dark:focus-visible:outline-primary"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        :aria-label="`${switchName}: ${expanded ? $t('switches.miniature.hidePorts') : $t('switches.miniature.showPorts', { n: stackCount })}`"
        @click.prevent.stop="expanded = !expanded"
      >
        {{ expanded ? $t('switches.miniature.hidePorts') : $t('switches.miniature.showPorts', { n: stackCount }) }}
        <UIcon :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <!-- v-if keeps collapsed stacks free of hundreds of port cells -->
    <div v-if="!isStack || expanded" :id="panelId" class="flex flex-col gap-2" :class="{ 'mt-2': isStack }">
      <div v-for="m in members" :key="m.member" class="min-w-0">
        <p v-if="mapped" class="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
          {{ $t('switches.stackMember', { n: m.member }) }}
        </p>
        <div
          role="img"
          :aria-label="mapped ? memberSummary(m) : `${switchName}: ${portSummary(m)}`"
          class="flex w-fit max-w-full flex-col gap-1.5 rounded-md border border-default bg-elevated/50 px-2 py-1.5"
        >
          <div v-for="unit in m.units" :key="unit.unitNumber">
            <div v-if="m.units.length > 1" class="mb-0.5 text-[9px] font-medium uppercase tracking-wider text-muted">{{ unit.label || $t('switches.miniature.unit', { n: unit.unitNumber }) }}</div>
            <div class="flex flex-wrap items-start gap-x-2 gap-y-1">
              <div v-for="(rows, bi) in unit.blocks" :key="bi" class="flex flex-col gap-px">
                <div v-for="(row, ri) in rows" :key="ri" class="flex flex-wrap gap-px">
                  <span
                    v-for="port in row"
                    :key="port.id"
                    class="h-2 rounded-[2px]"
                    :class="[widthClass(port), statusClass(port)]"
                    :data-status="port.status"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Port } from '~~/types/port'
import type { LayoutUnit } from '~~/types/layoutTemplate'
import { buildPortMiniature, type MiniatureMember, type PortStatusCounts } from '~~/app/utils/portMiniature'

const props = defineProps<{
  ports: Port[]
  /** Base (single-member) template units; null when the switch has no usable template. */
  units: LayoutUnit[] | null
  stackSize?: number
  switchName: string
}>()

const { t } = useI18n()
const expanded = ref(false)
const panelId = useId()

const members = computed(() => buildPortMiniature(props.ports, props.units, props.stackSize ?? 1))
const stackCount = computed(() => Math.max(props.stackSize ?? 1, 1))
const isStack = computed(() => stackCount.value > 1)
// false when ports could not be mapped to members (no or outdated template): show them as one group
const mapped = computed(() => members.value.length > 1)

function total(m: MiniatureMember) {
  return m.counts.up + m.counts.down + m.counts.disabled
}

function share(m: MiniatureMember, status: keyof PortStatusCounts) {
  const sum = total(m)
  return sum ? `${(m.counts[status] / sum) * 100}%` : '0%'
}

function portSummary(m: MiniatureMember) {
  return t('switches.miniature.summary', { up: m.counts.up, down: m.counts.down, disabled: m.counts.disabled })
}

function memberSummary(m: MiniatureMember) {
  return `${t('switches.stackMember', { n: m.member })}: ${portSummary(m)}`
}

function widthClass(port: Port) {
  if (port.type === 'qsfp') return 'w-3'
  if (port.type === 'sfp' || port.type === 'sfp+') return 'w-1.5'
  return 'w-2'
}

function statusClass(port: Port) {
  if (port.status === 'up') return 'bg-green-500'
  if (port.status === 'disabled') return 'bg-red-500/80'
  return 'bg-neutral-300 dark:bg-neutral-600'
}
</script>
