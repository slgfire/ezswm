<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-6">
    <div class="mb-6 flex items-center gap-3">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        to="/sites"
        :aria-label="$t('common.back')"
      />
      <h1 class="text-2xl font-bold">{{ $t('sites.create') }}</h1>
    </div>

    <UForm :state="form" :validate="validate" :validate-on="['blur', 'change']" novalidate @submit="onSubmit">
      <div class="space-y-6">
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">{{ $t('sites.sections.siteInfo') }}</h2>
          <div class="space-y-4">
            <UFormField :label="$t('sites.fields.name')" name="name" required>
              <UInput v-model="form.name" :placeholder="$t('sites.fields.name')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('common.description')" name="description">
              <UTextarea v-model="form.description" :placeholder="$t('common.description')" :rows="3" class="w-full" />
            </UFormField>
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-3">
        <UButton variant="ghost" color="neutral" to="/sites">
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
const { t } = useI18n()
useHead({ title: t('sites.create', 'Create Site') })
const toast = useToast()

const submitting = ref(false)

const form = reactive({
  name: '',
  description: ''
})

function validate(state: typeof form): { name: string; message: string }[] {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  return errors
}

async function onSubmit() {
  const validationErrors = validate(form)
  if (validationErrors.length > 0) return

  submitting.value = true
  try {
    const result = await $fetch<{ id: string }>('/api/sites', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        description: form.description.trim() || undefined
      }
    })
    toast.add({ title: t('sites.messages.created', 'Site created'), color: 'success' })
    if (result?.id) {
      await navigateTo(`/sites/${result.id}/switches`)
    } else {
      await navigateTo('/sites')
    }
  } catch (e: unknown) {
    const message = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: message || t('errors.serverError', 'Server error'), color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>
