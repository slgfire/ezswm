<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('sites.title', 'Sites') }}</h1>
      <UButton to="/sites/create" icon="i-heroicons-plus" size="sm">
        {{ $t('sites.create', 'Create Site') }}
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <!-- Sites Grid -->
    <div v-else-if="sites.length > 0" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="site in sites"
        :key="site.id"
        :to="`/sites/${site.id}/switches`"
        class="stagger-item card-glow group relative flex flex-col rounded-lg bg-default"
      >
        <!-- Hover actions -->
        <div class="absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-white/95 px-1.5 py-1 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 dark:bg-neutral-700/95">
          <UButton icon="i-heroicons-pencil" variant="ghost" color="primary" size="2xs" @click.prevent="editSite(site)" />
          <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="2xs" @click.prevent="confirmDelete(site)" />
        </div>

        <!-- Header -->
        <div class="px-5 pt-4 pb-3">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
              <UIcon name="i-heroicons-building-office-2" class="h-5 w-5 text-primary-500" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="truncate font-semibold text-gray-900 group-hover:text-primary-500 dark:text-white">
                {{ site.name }}
              </h3>
              <p v-if="site.description" class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                {{ site.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Counts footer -->
        <div class="mt-auto flex items-center justify-between border-t border-default px-5 py-2.5 text-xs text-gray-400">
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-server-stack" class="h-3.5 w-3.5" />
            {{ site.counts?.switches || 0 }} {{ $t('nav.switches', 'Switches') }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-tag" class="h-3.5 w-3.5" />
            {{ site.counts?.vlans || 0 }} VLANs
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-globe-alt" class="h-3.5 w-3.5" />
            {{ site.counts?.networks || 0 }} {{ $t('nav.networks', 'Networks') }}
          </span>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty state -->
    <SharedEmptyState
      v-if="!loading && sites.length === 0"
      icon="i-heroicons-building-office-2"
      :title="$t('sites.emptyTitle', 'No sites yet')"
      :description="$t('sites.emptyDescription', 'Create your first site to start managing your infrastructure.')"
    >
      <template #action>
        <UButton to="/sites/create" icon="i-heroicons-plus">
          {{ $t('sites.create', 'Create Site') }}
        </UButton>
      </template>
    </SharedEmptyState>

    <!-- Edit Slideover -->
    <USlideover v-model:open="showEdit" :title="$t('sites.edit', 'Edit Site')" description="Edit site properties">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="$t('sites.fields.name', 'Name') + ' *'" name="name" required>
            <UInput v-model="editForm.name" class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.description', 'Description')" name="description">
            <UTextarea v-model="editForm.description" :rows="3" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showEdit = false">{{ $t('common.cancel', 'Cancel') }}</UButton>
          <UButton :loading="saving" icon="i-heroicons-check" @click="onSave">{{ $t('common.save', 'Save') }}</UButton>
        </div>
      </template>
    </USlideover>

    <!-- Delete confirmation -->
    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('sites.delete', 'Delete Site')"
      :message="deleteMessage"
      :confirm-label="$t('common.delete', 'Delete')"
      :loading="deleting"
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Sites' })
const toast = useToast()
const { t } = useI18n()

const sites = ref<any[]>([])
const loading = ref(true)
const showEdit = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const editForm = reactive({ name: '', description: '' })
const showDeleteDialog = ref(false)
const deleteTarget = ref<any>(null)
const deleting = ref(false)

const deleteMessage = computed(() =>
  deleteTarget.value ? `${t('sites.delete', 'Delete Site')}: ${deleteTarget.value.name}?` : ''
)

async function loadSites() {
  loading.value = true
  try {
    const data = await $fetch<any[]>('/api/sites')
    sites.value = data || []
  } catch {
    sites.value = []
  } finally {
    loading.value = false
  }
}

function editSite(site: any) {
  editTarget.value = site
  editForm.name = site.name
  editForm.description = site.description || ''
  showEdit.value = true
}

async function onSave() {
  if (!editForm.name.trim()) return
  saving.value = true
  try {
    await $fetch(`/api/sites/${editTarget.value.id}`, {
      method: 'PUT',
      body: { name: editForm.name.trim(), description: editForm.description.trim() || undefined }
    })
    toast.add({ title: t('sites.messages.updated', 'Site updated'), color: 'success' })
    showEdit.value = false
    await loadSites()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError', 'Server error'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(site: any) {
  deleteTarget.value = site
  showDeleteDialog.value = true
}

async function onDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/sites/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('sites.messages.deleted', 'Site deleted'), color: 'success' })
    showDeleteDialog.value = false
    await loadSites()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError', 'Server error'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(() => { loadSites() })
</script>
