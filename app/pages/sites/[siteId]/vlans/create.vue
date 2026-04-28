<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-6">
    <div class="mb-6 flex items-center gap-3">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" :to="`/sites/${siteId}/vlans`" :aria-label="$t('common.back')" />
      <h1 class="text-2xl font-bold">{{ $t('vlans.create') }}</h1>
    </div>

    <UForm :state="form" :validate="validate" :validate-on="['blur', 'change']" novalidate @submit="onSubmit">
      <div class="space-y-6">
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
              <div class="flex items-center gap-2">
                <label class="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-default">
                  <input v-model="form.color" type="color" class="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                  <span class="h-5 w-5 rounded" :style="{ backgroundColor: form.color }" />
                </label>
                <UInput v-model="form.color" placeholder="#FF5733" class="w-32 font-mono" />
              </div>
            </UFormField>
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-3">
        <UButton variant="ghost" color="neutral" :to="`/sites/${siteId}/vlans`">
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
import type { VLAN } from '~~/types/vlan'

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
    const suggestion = await $fetch<{ color?: string }>('/api/vlans/suggest-color')
    if (suggestion?.color) {
      form.value.color = suggestion.color
    }
  } catch {
    // Use default color
  }
})

function validate(state: typeof form.value) {
  const errors: { name: string; message: string }[] = []
  if (!state.vlan_id || state.vlan_id < 1 || state.vlan_id > 4094) {
    errors.push({ name: 'vlan_id', message: t('networks.validation.vlanIdRange') })
  }
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  if (!state.color?.match(/^#[0-9A-Fa-f]{6}$/)) {
    errors.push({ name: 'color', message: t('networks.validation.colorFormat') })
  }
  return errors
}

async function onSubmit() {
  submitting.value = true
  try {
    const body: Record<string, unknown> = {
      vlan_id: form.value.vlan_id,
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      status: form.value.status,
      routing_device: form.value.routing_device.trim() || undefined,
      color: form.value.color.toUpperCase()
    }
    if (siteId.value && siteId.value !== 'all') {
      body.site_id = siteId.value
    }
    const result = await create(body)
    toast.add({ title: t('vlans.messages.created'), color: 'success' })
    await router.push(`/sites/${siteId.value}/vlans/${(result as VLAN).id}`)
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>
