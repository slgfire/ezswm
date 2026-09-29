<template>
  <div>
    <UButton
      icon="i-heroicons-folder-plus"
      size="xs"
      variant="outline"
      color="neutral"
      @click="openManager"
    >
      {{ $t('switches.groups.manage') }}
    </UButton>

    <UModal v-model:open="open" :title="$t('switches.groups.manage')" :description="$t('switches.groups.manageDescription')">
      <template #body>
        <div class="space-y-4">
          <form class="flex items-end gap-2" @submit.prevent="saveGroup">
            <UFormField :label="$t('switches.groups.name')" class="min-w-0 flex-1">
              <UInput
                v-model="name"
                :placeholder="$t('switches.groups.namePlaceholder')"
                maxlength="100"
                autofocus
              />
            </UFormField>
            <UButton type="submit" size="sm" :loading="saving" :disabled="!name.trim()">
              {{ editingId ? $t('common.save') : $t('common.create') }}
            </UButton>
            <UButton v-if="editingId" type="button" size="sm" color="neutral" variant="ghost" @click="resetForm">
              {{ $t('common.cancel') }}
            </UButton>
          </form>

          <p v-if="!groups.length" class="rounded-md border border-dashed border-default px-3 py-5 text-center text-sm text-muted">
            {{ $t('switches.groups.empty') }}
          </p>

          <ul v-else class="divide-y divide-default rounded-md border border-default">
            <li v-for="(group, index) in groups" :key="group.id" class="flex items-center gap-2 px-3 py-2">
              <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ group.name }}</span>
              <span class="text-xs text-muted">{{ switchCount(group.id) }}</span>
              <UTooltip :text="$t('switches.groups.moveUp')">
                <UButton
                  icon="i-heroicons-chevron-up"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  :aria-label="$t('switches.groups.moveUp')"
                  :disabled="index === 0 || saving"
                  @click="emit('move', index, -1)"
                />
              </UTooltip>
              <UTooltip :text="$t('switches.groups.moveDown')">
                <UButton
                  icon="i-heroicons-chevron-down"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  :aria-label="$t('switches.groups.moveDown')"
                  :disabled="index === groups.length - 1 || saving"
                  @click="emit('move', index, 1)"
                />
              </UTooltip>
              <UTooltip :text="$t('common.edit')">
                <UButton icon="i-heroicons-pencil" size="xs" variant="ghost" color="neutral" :aria-label="$t('common.edit')" @click="editGroup(group)" />
              </UTooltip>
              <UTooltip :text="$t('common.delete')">
                <UButton icon="i-heroicons-trash" size="xs" variant="ghost" color="error" :aria-label="$t('common.delete')" @click="removeGroup(group)" />
              </UTooltip>
            </li>
          </ul>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Switch } from '~~/types/switch'
import type { SwitchGroup } from '~~/types/switchGroup'

const props = defineProps<{
  siteId: string
  groups: SwitchGroup[]
  switches: Switch[]
}>()

const emit = defineEmits<{
  created: [group: SwitchGroup]
  updated: [group: SwitchGroup]
  deleted: [groupId: string]
  move: [index: number, direction: -1 | 1]
}>()

const { t } = useI18n()
const toast = useToast()
const { confirm } = useConfirm()
const open = ref(false)
const name = ref('')
const editingId = ref<string | null>(null)
const saving = ref(false)

function switchCount(groupId: string) {
  return props.switches.filter(sw => sw.group_id === groupId).length
}

function openManager() {
  resetForm()
  open.value = true
}

function editGroup(group: SwitchGroup) {
  editingId.value = group.id
  name.value = group.name
}

function resetForm() {
  editingId.value = null
  name.value = ''
}

async function saveGroup() {
  const cleanName = name.value.trim()
  if (!cleanName) return

  saving.value = true
  try {
    if (editingId.value) {
      const updated = await $fetch<SwitchGroup>(`/api/switch-groups/${editingId.value}`, {
        method: 'PUT',
        query: { siteId: props.siteId },
        body: { name: cleanName }
      })
      toast.add({ title: t('switches.groups.updated'), color: 'success' })
      emit('updated', updated)
    } else {
      const created = await $fetch<SwitchGroup>('/api/switch-groups', {
        method: 'POST',
        body: { site_id: props.siteId, name: cleanName }
      })
      toast.add({ title: t('switches.groups.created'), color: 'success' })
      emit('created', created)
    }
    resetForm()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; statusMessage?: string }
    toast.add({ title: err.data?.message || err.statusMessage || t('errors.serverError'), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function removeGroup(group: SwitchGroup) {
  const count = switchCount(group.id)
  const accepted = await confirm({
    title: t('switches.groups.deleteTitle'),
    message: count > 0
      ? t('switches.groups.deleteWithSwitches', { name: group.name, count })
      : t('switches.groups.deleteConfirm', { name: group.name }),
    confirmLabel: t('common.delete')
  })
  if (!accepted) return

  saving.value = true
  try {
    // $fetch's typed overloads don't allow DELETE here; cast like SwitchPortSidePanel does.
    await ($fetch as (url: string, opts?: Record<string, unknown>) => Promise<unknown>)(`/api/switch-groups/${group.id}`, {
      method: 'DELETE',
      query: { siteId: props.siteId }
    })
    if (editingId.value === group.id) resetForm()
    toast.add({ title: t('switches.groups.deleted'), color: 'success' })
    emit('deleted', group.id)
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; statusMessage?: string }
    toast.add({ title: err.data?.message || err.statusMessage || t('errors.serverError'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>
