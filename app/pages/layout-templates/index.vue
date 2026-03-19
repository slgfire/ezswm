<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('templates.title') }}</h1>
      <UButton to="/layout-templates/create" icon="i-heroicons-plus" size="sm">
        {{ $t('templates.create') }}
      </UButton>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <template v-else-if="items.length > 0">
      <UTable :rows="items" :columns="columns">
        <template #name-data="{ row }">
          <NuxtLink :to="`/layout-templates/${row.id}`" class="font-medium text-primary-500 hover:underline">
            {{ row.name }}
          </NuxtLink>
        </template>

        <template #unitCount-data="{ row }">
          <span class="text-xs text-gray-400">{{ row.units?.length || 0 }}</span>
        </template>

        <template #portCount-data="{ row }">
          <span class="text-xs text-gray-400">{{ getTotalPortCount(row) }}</span>
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center gap-1">
            <UTooltip :text="$t('common.edit')">
              <UButton :to="`/layout-templates/${row.id}/edit`" icon="i-heroicons-pencil-square" size="xs" variant="ghost" />
            </UTooltip>
            <UTooltip :text="$t('common.delete')">
              <UButton icon="i-heroicons-trash" size="xs" color="red" variant="ghost" @click="confirmDelete(row)" />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </template>

    <SharedEmptyState
      v-else
      icon="i-heroicons-rectangle-group"
      :title="$t('templates.emptyTitle')"
      :description="$t('templates.emptyDescription')"
    >
      <template #action>
        <UButton to="/layout-templates/create" icon="i-heroicons-plus">
          {{ $t('templates.create') }}
        </UButton>
      </template>
    </SharedEmptyState>

    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('templates.delete')"
      :message="$t('templates.confirmDelete')"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const { items, loading, fetch, remove } = useLayoutTemplates()

const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)

const columns = computed(() => [
  { key: 'name', label: t('templates.fields.name') },
  { key: 'manufacturer', label: t('templates.fields.manufacturer') },
  { key: 'model', label: t('templates.fields.model') },
  { key: 'unitCount', label: 'Units' },
  { key: 'portCount', label: 'Ports' },
  { key: 'actions', label: '' }
])

function getTotalPortCount(template: any): number {
  if (!template.units) return 0
  return template.units.reduce((total: number, unit: any) =>
    total + (unit.blocks || []).reduce((bt: number, b: any) => bt + (b.count || 0), 0), 0)
}

function confirmDelete(row: any) { deleteTarget.value = row; showDeleteDialog.value = true }

async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await remove(deleteTarget.value.id)
    toast.add({ title: t('templates.messages.deleted'), color: 'green' })
    await fetch()
  } catch { toast.add({ title: t('errors.serverError'), color: 'red' }) }
  finally { showDeleteDialog.value = false; deleteTarget.value = null }
}

onMounted(() => { fetch() })
</script>
