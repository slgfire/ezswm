<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-6">
    <div class="mb-6 flex items-start gap-3">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" :to="`/sites/${siteId}/subnets`" :aria-label="$t('common.back')" />
      <div>
        <h1 class="text-2xl font-bold">{{ $t('networks.create') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('networks.createDescription') }}</p>
      </div>
    </div>

    <div v-if="!authResolved" class="flex justify-center py-12" role="status" aria-live="polite">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" />
    </div>
    <div v-else-if="!canEditInfrastructure" class="space-y-4">
      <SharedViewOnlyNotice />
      <UButton color="neutral" variant="subtle" :to="`/sites/${siteId}/subnets`">{{ $t('common.back') }}</UButton>
    </div>

    <UForm v-else :state="form" :validate="validate" :validate-on="['blur', 'change']" novalidate @submit.prevent="onSubmit">
      <div class="space-y-6">
        <!-- Network Info -->
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">{{ $t('networks.sections.networkInfo') }}</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="$t('networks.fields.name')" name="name" required>
              <UInput v-model="form.name" :placeholder="$t('networks.fields.name')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.fields.subnet')" name="subnet" required>
              <UInput v-model="form.subnet" placeholder="10.0.1.0/24" class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.fields.gateway')">
              <UInput v-model="form.gateway" placeholder="10.0.1.1" class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.fields.dnsServers')">
              <UInput v-model="dnsInput" placeholder="8.8.8.8, 8.8.4.4" class="w-full" />
              <template #hint>
                <span class="text-xs text-muted">{{ $t('networks.validation.commaSeparated') }}</span>
              </template>
            </UFormField>
          </div>
        </div>

        <!-- Association -->
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">{{ $t('networks.sections.vlanDescription') }}</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="$t('networks.fields.vlan')">
              <USelect v-model="form.vlan_id" :items="vlanOptions" :placeholder="$t('networks.fields.vlan')" value-key="value" class="w-full" />
            </UFormField>
            <UFormField :label="$t('common.description')" class="md:col-span-2">
              <UTextarea v-model="form.description" :placeholder="$t('common.description')" :rows="3" class="w-full" />
            </UFormField>
          </div>
        </div>

      </div>

      <!-- Actions -->
      <div class="mt-4 flex justify-end gap-3">
        <UButton variant="ghost" color="neutral" :to="`/sites/${siteId}/subnets`">
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
import type { Network } from '~~/types/network'

definePageMeta({
  middleware: [async (to) => {
    const auth = useAuth()
    if (!auth.authResolved.value) await auth.fetchUser()
    if (!auth.canEditInfrastructure.value) {
      return navigateTo({
        path: `/sites/${to.params.siteId}/subnets`,
        query: { access: 'readonly' }
      })
    }
  }]
})

const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const { t } = useI18n()
useHead({ title: t('networks.create') })
const toast = useToast()
const router = useRouter()
const { authResolved, canEditInfrastructure, handleInfrastructureForbidden } = useAuth()
const { create } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()
let permissionGeneration = 0
let accessChangeNoticeShown = false

function noticeAccessChanged() {
  if (accessChangeNoticeShown) return
  accessChangeNoticeShown = true
  toast.add({ title: t('permissions.accessChanged'), color: 'warning' })
}

const submitting = ref(false)
const dnsInput = ref('')

const form = ref({
  name: '',
  subnet: '',
  gateway: '',
  vlan_id: '',
  description: ''
})

const dirtyTracker = computed(() => ({ ...form.value, dnsInput: dnsInput.value }))
const { clearDirty } = useUnsavedChanges(dirtyTracker)

const vlanOptions = computed(() => {
  const options: { label: string; value: string }[] = []
  vlans.value.forEach((v) => {
    options.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id })
  })
  return options
})

function validate(state: typeof form.value) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  if (!state.subnet?.trim()) {
    errors.push({ name: 'subnet', message: t('networks.validation.subnetRequired') })
  } else if (!state.subnet.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/)) {
    errors.push({ name: 'subnet', message: t('networks.validation.subnetFormat') })
  }
  return errors
}

function parseDns(): string[] {
  if (!dnsInput.value.trim()) return []
  return dnsInput.value.split(',').map(s => s.trim()).filter(Boolean)
}

async function onSubmit() {
  if (!authResolved.value || !canEditInfrastructure.value) return
  const generation = permissionGeneration
  submitting.value = true
  let result: unknown
  try {
    const body: Record<string, unknown> = {
      name: form.value.name.trim(),
      subnet: form.value.subnet.trim(),
      gateway: form.value.gateway.trim() || undefined,
      dns_servers: parseDns(),
      vlan_id: form.value.vlan_id || undefined,
      description: form.value.description.trim() || undefined
    }
    if (siteId.value && siteId.value !== 'all') {
      body.site_id = siteId.value
    }
    result = await create(body)
    if (generation !== permissionGeneration || !canEditInfrastructure.value) return
    clearDirty()
    toast.add({ title: t('networks.messages.created'), color: 'success' })
  } catch (err: unknown) {
    const access = await handleInfrastructureForbidden(err)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled') return
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
    return
  } finally {
    submitting.value = false
  }
  if (generation === permissionGeneration && canEditInfrastructure.value) {
    await router.push(`/sites/${siteId.value}/subnets/${(result as Network).id}`)
  }
}

watch(canEditInfrastructure, (canEdit, wasEditable) => {
  if (!wasEditable || canEdit || !authResolved.value) return
  permissionGeneration++
  form.value = {
    name: '',
    subnet: '',
    gateway: '',
    vlan_id: '',
    description: ''
  }
  dnsInput.value = ''
  // Discard revoked draft state without opening the unsaved-changes flow.
  clearDirty()
  void navigateTo({ path: `/sites/${siteId.value}/subnets`, query: { access: 'readonly' } })
}, { flush: 'sync' })

const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

onMounted(() => {
  fetchVlans(siteParams.value)
})
</script>
