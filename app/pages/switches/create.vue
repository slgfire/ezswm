<template>
  <div class="p-6">
    <div class="mb-6 flex items-center gap-3">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        to="/switches"
        :aria-label="$t('common.back')"
      />
      <h1 class="text-2xl font-bold">{{ $t('switches.create') }}</h1>
    </div>

    <UCard class="max-w-2xl">
      <UForm :state="form" @submit.prevent="onSubmit">
        <div class="space-y-4">
          <UFormField :label="$t('switches.fields.name') + ' *'" name="name">
            <UInput v-model="form.name" :placeholder="$t('switches.fields.name')" required />
          </UFormField>

          <UFormField :label="$t('switches.fields.model')" name="model">
            <UInput v-model="form.model" :placeholder="$t('switches.fields.model')" />
          </UFormField>

          <UFormField :label="$t('switches.fields.manufacturer')" name="manufacturer">
            <UInput v-model="form.manufacturer" :placeholder="$t('switches.fields.manufacturer')" />
          </UFormField>

          <UFormField :label="$t('switches.fields.serialNumber')" name="serial_number">
            <UInput v-model="form.serial_number" :placeholder="$t('switches.fields.serialNumber')" />
          </UFormField>

          <UFormField :label="$t('switches.fields.location')" name="location">
            <UInput v-model="form.location" :placeholder="$t('switches.fields.location')" />
          </UFormField>

          <UFormField :label="$t('switches.fields.rackPosition')" name="rack_position">
            <UInput v-model="form.rack_position" :placeholder="$t('switches.fields.rackPosition')" />
          </UFormField>

          <UFormField :label="$t('switches.fields.managementIp')" name="management_ip">
            <UInput v-model="form.management_ip" :placeholder="$t('switches.fields.managementIp')" />
          </UFormField>

          <UFormField :label="$t('switches.fields.firmwareVersion')" name="firmware_version">
            <UInput v-model="form.firmware_version" :placeholder="$t('switches.fields.firmwareVersion')" />
          </UFormField>

          <UFormField :label="$t('switches.fields.layoutTemplate')" name="layout_template_id">
            <USelect
              v-model="form.layout_template_id"
              :items="templateOptions"
              :placeholder="$t('switches.fields.layoutTemplate')"
              option-attribute="label"
              value-attribute="value"
            />
          </UFormField>

          <UFormField :label="$t('switches.fields.role')" name="role">
            <USelectMenu :search-input="false"
              v-model="form.role"
              :items="roleOptions"
              option-attribute="label"
              value-attribute="value"
            />
          </UFormField>

          <UFormField :label="$t('switches.fields.tags')" name="tags">
            <UInput
              v-model="tagInput"
              :placeholder="$t('switches.tagsPlaceholder')"
              @keydown.enter.prevent="addTag"
            />
            <div v-if="form.tags.length > 0" class="mt-2 flex flex-wrap gap-1">
              <UBadge v-for="tg in form.tags" :key="tg" color="neutral" variant="soft" size="xs" class="cursor-pointer" @click="removeTag(tg)">
                {{ tg }} <UIcon name="i-heroicons-x-mark" class="ml-0.5 h-3 w-3" />
              </UBadge>
            </div>
          </UFormField>

          <UFormField :label="$t('common.notes')" name="notes">
            <UTextarea v-model="form.notes" :placeholder="$t('common.notes')" :rows="3" />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton color="neutral" variant="ghost" to="/switches">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton type="submit" :loading="submitting" icon="i-heroicons-check">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const { create } = useSwitches()
const { items: templates, fetch: fetchTemplates } = useLayoutTemplates()

const submitting = ref(false)

const tagInput = ref('')

const form = reactive({
  name: '',
  model: '',
  manufacturer: '',
  serial_number: '',
  location: '',
  rack_position: '',
  management_ip: '',
  firmware_version: '',
  layout_template_id: '',
  role: '',
  tags: [] as string[],
  notes: ''
})

const roleOptions = computed(() => [
  { label: '---', value: '' },
  { label: t('switches.roles.core'), value: 'core' },
  { label: t('switches.roles.distribution'), value: 'distribution' },
  { label: t('switches.roles.access'), value: 'access' },
  { label: t('switches.roles.management'), value: 'management' }
])

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter(t => t !== tag)
}

const templateOptions = computed(() => {
  const options = [{ label: '---', value: '' }]
  for (const tpl of templates.value) {
    options.push({ label: tpl.name, value: tpl.id })
  }
  return options
})

async function onSubmit() {
  if (!form.name.trim()) return

  submitting.value = true
  try {
    const body: Record<string, any> = { ...form, tags: [...form.tags] }
    // Remove empty optional fields
    for (const key of Object.keys(body)) {
      if (body[key] === '' || (Array.isArray(body[key]) && body[key].length === 0)) {
        delete body[key]
      }
    }
    const result = await create(body)
    toast.add({ title: t('switches.messages.created'), color: 'green' })
    if (result && (result as any).id) {
      await navigateTo(`/switches/${(result as any).id}`)
    } else {
      await navigateTo('/switches')
    }
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>
