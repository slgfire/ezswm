<template>
  <div class="p-6">
    <div class="mb-6 flex items-center gap-2">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" to="/vlans" />
      <h1 class="text-2xl font-bold">{{ $t('vlans.create') }}</h1>
    </div>

    <UCard class="max-w-2xl">
      <form @submit.prevent="onSubmit">
        <div class="space-y-4">
          <!-- VLAN ID -->
          <UFormField :label="$t('vlans.fields.vlanId') + ' *'" :error="errors.vlan_id">
            <UInput
              v-model.number="form.vlan_id"
              type="number"
              :min="1"
              :max="4094"
              :placeholder="$t('vlans.fields.vlanId')"
              required
            />
          </UFormField>

          <!-- Name -->
          <UFormField :label="$t('vlans.fields.name') + ' *'" :error="errors.name">
            <UInput
              v-model="form.name"
              :placeholder="$t('vlans.fields.name')"
              required
            />
          </UFormField>

          <!-- Description -->
          <UFormField :label="$t('common.description')">
            <UTextarea
              v-model="form.description"
              :placeholder="$t('common.description')"
              :rows="3"
            />
          </UFormField>

          <!-- Status -->
          <UFormField :label="$t('vlans.fields.status')">
            <USelect v-model="form.status" :items="statusOptions" />
          </UFormField>

          <!-- Routing Device -->
          <UFormField :label="$t('vlans.fields.routingDevice')">
            <UInput
              v-model="form.routing_device"
              :placeholder="$t('vlans.fields.routingDevice')"
            />
          </UFormField>

          <!-- Color -->
          <UFormField :label="$t('vlans.fields.color') + ' *'" :error="errors.color">
            <div class="flex items-center gap-3">
              <input
                v-model="form.color"
                type="color"
                class="h-10 w-14 cursor-pointer rounded border border-gray-700 bg-gray-900"
              />
              <UInput
                v-model="form.color"
                placeholder="#FF5733"
                class="w-32"
              />
              <VlanColorSwatch :color="form.color" size="lg" />
            </div>
          </UFormField>
        </div>

        <div class="mt-6 flex items-center gap-3">
          <UButton type="submit" :loading="submitting" icon="i-heroicons-check">
            {{ $t('common.save') }}
          </UButton>
          <UButton variant="ghost" color="gray" to="/vlans">
            {{ $t('common.cancel') }}
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const { create } = useVlans()

const submitting = ref(false)
const errors = ref<Record<string, string>>({})

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

function validate(): boolean {
  errors.value = {}
  if (!form.value.vlan_id || form.value.vlan_id < 1 || form.value.vlan_id > 4094) {
    errors.value.vlan_id = 'VLAN ID must be between 1 and 4094'
  }
  if (!form.value.name?.trim()) {
    errors.value.name = 'Name is required'
  }
  if (!form.value.color?.match(/^#[0-9A-Fa-f]{6}$/)) {
    errors.value.color = 'Valid hex color required (e.g. #FF5733)'
  }
  return Object.keys(errors.value).length === 0
}

async function onSubmit() {
  if (!validate()) return
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
    toast.add({ title: t('vlans.messages.created'), color: 'green' })
    await router.push(`/vlans/${(result as any).id}`)
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    submitting.value = false
  }
}
</script>
