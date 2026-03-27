<template>
  <div class="p-6">
    <div class="mb-6 flex items-center gap-3">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        to="/sites"
        :aria-label="$t('common.back', 'Back')"
      />
      <h1 class="text-2xl font-bold">{{ $t('sites.create', 'Create Site') }}</h1>
    </div>

    <UForm :state="form" :validate="validate" :validate-on="['blur', 'submit']" novalidate @submit="onSubmit">
      <div class="max-w-4xl space-y-6">
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Site</h2>
          <div class="space-y-4">
            <UFormField :label="$t('sites.fields.name', 'Name')" name="name" required>
              <UInput v-model="form.name" :placeholder="$t('sites.fields.name', 'Name')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('common.description', 'Description')" name="description">
              <UTextarea v-model="form.description" :placeholder="$t('common.description', 'Description')" :rows="3" class="w-full" />
            </UFormField>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <UButton variant="ghost" color="neutral" to="/sites">
            {{ $t('common.cancel', 'Cancel') }}
          </UButton>
          <UButton type="submit" :loading="submitting" icon="i-heroicons-check">
            {{ $t('common.save', 'Save') }}
          </UButton>
        </div>
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
    errors.push({ name: 'name', message: 'Name is required' })
  }
  return errors
}

async function onSubmit() {
  const validationErrors = validate(form)
  if (validationErrors.length > 0) return

  submitting.value = true
  try {
    const result = await $fetch<any>('/api/sites', {
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
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError', 'Server error'), color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>
