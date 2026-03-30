<template>
  <USlideover
    v-model:open="isOpen"
    :title="isEdit ? $t('lag.edit') : $t('lag.create')"
    :description="isEdit ? $t('lag.editDescription') : $t('lag.createDescription')"
  >
    <template #body>
      <UForm :state="form" :validate="validate" :validate-on="['blur', 'change']" class="space-y-4" @submit="onSubmit">
        <UFormField :label="$t('lag.name') + ' *'" name="name" required>
          <UInput v-model="form.name" class="w-full" />
        </UFormField>

        <UFormField :label="$t('lag.description')" name="description">
          <UTextarea v-model="form.description" :rows="2" class="w-full" />
        </UFormField>

        <UFormField :label="$t('lag.ports')" name="ports">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="portId in form.port_ids"
              :key="portId"
              color="info"
              variant="soft"
              size="sm"
              class="cursor-pointer"
              @click="removePort(portId)"
            >
              {{ getPortLabel(portId) }}
              <UIcon name="i-heroicons-x-mark" class="ml-0.5 h-3 w-3" />
            </UBadge>
            <span v-if="form.port_ids.length === 0" class="text-sm text-gray-400">
              {{ $t('lag.noPortsSelected') }}
            </span>
          </div>
        </UFormField>

        <UFormField :label="$t('lag.remoteDevice')" name="remote_device">
          <UInput v-model="form.remote_device" :placeholder="$t('lag.remoteDevicePlaceholder')" class="w-full" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton :loading="saving" icon="i-heroicons-check" @click="onSubmit">
          {{ isEdit ? $t('common.save') : $t('lag.create') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { LAGGroup } from '~~/types/lagGroup'
import { resolvePortLabel } from '~/utils/ports'

const props = defineProps<{
  switchId: string
  ports: any[]
  existingLags: LAGGroup[]
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

const isOpen = ref(false)
const saving = ref(false)
const editingLag = ref<LAGGroup | null>(null)
const isEdit = computed(() => !!editingLag.value)

const form = reactive({
  name: '',
  description: '',
  port_ids: [] as string[],
  remote_device: '',
})

function getPortLabel(portId: string): string {
  return resolvePortLabel(props.ports, portId)
}

function removePort(portId: string) {
  form.port_ids = form.port_ids.filter(id => id !== portId)
}

function validate(state: any) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('lag.validation.nameRequired') })
  }
  if (state.port_ids.length < 2) {
    errors.push({ name: 'ports', message: t('lag.validation.minPorts') })
  }
  for (const portId of state.port_ids) {
    const conflict = props.existingLags.find(
      lag => lag.id !== editingLag.value?.id && lag.port_ids.includes(portId)
    )
    if (conflict) {
      errors.push({
        name: 'ports',
        message: t('lag.validation.portInLag', { port: getPortLabel(portId), lag: conflict.name })
      })
      break
    }
  }
  return errors
}

const { create, update } = useLagGroups(props.switchId)

async function onSubmit() {
  const errors = validate(form)
  if (errors.length > 0) return

  saving.value = true
  try {
    const body = {
      name: form.name.trim(),
      port_ids: [...form.port_ids],
      description: form.description.trim() || undefined,
      remote_device: form.remote_device.trim() || undefined,
    }

    if (isEdit.value && editingLag.value) {
      await update(editingLag.value.id, body)
      toast.add({ title: t('lag.messages.updated'), color: 'success' })
    } else {
      await create(body)
      toast.add({ title: t('lag.messages.created'), color: 'success' })
    }

    isOpen.value = false
    emit('saved')
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function openCreate(portIds: string[]) {
  editingLag.value = null
  form.name = ''
  form.description = ''
  form.port_ids = [...portIds]
  form.remote_device = ''
  isOpen.value = true
}

function openEdit(lag: LAGGroup) {
  editingLag.value = lag
  form.name = lag.name
  form.description = lag.description || ''
  form.port_ids = [...lag.port_ids]
  form.remote_device = lag.remote_device || ''
  isOpen.value = true
}

defineExpose({ openCreate, openEdit })
</script>
