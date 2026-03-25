<template>
  <div class="p-6">
    <div class="mb-6 flex items-center gap-2">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" :to="`/sites/${siteId}/vlans`" />
      <h1 class="text-2xl font-bold">{{ $t('vlans.create') }}</h1>
    </div>

    <UForm :state="form" :validate="validate" :validate-on="['blur', 'submit']" novalidate @submit="onSubmit">
      <div class="max-w-4xl space-y-6">
        <div class="list-container rounded-lg bg-default p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">VLAN</h2>
          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <UFormField :label="$t('vlans.fields.vlanId')" name="vlan_id" required>
                <UInput v-model.number="form.vlan_id" type="number" :min="1" :max="4094" :placeholder="$t('vlans.fields.vlanId')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('vlans.fields.name')" name="name" required>
                <UInput v-model="form.name" :placeholder="$t('vlans.fields.name')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('vlans.fields.status')">
                <USelect v-model="form.status" :items="statusOptions" class="w-full" />
              </UFormField>
              <UFormField :label="$t('vlans.fields.routingDevice')">
                <UInput v-model="form.routing_device" :placeholder="$t('vlans.fields.routingDevice')" class="w-full" />
              </UFormField>
            </div>
            <UFormField :label="$t('common.description')">
              <UTextarea v-model="form.description" :placeholder="$t('common.description')" :rows="2" class="w-full" />
            </UFormField>
            <UFormField :label="$t('vlans.fields.color')" name="color" required>
              <div class="flex items-center gap-3">
                <input v-model="form.color" type="color" class="h-10 w-14 cursor-pointer rounded border border-default bg-default" />
                <UInput v-model="form.color" placeholder="#FF5733" class="w-32" />
                <VlanColorSwatch :color="form.color" size="lg" />
              </div>
            </UFormField>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <UButton variant="ghost" color="neutral" :to="`/sites/${siteId}/vlans`">
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
useHead({ title: t('vlans.create') })
const toast = useToast()
const router = useRouter()
const { create } = useVlans()

const submitting = ref(false)

const form = ref({
  vlan_id: null as number | null,
  name: '',
  description: '',
  status: 'active',
  routing_device: '',
  color: '#3498DB'
})

const statusOptions = computed(() => [
  { label: t('common.active'), value: 'active' },
  { label: t('common.inactive'), value: 'inactive' }
])

// Try to fetch suggested color on mount
onMounted(async () => {
  try {
    const suggestion = await $fetch<any>('/api/vlans/suggest-color')
    if (suggestion?.color) {
      form.value.color = suggestion.color
    }
  } catch {
    // Use default color
  }
})

function validate(state: any) {
  const errors: { name: string; message: string }[] = []
  if (!state.vlan_id || state.vlan_id < 1 || state.vlan_id > 4094) {
    errors.push({ name: 'vlan_id', message: 'VLAN ID must be between 1 and 4094' })
  }
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: 'Name is required' })
  }
  if (!state.color?.match(/^#[0-9A-Fa-f]{6}$/)) {
    errors.push({ name: 'color', message: 'Valid hex color required (e.g. #FF5733)' })
  }
  return errors
}

async function onSubmit() {
  submitting.value = true
  try {
    const result = await create({
      vlan_id: form.value.vlan_id,
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      status: form.value.status,
      routing_device: form.value.routing_device.trim() || undefined,
      color: form.value.color.toUpperCase()
    })
    toast.add({ title: t('vlans.messages.created'), color: 'success' })
    await router.push(`/sites/${siteId.value}/vlans/${(result as any).id}`)
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>
