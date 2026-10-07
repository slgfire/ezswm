<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-6">
    <div class="mb-6 flex items-start gap-3">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        to="/sites"
        :aria-label="$t('common.back')"
      />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('sites.create') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('sites.createDescription') }}</p>
      </div>
    </div>

    <div v-if="!authResolved" class="flex justify-center py-12" role="status" aria-live="polite">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" />
    </div>
    <div v-else-if="!canEditInfrastructure" class="space-y-4">
      <SharedViewOnlyNotice />
      <UButton color="neutral" variant="subtle" to="/sites">{{ $t('common.back') }}</UButton>
    </div>

    <UForm v-else :state="form" :validate="validate" :validate-on="['blur', 'change']" novalidate @submit.prevent="onSubmit">
      <div class="space-y-6">
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">{{ $t('sites.sections.siteInfo') }}</h2>
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
definePageMeta({
  middleware: [async () => {
    const auth = useAuth()
    if (!auth.authResolved.value) await auth.fetchUser()
    if (!auth.canEditInfrastructure.value) {
      return navigateTo({ path: '/sites', query: { access: 'readonly' } })
    }
  }]
})

const { t } = useI18n()
useHead({ title: t('sites.create', 'Create Site') })
const toast = useToast()
const { authResolved, canEditInfrastructure, handleInfrastructureForbidden } = useAuth()
let permissionGeneration = 0
let accessChangeNoticeShown = false

function noticeAccessChanged() {
  if (accessChangeNoticeShown) return
  accessChangeNoticeShown = true
  toast.add({ title: t('permissions.accessChanged'), color: 'warning' })
}

const submitting = ref(false)

const form = reactive({
  name: '',
  description: ''
})

const { clearDirty } = useUnsavedChanges(form)

function validate(state: typeof form): { name: string; message: string }[] {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  return errors
}

async function onSubmit() {
  if (!authResolved.value || !canEditInfrastructure.value) return
  const validationErrors = validate(form)
  if (validationErrors.length > 0) return

  const generation = permissionGeneration
  submitting.value = true
  let result: { id: string } | undefined
  try {
    result = await $fetch<{ id: string }>('/api/sites', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        description: form.description.trim() || undefined
      }
    })
    if (generation !== permissionGeneration || !canEditInfrastructure.value) return
    clearDirty()
    toast.add({ title: t('sites.messages.created', 'Site created'), color: 'success' })
  } catch (e: unknown) {
    const access = await handleInfrastructureForbidden(e)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled') return
    const message = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: message || t('errors.serverError', 'Server error'), color: 'error' })
    return
  } finally {
    submitting.value = false
  }
  if (generation === permissionGeneration && canEditInfrastructure.value) {
    await navigateTo(result?.id ? `/sites/${result.id}/switches` : '/sites')
  }
}

watch(canEditInfrastructure, (canEdit, wasEditable) => {
  if (!wasEditable || canEdit || !authResolved.value) return
  permissionGeneration++
  form.name = ''
  form.description = ''
  // Discard revoked draft state without opening the unsaved-changes flow.
  clearDirty()
  void navigateTo({ path: '/sites', query: { access: 'readonly' } })
}, { flush: 'sync' })
</script>
