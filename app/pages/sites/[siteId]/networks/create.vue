<template>
  <div class="p-6">
    <div class="mb-6 flex items-center gap-2">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" :to="`/sites/${siteId}/networks`" />
      <h1 class="text-2xl font-bold">{{ $t('networks.create') }}</h1>
    </div>

    <UForm :state="form" :validate="validate" :validate-on="['blur', 'submit']" novalidate @submit="onSubmit">
      <div class="max-w-4xl space-y-6">
        <!-- Network Info -->
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Network</h2>
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
                <span class="text-xs text-gray-500">Comma-separated</span>
              </template>
            </UFormField>
          </div>
        </div>

        <!-- Association -->
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">VLAN & Description</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="$t('networks.fields.vlan')">
              <USelect v-model="form.vlan_id" :items="vlanOptions" :placeholder="$t('networks.fields.vlan')" value-key="value" class="w-full" />
            </UFormField>
            <UFormField :label="$t('common.description')" class="md:col-span-2">
              <UTextarea v-model="form.description" :placeholder="$t('common.description')" :rows="3" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <UButton variant="ghost" color="neutral" :to="`/sites/${siteId}/networks`">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton type="submit" :loading="submitting" icon="i-heroicons-check">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const { t } = useI18n()
useHead({ title: t('networks.create') })
const toast = useToast()
const router = useRouter()
const { create } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()

const submitting = ref(false)
const dnsInput = ref('')

const form = ref({
  name: '',
  subnet: '',
  gateway: '',
  vlan_id: '',
  description: ''
})

const vlanOptions = computed(() => {
  const options: { label: string; value: string }[] = []
  vlans.value.forEach((v: any) => {
    options.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id })
  })
  return options
})

function validate(state: any) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: 'Name is required' })
  }
  if (!state.subnet?.trim()) {
    errors.push({ name: 'subnet', message: 'Subnet (CIDR) is required' })
  } else if (!state.subnet.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/)) {
    errors.push({ name: 'subnet', message: 'Invalid CIDR notation (e.g. 10.0.1.0/24)' })
  }
  return errors
}

function parseDns(): string[] {
  if (!dnsInput.value.trim()) return []
  return dnsInput.value.split(',').map(s => s.trim()).filter(Boolean)
}

async function onSubmit() {
  submitting.value = true
  try {
    const result = await create({
      name: form.value.name.trim(),
      subnet: form.value.subnet.trim(),
      gateway: form.value.gateway.trim() || undefined,
      dns_servers: parseDns(),
      vlan_id: form.value.vlan_id || undefined,
      description: form.value.description.trim() || undefined
    })
    toast.add({ title: t('networks.messages.created'), color: 'success' })
    await router.push(`/sites/${siteId.value}/networks/${(result as any).id}`)
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchVlans()
})
</script>
