<template>
  <div class="p-6">
    <div class="mb-6 flex items-center gap-2">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" :to="`/sites/${siteId}/vlans`" />
      <h1 class="text-2xl font-bold">
        <template v-if="vlan">
          <VlanColorSwatch :color="vlan.color" size="lg" class="mr-2" />
          VLAN {{ vlan.vlan_id }} - {{ vlan.name }}
        </template>
        <template v-else>
          {{ $t('common.loading') }}
        </template>
      </h1>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="vlan" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Info Card -->
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ $t('common.details') }}</h2>
            <div class="flex items-center gap-2">
              <UButton
                v-if="!editing"
                icon="i-heroicons-pencil-square"
                variant="ghost"
                size="sm"
                @click="startEdit"
              >
                {{ $t('common.edit') }}
              </UButton>
              <UButton
                icon="i-heroicons-trash"
                variant="ghost"
                color="error"
                size="sm"
                @click="showDeleteDialog = true"
              >
                {{ $t('common.delete') }}
              </UButton>
            </div>
          </div>
        </template>

        <div v-if="!editing" class="space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-sm text-gray-400">{{ $t('vlans.fields.vlanId') }}</span>
              <p class="font-medium">{{ vlan.vlan_id }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-400">{{ $t('vlans.fields.name') }}</span>
              <p class="font-medium">{{ vlan.name }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-400">{{ $t('vlans.fields.status') }}</span>
              <p>
                <UBadge
                  :color="vlan.status === 'active' ? 'success' : 'neutral'"
                  variant="subtle"
                >
                  {{ vlan.status === 'active' ? $t('common.active') : $t('common.inactive') }}
                </UBadge>
              </p>
            </div>
            <div>
              <span class="text-sm text-gray-400">{{ $t('vlans.fields.routingDevice') }}</span>
              <p class="font-medium">{{ vlan.routing_device || '-' }}</p>
            </div>
            <div>
              <span class="text-sm text-gray-400">{{ $t('vlans.fields.color') }}</span>
              <p class="flex items-center gap-2">
                <VlanColorSwatch :color="vlan.color" size="md" />
                {{ vlan.color }}
              </p>
            </div>
          </div>
          <div v-if="vlan.description">
            <span class="text-sm text-gray-400">{{ $t('common.description') }}</span>
            <p class="font-medium">{{ vlan.description }}</p>
          </div>
        </div>

        <!-- Edit Form -->
        <UForm v-else :state="editForm" :validate="validate" :validate-on="['blur', 'submit']" novalidate @submit="onSave">
          <div class="space-y-4">
            <UFormField :label="$t('vlans.fields.vlanId')" name="vlan_id" required>
              <UInput v-model.number="editForm.vlan_id" type="number" :min="1" :max="4094" required />
            </UFormField>
            <UFormField :label="$t('vlans.fields.name')" name="name" required>
              <UInput v-model="editForm.name" required />
            </UFormField>
            <UFormField :label="$t('common.description')" name="description">
              <UTextarea v-model="editForm.description" :rows="3" />
            </UFormField>
            <UFormField :label="$t('vlans.fields.status')" name="status">
              <USelect v-model="editForm.status" :items="statusOptions" />
            </UFormField>
            <UFormField :label="$t('vlans.fields.routingDevice')" name="routing_device">
              <UInput v-model="editForm.routing_device" />
            </UFormField>
            <UFormField :label="$t('vlans.fields.color')" name="color" required>
              <div class="flex items-center gap-3">
                <input
                  v-model="editForm.color"
                  type="color"
                  class="h-10 w-14 cursor-pointer rounded border border-gray-700 bg-gray-900"
                />
                <UInput v-model="editForm.color" class="w-32" />
                <VlanColorSwatch :color="editForm.color" size="lg" />
              </div>
            </UFormField>
          </div>
          <div class="mt-4 flex items-center gap-3">
            <UButton type="submit" :loading="saving" icon="i-heroicons-check">
              {{ $t('common.save') }}
            </UButton>
            <UButton variant="ghost" color="neutral" @click="editing = false">
              {{ $t('common.cancel') }}
            </UButton>
          </div>
        </UForm>
      </UCard>

      <!-- Associated Networks -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">{{ $t('networks.title') }}</h2>
        </template>

        <div v-if="associatedNetworks.length > 0" class="space-y-2">
          <NuxtLink
            v-for="net in associatedNetworks"
            :key="net.id"
            :to="`/sites/${siteId}/networks/${net.id}`"
            class="block rounded-md p-2 hover:bg-gray-800"
          >
            <p class="font-medium text-primary-400">{{ net.name }}</p>
            <p class="text-sm text-gray-400">{{ net.subnet }}</p>
          </NuxtLink>
        </div>
        <p v-else class="text-sm text-gray-500">{{ $t('common.noData') }}</p>
      </UCard>
    </div>

    <!-- Delete confirmation -->
    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('vlans.delete')"
      :message="vlan ? `${$t('vlans.delete')}: ${vlan.name} (VLAN ${vlan.vlan_id})?` : ''"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const router = useRouter()
const { items: allVlans, fetch: fetchVlans, update, remove } = useVlans()
const { items: allNetworks, fetch: fetchNetworks } = useNetworks()

const id = route.params.id as string
const loading = ref(true)
const vlan = ref<any>(null)

useHead({ title: computed(() => vlan.value ? `VLAN ${vlan.value.vlan_id} — ${vlan.value.name}` : t('vlans.title')) })
const editing = ref(false)
const saving = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)

const editForm = ref({
  vlan_id: 0,
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

const associatedNetworks = computed(() => {
  if (!vlan.value) return []
  return allNetworks.value.filter((n: any) => n.vlan_id === vlan.value.id)
})

function startEdit() {
  editForm.value = {
    vlan_id: vlan.value.vlan_id,
    name: vlan.value.name,
    description: vlan.value.description || '',
    status: vlan.value.status,
    routing_device: vlan.value.routing_device || '',
    color: vlan.value.color
  }
  editing.value = true
}

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

async function onSave() {
  saving.value = true
  try {
    await update(id, {
      vlan_id: editForm.value.vlan_id,
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || undefined,
      status: editForm.value.status,
      routing_device: editForm.value.routing_device.trim() || undefined,
      color: editForm.value.color.toUpperCase()
    })
    toast.add({ title: t('vlans.messages.updated'), color: 'success' })
    editing.value = false
    await loadVlan()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  try {
    await remove(id)
    toast.add({ title: t('vlans.messages.deleted'), color: 'success' })
    showDeleteDialog.value = false
    await router.push(`/sites/${siteId.value}/vlans`)
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

async function loadVlan() {
  loading.value = true
  try {
    const data = await $fetch<any>(`/api/vlans/${id}`)
    vlan.value = data
  } catch {
    toast.add({ title: t('errors.notFound'), color: 'error' })
    await router.push(`/sites/${siteId.value}/vlans`)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadVlan(), fetchNetworks()])
})
</script>
