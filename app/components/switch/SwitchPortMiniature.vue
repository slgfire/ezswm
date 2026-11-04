<template>
  <div v-if="members.length" class="switch-port-miniature flex flex-col gap-1.5" data-testid="switch-port-miniature">
    <!-- Stack: further members and the disclosure sit above the faceplates, so the last faceplate
         lines up with a single switch's faceplate right above the footer -->
    <div v-if="isStack && (preview.expandable || preview.hidden.length)" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p v-if="preview.hidden.length" class="text-xs text-toned" data-testid="switch-port-miniature-more">
        {{ $t('switches.miniature.moreMembers', { n: preview.hidden.length, members: hiddenRange }, preview.hidden.length) }}
        <span class="sr-only">{{ preview.hidden.map(memberSummary).join('; ') }}</span>
      </p>
      <p v-else-if="!mapped && !expanded" class="text-xs text-toned">
        {{ $t('switches.miniature.stackMembers', { n: stackCount }) }}
        <span class="sr-only">{{ portSummary(members[0]!) }}</span>
      </p>
      <button
        v-if="preview.expandable"
        type="button"
        class="pointer-events-auto ml-auto inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-primary-800 dark:text-primary-400 transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 dark:focus-visible:outline-primary"
        :aria-expanded="expanded"
        :aria-controls="panelId"
        :aria-label="`${switchName}: ${expanded ? $t('switches.miniature.hidePorts') : $t('switches.miniature.showPorts', { n: stackCount })}`"
        @click.prevent.stop="expanded = !expanded"
      >
        {{ expanded ? $t('switches.miniature.hidePorts') : $t('switches.miniature.showPorts', { n: stackCount }) }}
        <UIcon :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <!-- Same faceplates as single switches; collapsed stacks render only the first members (v-for keeps port cells bounded).
         v-show keeps the aria-controls target in the DOM while an unmapped stack is collapsed. -->
    <div v-show="preview.shown.length" :id="panelId" class="flex flex-col gap-2" data-testid="switch-port-miniature-members">
      <div v-for="m in preview.shown" :key="m.member" class="min-w-0" :data-member="mapped ? m.member : undefined">
        <div
          role="img"
          :aria-label="mapped ? memberSummary(m) : `${switchName}: ${portSummary(m)}`"
          class="flex w-fit min-w-0 max-w-full items-center gap-2 rounded-md border border-default bg-elevated/50 px-2 py-1.5"
        >
          <span v-if="isStack && mapped" class="shrink-0 font-mono text-[10px] font-semibold leading-none text-muted" aria-hidden="true">
            {{ $t('switches.miniature.memberShort', { n: m.member }) }}
          </span>
          <div class="flex min-w-0 flex-col gap-1.5">
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
  </div>
</template>

<script setup lang="ts">
import type { Port } from '~~/types/port'
import type { LayoutUnit } from '~~/types/layoutTemplate'
import { buildPortMiniature, splitStackPreview, type MiniatureMember } from '~~/app/utils/portMiniature'

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
const preview = computed(() => splitStackPreview(members.value, stackCount.value, expanded.value))
const hiddenRange = computed(() => {
  const hidden = preview.value.hidden
  const short = (m: MiniatureMember) => t('switches.miniature.memberShort', { n: m.member })
  return hidden.length > 1 ? `${short(hidden[0]!)}–${short(hidden.at(-1)!)}` : hidden.map(short).join('')
})

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
