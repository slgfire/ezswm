<template>
  <!-- Grid variant -->
  <div
    v-if="variant === 'grid'"
    class="stagger-item card-glow group relative flex flex-col rounded-lg bg-default"
    :class="{ 'h-full': uniform }"
  >
    <NuxtLink
      :to="detailPath"
      class="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      :aria-label="$t('switches.management.openDetails', { name: sw.name })"
    />
    <!-- Favorite star (top-left, always visible) -->
    <button
      v-if="editable"
      class="absolute left-1.5 top-px z-30 transition-colors pointer-events-auto"
      :class="sw.is_favorite ? 'text-amber-400' : 'text-muted hover:text-amber-400'"
      :title="sw.is_favorite ? $t('switches.unfavorite') : $t('switches.favorite')"
      @click.prevent="emit('favorite', sw)"
    >
      <UIcon :name="sw.is_favorite ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="h-3.5 w-3.5" />
    </button>

    <!-- Hover actions -->
    <div class="switch-card-actions absolute right-2 top-2 z-30 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-neutral-700/95">
      <UButton v-if="draggable && editable" icon="i-tabler-grip-horizontal" class="drag-handle cursor-grab active:cursor-grabbing" variant="ghost" color="neutral" size="xs" @click.prevent />
      <UDropdownMenu
        v-if="groups && editable"
        :items="groupMenuItems"
        :content="{ align: 'end' }"
        :ui="{ content: 'max-h-60 min-w-44 overflow-y-auto' }"
      >
        <UTooltip :text="$t('switches.groups.assign')">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            class="shrink-0"
            :aria-label="$t('switches.groups.assign')"
            @click.prevent
          >
            <UIcon name="i-heroicons-rectangle-group" class="h-4 w-4 shrink-0" />
          </UButton>
        </UTooltip>
      </UDropdownMenu>
      <UButton icon="i-heroicons-printer" variant="ghost" color="warning" size="xs" @click.prevent="emit('print', sw.id)" />
      <UTooltip v-if="managementHref" :text="$t('switches.management.open', { name: sw.name })">
        <a
          :href="managementHref"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="$t('switches.management.open', { name: sw.name })"
          class="inline-flex h-7 w-7 items-center justify-center rounded text-success-500 transition-colors hover:bg-success/10 hover:text-success-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
        >
          <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" aria-hidden="true" />
        </a>
      </UTooltip>
      <UButton v-if="editable" icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click.prevent="emit('duplicate', sw)" />
      <UButton v-if="editable" icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.prevent="emit('delete', sw)" />
    </div>

    <!-- Header: fixed-height zone so grouped rows align (name, subtitle, role, tags) -->
    <div class="relative z-20 flex h-full flex-col pointer-events-none">
    <div class="h-[6.5rem] px-5 pt-4 pb-2">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="truncate font-semibold text-highlighted group-hover:text-primary-500" :title="sw.name">
            {{ sw.name }}
          </h3>
          <!-- Reserve the subtitle line even when empty -->
          <p class="mt-0.5 truncate text-sm text-toned">
            <template v-if="sw.manufacturer || sw.model">{{ [sw.manufacturer, sw.model].filter(Boolean).join(' · ') }}</template>
            <template v-else>&nbsp;</template>
          </p>
        </div>
        <UBadge v-if="sw.role" :color="roleColor(sw.role)" variant="subtle" size="sm" class="shrink-0">
          {{ $t(`switches.roles.${sw.role}`) }}
        </UBadge>
      </div>
      <!-- Tags: clamped to a single line so the header zone stays stable -->
      <div class="mt-1.5 flex h-6 flex-wrap items-center gap-1 overflow-hidden">
        <UBadge v-for="tg in (sw.tags || [])" :key="tg" color="neutral" variant="soft" size="sm">
          {{ tg }}
        </UBadge>
      </div>
    </div>

    <!-- Info rows: fixed-height zone keeps the ports footer aligned across cards -->
    <div class="h-[3rem] space-y-1.5 px-5 pb-3 text-sm">
      <div v-if="sw.location" class="flex items-center gap-2">
        <UIcon name="i-heroicons-map-pin" class="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
        <span class="text-toned">{{ sw.location }}</span>
      </div>
      <div v-if="sw.management_ip" class="flex items-center gap-2">
        <UIcon v-if="sw.management_ip" name="i-heroicons-globe-alt" class="h-3.5 w-3.5 flex-shrink-0 text-teal-400" />
        <span v-if="sw.management_ip" class="font-mono text-xs text-toned">{{ sw.management_ip }}</span>
      </div>
    </div>

    <!-- Ports footer -->
    <div class="mt-auto flex items-center justify-between border-t border-default px-5 py-2.5 font-mono">
      <span class="text-xs font-medium uppercase tracking-wider text-muted">{{ sw.ports?.length || 0 }} ports</span>
      <div class="flex items-center gap-3 text-xs">
        <span v-if="portStats.up" class="flex items-center gap-1 text-green-500">
          <span class="inline-block h-2 w-2 rounded-full bg-green-500" />
          {{ portStats.up }}
        </span>
        <span v-if="portStats.down" class="flex items-center gap-1 text-gray-400">
          <span class="inline-block h-2 w-2 rounded-full bg-gray-400" />
          {{ portStats.down }}
        </span>
        <span v-if="portStats.disabled" class="flex items-center gap-1 text-red-500">
          <span class="inline-block h-2 w-2 rounded-full bg-red-500" />
          {{ portStats.disabled }}
        </span>
      </div>
    </div>
    </div>
  </div>

  <!-- List variant -->
  <div
    v-else
    class="switch-card-list stagger-item card-glow group relative flex items-center gap-4 rounded-lg bg-default px-5 py-3"
  >
    <NuxtLink
      :to="detailPath"
      class="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      :aria-label="$t('switches.management.openDetails', { name: sw.name })"
    />
    <!-- Favorite star (list view) -->
    <button
      v-if="editable"
      class="relative z-30 shrink-0 transition-colors pointer-events-auto"
      :class="sw.is_favorite ? 'text-amber-400' : 'text-muted hover:text-amber-400'"
      :title="sw.is_favorite ? $t('switches.unfavorite') : $t('switches.favorite')"
      @click.prevent="emit('favorite', sw)"
    >
      <UIcon :name="sw.is_favorite ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="h-3.5 w-3.5" />
    </button>

    <!-- Hover actions -->
    <div class="switch-card-actions absolute right-2 top-2 z-30 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-neutral-700/95">
      <UDropdownMenu
        v-if="groups && editable"
        :items="groupMenuItems"
        :content="{ align: 'end' }"
        :ui="{ content: 'max-h-60 min-w-44 overflow-y-auto' }"
      >
        <UTooltip :text="$t('switches.groups.assign')">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            class="shrink-0"
            :aria-label="$t('switches.groups.assign')"
            @click.prevent
          >
            <UIcon name="i-heroicons-rectangle-group" class="h-4 w-4 shrink-0" />
          </UButton>
        </UTooltip>
      </UDropdownMenu>
      <UButton icon="i-heroicons-printer" variant="ghost" color="warning" size="xs" @click.prevent="emit('print', sw.id)" />
      <UTooltip v-if="managementHref" :text="$t('switches.management.open', { name: sw.name })">
        <a
          :href="managementHref"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="$t('switches.management.open', { name: sw.name })"
          class="inline-flex h-7 w-7 items-center justify-center rounded text-success-500 transition-colors hover:bg-success/10 hover:text-success-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
        >
          <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" aria-hidden="true" />
        </a>
      </UTooltip>
      <UButton v-if="editable" icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click.prevent="emit('duplicate', sw)" />
      <UButton v-if="editable" icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.prevent="emit('delete', sw)" />
    </div>

    <!-- Info -->
    <div class="relative z-20 min-w-0 flex-1 pointer-events-none">
      <div class="flex items-center gap-2">
        <h3 class="truncate font-semibold text-highlighted">{{ sw.name }}</h3>
        <UBadge v-if="sw.role" :color="roleColor(sw.role)" variant="subtle" size="sm">
          {{ $t(`switches.roles.${sw.role}`) }}
        </UBadge>
        <span v-if="sw.manufacturer || sw.model" class="hidden text-sm text-toned md:inline">
          {{ [sw.manufacturer, sw.model].filter(Boolean).join(' · ') }}
        </span>
      </div>
      <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span v-if="sw.location" class="flex items-center gap-1">
          <UIcon name="i-heroicons-map-pin" class="h-3 w-3" />
          {{ sw.location }}
        </span>
        <span v-if="sw.management_ip" class="flex items-center gap-1 font-mono">
          <UIcon v-if="sw.management_ip" name="i-heroicons-globe-alt" class="h-3 w-3" />
          <template v-if="sw.management_ip">{{ sw.management_ip }}</template>
        </span>
        <UBadge v-for="tg in (sw.tags || [])" :key="tg" color="neutral" variant="soft" size="sm">
          {{ tg }}
        </UBadge>
      </div>
    </div>

    <!-- Port Stats (right-aligned) -->
    <div class="relative z-20 hidden shrink-0 text-right sm:block pointer-events-none">
      <span class="text-xs font-medium uppercase tracking-wider text-muted">{{ sw.ports?.length || 0 }} ports</span>
      <div class="mt-1 flex items-center justify-end gap-3 text-xs">
        <span v-if="portStats.up" class="flex items-center gap-1 text-green-500">
          <span class="inline-block h-2 w-2 rounded-full bg-green-500" />
          {{ portStats.up }}
        </span>
        <span v-if="portStats.down" class="flex items-center gap-1 text-gray-400">
          <span class="inline-block h-2 w-2 rounded-full bg-gray-400" />
          {{ portStats.down }}
        </span>
        <span v-if="portStats.disabled" class="flex items-center gap-1 text-red-500">
          <span class="inline-block h-2 w-2 rounded-full bg-red-500" />
          {{ portStats.disabled }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Switch } from '~~/types/switch'
import type { SwitchGroup } from '~~/types/switchGroup'
import type { DropdownMenuItem } from '@nuxt/ui'
import { getSwitchManagementHref } from '~~/app/utils/switchManagement'

const props = withDefaults(defineProps<{
  sw: Switch
  siteId: string
  variant: 'grid' | 'list'
  draggable?: boolean
  /** Stretch to fill the grid cell so grouped rows align. */
  uniform?: boolean
  /** Current site's groups for the assign-to-group menu. When undefined the
      action is hidden (all-sites overview and contexts without group data). */
  groups?: SwitchGroup[]
  editable?: boolean
}>(), {
  draggable: false,
  uniform: false,
  groups: undefined,
  editable: true
})

const emit = defineEmits<{
  favorite: [sw: Switch]
  print: [swId: string]
  duplicate: [sw: Switch]
  delete: [sw: Switch]
  assignGroup: [sw: Switch, groupId: string | null]
}>()

const { t } = useI18n()
const managementHref = computed(() => getSwitchManagementHref(props.sw))
const detailPath = computed(() => `/sites/${props.siteId}/switches/${props.sw.slug || props.sw.id}`)

const groupMenuItems = computed<DropdownMenuItem[]>(() => {
  if (!props.groups) return []
  const items: DropdownMenuItem[] = props.groups.map(group => ({
    label: group.name,
    type: 'checkbox' as const,
    checked: props.sw.group_id === group.id,
    onSelect(e: Event) {
      e.preventDefault()
      emit('assignGroup', props.sw, group.id)
    }
  }))
  items.push({
    type: 'separator' as const
  }, {
    label: t('switches.groups.ungrouped'),
    icon: 'i-heroicons-x-mark',
    type: 'checkbox' as const,
    checked: !props.sw.group_id,
    onSelect(e: Event) {
      e.preventDefault()
      emit('assignGroup', props.sw, null)
    }
  })
  return items
})

const portStats = computed(() => {
  const ports = props.sw.ports || []
  return {
    up: ports.filter((p) => p.status === 'up').length,
    down: ports.filter((p) => p.status === 'down').length,
    disabled: ports.filter((p) => p.status === 'disabled').length
  }
})

</script>

<style scoped>
@media (hover: none) {
  .switch-card-actions {
    opacity: 1;
    position: static;
    inset: auto;
    align-self: flex-end;
    flex-wrap: wrap;
    justify-content: flex-end;
    max-width: 100%;
  }

  .switch-card-grid .switch-card-actions {
    margin: 0.5rem 0.5rem 0;
  }

  .switch-card-list {
    flex-wrap: wrap;
  }

  .switch-card-list .switch-card-actions {
    margin-left: auto;
  }

  .switch-card-list > .relative.z-20.min-w-0.flex-1 {
    flex-basis: 100%;
  }
}
</style>
