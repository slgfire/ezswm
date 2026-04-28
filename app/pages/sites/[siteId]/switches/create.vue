<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-6">
    <div class="mb-6 flex items-center gap-3">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        :to="`/sites/${siteId}/switches`"
        :aria-label="$t('common.back')"
      />
      <h1 class="text-2xl font-bold">{{ $t('switches.create') }}</h1>
    </div>

    <UForm :state="form" :validate="validate" :validate-on="['blur', 'change']" novalidate @submit="onSubmit">
      <div class="space-y-6">
        <!-- Basic Info -->
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">{{ $t('switches.sections.basicInfo') }}</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="$t('switches.fields.name')" name="name" required>
              <UInput v-model="form.name" :placeholder="$t('switches.fields.name')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('switches.fields.manufacturer')" name="manufacturer">
              <UInput v-model="form.manufacturer" :placeholder="$t('switches.fields.manufacturer')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('switches.fields.model')" name="model">
              <UInput v-model="form.model" :placeholder="$t('switches.fields.model')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('switches.fields.serialNumber')" name="serial_number">
              <UInput v-model="form.serial_number" :placeholder="$t('switches.fields.serialNumber')" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Network & Location -->
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">{{ $t('switches.sections.networkLocation') }}</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="$t('switches.fields.managementIp')" name="management_ip">
              <UInput v-model="form.management_ip" :placeholder="$t('switches.fields.managementIp')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('switches.fields.firmwareVersion')" name="firmware_version">
              <UInput v-model="form.firmware_version" :placeholder="$t('switches.fields.firmwareVersion')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('switches.fields.location')" name="location">
              <UInput v-model="form.location" :placeholder="$t('switches.fields.location')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('switches.fields.rackPosition')" name="rack_position">
              <UInput v-model="form.rack_position" :placeholder="$t('switches.fields.rackPosition')" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Template & Classification -->
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">{{ $t('switches.sections.templateClassification') }}</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="$t('switches.fields.layoutTemplate')" name="layout_template_id">
              <USelect v-model="form.layout_template_id" :items="templateOptions" :placeholder="$t('switches.fields.layoutTemplate')" value-key="value" class="w-full" />
            </UFormField>
            <UFormField v-if="form.layout_template_id" :label="$t('switches.stackSize')" name="stack_size">
              <USelect
                v-model="form.stack_size"
                :items="stackSizeOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('switches.fields.role')" name="role">
              <USelectMenu v-model="form.role" :search-input="false" :items="roleOptions" value-key="value" class="w-full" />
            </UFormField>
            <UFormField :label="$t('switches.fields.tags')" name="tags" class="md:col-span-2">
              <UInput v-model="tagInput" :placeholder="$t('switches.tagsPlaceholder')" class="w-full" @keydown.enter.prevent="addTag" />
              <div v-if="form.tags.length > 0" class="mt-2 flex flex-wrap gap-1">
                <UBadge v-for="tg in form.tags" :key="tg" color="neutral" variant="soft" size="sm" class="cursor-pointer" @click="removeTag(tg)">
                  {{ tg }} <UIcon name="i-heroicons-x-mark" class="ml-0.5 h-3 w-3" />
                </UBadge>
              </div>
            </UFormField>
          </div>
        </div>

        <!-- Notes -->
        <div class="list-container rounded-lg bg-default p-5">
          <UFormField :label="$t('common.notes')" name="notes">
            <UTextarea v-model="form.notes" :placeholder="$t('common.notes')" :rows="3" class="w-full" />
          </UFormField>
        </div>

      </div>

      <!-- Actions -->
      <div class="mt-4 flex justify-end gap-3">
        <UButton color="neutral" variant="ghost" :to="`/sites/${siteId}/switches`">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" :loading="submitting" icon="i-heroicons-check">
          {{ $t('common.save') }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const { t } = useI18n()
useHead({ title: t('switches.create') })
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
  notes: '',
  stack_size: 1
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

const stackSizeOptions = Array.from({ length: 8 }, (_, i) => ({
  label: String(i + 1),
  value: i + 1
}))

const templateOptions = computed(() => {
  const options: { label: string; value: string }[] = []
  for (const tpl of templates.value) {
    options.push({ label: tpl.name, value: tpl.id })
  }
  return options
})

function validate(state: typeof form): { name: string; message: string }[] {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  if (state.management_ip?.trim() && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(state.management_ip.trim())) {
    errors.push({ name: 'management_ip', message: t('networks.validation.managementIpFormat') })
  }
  return errors
}

async function onSubmit() {
  const validationErrors = validate(form)
  if (validationErrors.length > 0) return

  submitting.value = true
  try {
    const body: Record<string, unknown> = { ...form, tags: [...form.tags] }
    // Remove empty optional fields
    for (const key of Object.keys(body)) {
      if (body[key] === '' || (Array.isArray(body[key]) && body[key].length === 0)) {
        delete body[key]
      }
    }
    body.stack_size = form.stack_size > 1 ? form.stack_size : undefined
    if (siteId.value && siteId.value !== 'all') {
      body.site_id = siteId.value
    }
    const result = await create(body)
    toast.add({ title: t('switches.messages.created'), color: 'success' })
    if (result?.id) {
      await navigateTo(`/sites/${siteId.value}/switches/${result.id}`)
    } else {
      await navigateTo(`/sites/${siteId.value}/switches`)
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>
