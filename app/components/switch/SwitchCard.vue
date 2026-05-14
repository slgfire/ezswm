<template>
  <!-- Grid variant -->
  <div
    v-if="variant === 'grid'"
    class="stagger-item card-glow group relative flex flex-col rounded-lg bg-default"
  >
    <!-- Favorite star (top-left, always visible) -->
    <button
      class="absolute left-1.5 top-px z-10 transition-colors"
      :class="sw.is_favorite ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400 dark:text-gray-700 dark:hover:text-amber-400'"
      :title="sw.is_favorite ? $t('switches.unfavorite') : $t('switches.favorite')"
      @click.prevent="emit('favorite', sw)"
    >
      <UIcon :name="sw.is_favorite ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="h-3.5 w-3.5" />
    </button>

    <!-- Hover actions -->
    <div class="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-neutral-700/95">
      <UButton v-if="draggable" icon="i-heroicons-bars-2" class="drag-handle cursor-grab active:cursor-grabbing" variant="ghost" color="neutral" size="xs" @click.prevent />
      <UButton icon="i-heroicons-printer" variant="ghost" color="warning" size="xs" @click.prevent="emit('print', sw.id)" />
      <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click.prevent="emit('duplicate', sw)" />
      <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.prevent="emit('delete', sw)" />
    </div>

    <!-- Header: Name + Subtitle + Role -->
    <div class="px-5 pt-4 pb-2">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="truncate font-semibold text-gray-900 group-hover:text-primary-500 dark:text-white" :title="sw.name">
            {{ sw.name }}
          </h3>
          <p v-if="sw.manufacturer || sw.model" class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
            {{ [sw.manufacturer, sw.model].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <UBadge v-if="sw.role" :color="roleColor(sw.role)" variant="subtle" size="sm" class="shrink-0">
          {{ $t(`switches.roles.${sw.role}`) }}
        </UBadge>
      </div>
      <!-- Tags -->
      <div v-if="sw.tags?.length" class="mt-2 flex flex-wrap gap-1">
        <UBadge v-for="tg in sw.tags" :key="tg" color="neutral" variant="soft" size="sm">
          {{ tg }}
        </UBadge>
      </div>
    </div>

    <!-- Info rows -->
    <div class="min-h-[3rem] flex-1 space-y-1.5 px-5 pb-3 text-sm">
      <div v-if="sw.location" class="flex items-center gap-2">
        <UIcon name="i-heroicons-map-pin" class="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
        <span class="text-gray-500 dark:text-gray-400">{{ sw.location }}</span>
      </div>
      <div v-if="sw.management_ip" class="flex items-center gap-2">
        <UIcon name="i-heroicons-globe-alt" class="h-3.5 w-3.5 flex-shrink-0 text-teal-400" />
        <span class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ sw.management_ip }}</span>
      </div>
    </div>

    <!-- Ports footer -->
    <div class="mt-auto flex items-center justify-between border-t border-default px-5 py-2.5 font-mono">
      <span class="text-xs font-medium uppercase tracking-wider text-gray-400">{{ sw.ports?.length || 0 }} ports</span>
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

  <!-- List variant -->
  <div
    v-else
    class="stagger-item card-glow group relative flex items-center gap-4 rounded-lg bg-default px-5 py-3"
  >
    <!-- Favorite star (list view) -->
    <button
      class="shrink-0 transition-colors"
      :class="sw.is_favorite ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400 dark:text-gray-700 dark:hover:text-amber-400'"
      :title="sw.is_favorite ? $t('switches.unfavorite') : $t('switches.favorite')"
      @click.prevent="emit('favorite', sw)"
    >
      <UIcon :name="sw.is_favorite ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="h-3.5 w-3.5" />
    </button>

    <!-- Hover actions -->
    <div class="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-neutral-700/95">
      <UButton icon="i-heroicons-printer" variant="ghost" color="warning" size="xs" @click.prevent="emit('print', sw.id)" />
      <UButton icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="xs" @click.prevent="emit('duplicate', sw)" />
      <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.prevent="emit('delete', sw)" />
    </div>

    <!-- Info -->
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h3 class="truncate font-semibold text-gray-900 dark:text-white">{{ sw.name }}</h3>
        <UBadge v-if="sw.role" :color="roleColor(sw.role)" variant="subtle" size="sm">
          {{ $t(`switches.roles.${sw.role}`) }}
        </UBadge>
        <span v-if="sw.manufacturer || sw.model" class="hidden text-sm text-gray-500 dark:text-gray-400 md:inline">
          {{ [sw.manufacturer, sw.model].filter(Boolean).join(' · ') }}
        </span>
      </div>
      <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
        <span v-if="sw.location" class="flex items-center gap-1">
          <UIcon name="i-heroicons-map-pin" class="h-3 w-3" />
          {{ sw.location }}
        </span>
        <span v-if="sw.management_ip" class="flex items-center gap-1 font-mono">
          <UIcon name="i-heroicons-globe-alt" class="h-3 w-3" />
          {{ sw.management_ip }}
        </span>
        <UBadge v-for="tg in (sw.tags || [])" :key="tg" color="neutral" variant="soft" size="sm">
          {{ tg }}
        </UBadge>
      </div>
    </div>

    <!-- Port Stats (right-aligned) -->
    <div class="hidden shrink-0 text-right sm:block">
      <span class="text-xs font-medium uppercase tracking-wider text-gray-400">{{ sw.ports?.length || 0 }} ports</span>
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

const props = defineProps<{
  sw: Switch
  siteId: string
  variant: 'grid' | 'list'
  draggable?: boolean
}>()

const emit = defineEmits<{
  favorite: [sw: Switch]
  print: [swId: string]
  duplicate: [sw: Switch]
  delete: [sw: Switch]
}>()

const portStats = computed(() => {
  const ports = props.sw.ports || []
  return {
    up: ports.filter((p) => p.status === 'up').length,
    down: ports.filter((p) => p.status === 'down').length,
    disabled: ports.filter((p) => p.status === 'disabled').length
  }
})

</script>
