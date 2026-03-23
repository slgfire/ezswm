<template>
  <div class="p-6">
    <div class="mb-6 flex items-center gap-2">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" to="/networks" />
      <h1 class="text-2xl font-bold">{{ $t('networks.create') }}</h1>
    </div>

    <UCard class="max-w-2xl">
      <form @submit.prevent="onSubmit">
        <div class="space-y-4">
          <!-- Name -->
          <UFormField :label="$t('networks.fields.name') + ' *'" :error="errors.name">
            <UInput
              v-model="form.name"
              :placeholder="$t('networks.fields.name')"
              required
              class="w-full"
            />
          </UFormField>

          <!-- Subnet -->
          <UFormField :label="$t('networks.fields.subnet') + ' *'" :error="errors.subnet">
            <UInput
              v-model="form.subnet"
              placeholder="10.0.1.0/24"
              required
              class="w-full"
            />
          </UFormField>

          <!-- Gateway -->
          <UFormField :label="$t('networks.fields.gateway')">
            <UInput
              v-model="form.gateway"
              placeholder="10.0.1.1"
              class="w-full"
            />
          </UFormField>

          <!-- DNS Servers -->
          <UFormField :label="$t('networks.fields.dnsServers')">
            <UInput
              v-model="dnsInput"
              placeholder="8.8.8.8, 8.8.4.4"
              class="w-full"
            />
            <template #hint>
              <span class="text-xs text-gray-500">{{ $t('networks.fields.dnsServers') }} (comma-separated)</span>
            </template>
          </UFormField>

          <!-- VLAN -->
          <UFormField :label="$t('networks.fields.vlan')">
            <USelect
              v-model="form.vlan_id"
              :items="vlanOptions"
              :placeholder="$t('networks.fields.vlan')"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Description -->
          <UFormField :label="$t('common.description')">
            <UTextarea
              v-model="form.description"
              :placeholder="$t('common.description')"
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="mt-6 flex items-center gap-3">
          <UButton type="submit" :loading="submitting" icon="i-heroicons-check">
            {{ $t('common.save') }}
          </UButton>
          <UButton variant="ghost" color="neutral" to="/networks">
            {{ $t('common.cancel') }}
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
useHead({ title: t('networks.create') })
const toast = useToast()
const router = useRouter()
const { create } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()

const submitting = ref(false)
const errors = ref<Record<string, string>>({})
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

function validate(): boolean {
  errors.value = {}
  if (!form.value.name?.trim()) {
    errors.value.name = 'Name is required'
  }
  if (!form.value.subnet?.trim()) {
    errors.value.subnet = 'Subnet (CIDR) is required'
  } else if (!form.value.subnet.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/)) {
    errors.value.subnet = 'Invalid CIDR notation (e.g. 10.0.1.0/24)'
  }
  return Object.keys(errors.value).length === 0
}

function parseDns(): string[] {
  if (!dnsInput.value.trim()) return []
  return dnsInput.value.split(',').map(s => s.trim()).filter(Boolean)
}

async function onSubmit() {
  if (!validate()) return
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
    await router.push(`/networks/${(result as any).id}`)
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
