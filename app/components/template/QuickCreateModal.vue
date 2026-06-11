<template>
  <UModal :open="model" :title="$t('templates.quickCreate.title')" :ui="{ content: mode === 'library' ? 'sm:max-w-2xl' : undefined }" @close="onClose">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-bolt" class="h-5 w-5 text-primary-500" />
        <h3 class="text-lg font-semibold">{{ $t('templates.quickCreate.title') }}</h3>
      </div>
    </template>

    <template #body>
      <UTabs v-model="mode" :items="tabItems" variant="link" class="mb-4">
        <template #manual>
          <p class="mb-4 text-sm text-gray-400">{{ $t('templates.quickCreate.description') }}</p>
          <UForm :state="form" :validate="validate" :validate-on="['blur', 'change']" novalidate @submit.prevent="onSubmit">
            <div class="space-y-4">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UFormField :label="$t('templates.fields.name')" name="name" required>
                  <UInput v-model="form.name" :placeholder="$t('templates.fields.name')" autofocus class="w-full" />
                </UFormField>
                <UFormField :label="$t('templates.fields.manufacturer')" name="manufacturer">
                  <UInput v-model="form.manufacturer" :placeholder="$t('templates.fields.manufacturer')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('templates.fields.model')" name="model">
                  <UInput v-model="form.model" :placeholder="$t('templates.fields.model')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('templates.quickCreate.portCount')" name="portCount" required>
                  <UInput v-model.number="form.portCount" type="number" :min="1" :max="96" class="w-full" />
                </UFormField>
                <UFormField :label="$t('templates.quickCreate.portType')" name="portType">
                  <USelect v-model="form.portType" :items="portTypeOptions" value-key="value" class="w-full" />
                </UFormField>
              </div>
            </div>
          </UForm>
        </template>

        <template #library>
          <TemplateLibraryImport @import="handleLibraryImport" />
        </template>
      </UTabs>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <NuxtLink to="/layout-templates/create" class="text-sm text-gray-400 hover:text-primary-500" @click="onClose">
          {{ $t('templates.quickCreate.openFullEditor') }} →
        </NuxtLink>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" @click="onClose">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton v-if="mode === 'manual'" :loading="submitting" icon="i-heroicons-check" @click="onSubmit">
            {{ $t('common.create') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { LayoutTemplate } from '~~/types/layoutTemplate'

const model = defineModel<boolean>({ required: true })

const emit = defineEmits<{ created: [template: LayoutTemplate] }>()

const { t } = useI18n()
const toast = useToast()
const { create } = useLayoutTemplates()

const submitting = ref(false)
const mode = ref<'manual' | 'library'>('manual')

const tabItems = computed(() => [
  { label: t('templates.quickCreate.tabManual'), value: 'manual', slot: 'manual' as const },
  { label: t('templates.quickCreate.tabLibrary'), value: 'library', slot: 'library' as const },
])

const form = reactive({
  name: '',
  manufacturer: '',
  model: '',
  portCount: 24,
  portType: 'rj45' as 'rj45' | 'sfp' | 'management'
})

const portTypeOptions = [
  { label: 'RJ45', value: 'rj45' },
  { label: 'SFP', value: 'sfp' },
  { label: 'Management', value: 'management' }
]

function resetForm() {
  form.name = ''
  form.manufacturer = ''
  form.model = ''
  form.portCount = 24
  form.portType = 'rj45'
}

function validate(state: typeof form): { name: string; message: string }[] {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  if (!state.portCount || state.portCount < 1 || state.portCount > 96) {
    errors.push({ name: 'portCount', message: t('templates.quickCreate.portCountRange') })
  }
  return errors
}

function onClose() {
  model.value = false
  mode.value = 'manual'
}

async function onSubmit() {
  if (validate(form).length > 0) return
  submitting.value = true
  try {
    const created = await create({
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim() || undefined,
      model: form.model.trim() || undefined,
      units: [
        {
          unit_number: 1,
          blocks: [
            {
              type: form.portType,
              count: form.portCount,
              start_index: 1,
              rows: form.portCount > 24 ? 2 : 1
            }
          ]
        }
      ]
    } as Partial<LayoutTemplate>)
    if (created) {
      toast.add({ title: t('templates.messages.created'), color: 'success' })
      emit('created', created)
      resetForm()
      model.value = false
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    submitting.value = false
  }
}

async function handleLibraryImport(template: LayoutTemplate) {
  submitting.value = true
  try {
    // Template from device.get.ts is Omit<LayoutTemplate,'id'|'created_at'|'updated_at'>
    // and its blocks are already schema-valid (speeds + poe types match Zod enum).
    // No poe_selection remapping needed — pass directly to create().
    const created = await create(template as Partial<LayoutTemplate>)
    if (created) {
      toast.add({ title: t('templates.messages.created'), color: 'success' })
      emit('created', created)
      mode.value = 'manual'
      model.value = false
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>
