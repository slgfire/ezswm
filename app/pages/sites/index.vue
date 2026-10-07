<template>
  <div class="p-6">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-bold">{{ $t('sites.title', 'Sites') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('sites.description') }}</p>
      </div>
      <UButton v-if="canEditInfrastructure" to="/sites/create" icon="i-heroicons-plus" size="sm">
        {{ $t('sites.create', 'Create Site') }}
      </UButton>
    </div>

    <SharedViewOnlyNotice v-if="route.query.access === 'readonly'" class="mb-4" />

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" />
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
        <div v-if="canEditInfrastructure" class="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-elevated/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100">
          <UButton icon="i-heroicons-pencil" variant="ghost" color="primary" size="xs" @click.prevent="editSite(site)" />
          <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.prevent="confirmDelete(site)" />
        </div>

        <!-- Header -->
        <div class="px-5 pt-4 pb-3">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
              <UIcon name="i-heroicons-building-office-2" class="h-5 w-5 text-primary-500" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="truncate font-semibold text-highlighted group-hover:text-primary-500">
                {{ site.name }}
              </h3>
              <p v-if="site.description" class="mt-0.5 truncate text-sm text-muted">
                {{ site.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Counts footer -->
        <div class="mt-auto flex items-center justify-between border-t border-default px-5 py-2.5 text-xs text-muted">
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-server-stack" class="h-3.5 w-3.5" />
            {{ site._counts?.switches || 0 }} {{ $t('nav.switches', 'Switches') }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-tag" class="h-3.5 w-3.5" />
            {{ site._counts?.vlans || 0 }} VLANs
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-globe-alt" class="h-3.5 w-3.5" />
            {{ site._counts?.networks || 0 }} {{ $t('nav.networks', 'Networks') }}
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
      <template v-if="canEditInfrastructure" #action>
        <UButton to="/sites/create" icon="i-heroicons-plus">
          {{ $t('sites.create', 'Create Site') }}
        </UButton>
      </template>
    </SharedEmptyState>

    <!-- Edit Slideover -->
    <USlideover v-if="canEditInfrastructure" :open="showEdit" :title="$t('sites.edit', 'Edit Site')" description="Edit site properties" @update:open="onOpenChange">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="$t('sites.fields.name', 'Name')" name="name" required>
            <UInput v-model="editForm.name" class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.description', 'Description')" name="description">
            <UTextarea v-model="editForm.description" :rows="3" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="subtle" color="neutral" @click="requestClose">{{ $t('common.cancel', 'Cancel') }}</UButton>
          <UButton :loading="saving" icon="i-heroicons-check" @click="onSave">{{ $t('common.save', 'Save') }}</UButton>
        </div>
      </template>
    </USlideover>

    <!-- Delete confirmation -->
    <SharedConfirmDialog
      v-if="canEditInfrastructure"
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
import type { Site } from '~~/types/site'

useHead({ title: 'Sites' })
const toast = useToast()
const { t } = useI18n()
const route = useRoute()
const { authResolved, canEditInfrastructure, handleInfrastructureForbidden } = useAuth()
let accessChangeNoticeShown = false
let permissionGeneration = 0

function noticeAccessChanged() {
  if (accessChangeNoticeShown) return
  accessChangeNoticeShown = true
  toast.add({ title: t('permissions.accessChanged'), color: 'warning' })
}

interface SiteWithCounts extends Site {
  _counts?: { switches: number; vlans: number; networks: number }
}

const sites = ref<SiteWithCounts[]>([])
const loading = ref(true)
const showEdit = ref(false)
const saving = ref(false)
const editTarget = ref<SiteWithCounts | null>(null)
const editForm = reactive({ name: '', description: '' })
const showDeleteDialog = ref(false)
const deleteTarget = ref<SiteWithCounts | null>(null)
const deleting = ref(false)

const deleteMessage = computed(() =>
  deleteTarget.value ? `${t('sites.delete', 'Delete Site')}: ${deleteTarget.value.name}?` : ''
)

async function loadSites() {
  loading.value = true
  try {
    const res = await $fetch<{ data: SiteWithCounts[] }>('/api/sites')
    sites.value = res?.data || []
  } catch {
    sites.value = []
  } finally {
    loading.value = false
  }
}

const { takeSnapshot, requestClose, onOpenChange } = useSlideoverGuard(
  editForm,
  () => { showEdit.value = false }
)

function editSite(site: SiteWithCounts) {
  if (!authResolved.value || !canEditInfrastructure.value) return
  editTarget.value = site
  editForm.name = site.name
  editForm.description = site.description || ''
  showEdit.value = true
  takeSnapshot()
}

async function onSave() {
  if (!authResolved.value || !canEditInfrastructure.value || !editTarget.value) return
  if (!editForm.name.trim()) return
  const generation = permissionGeneration
  const target = editTarget.value
  const body = { name: editForm.name.trim(), description: editForm.description.trim() || undefined }
  saving.value = true
  try {
    await $fetch(`/api/sites/${target.id}`, {
      method: 'PUT',
      body
    })
    if (generation !== permissionGeneration || !canEditInfrastructure.value) return
    toast.add({ title: t('sites.messages.updated', 'Site updated'), color: 'success' })
    showEdit.value = false
    await loadSites()
  } catch (e: unknown) {
    const access = await handleInfrastructureForbidden(e)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled') return
    const message = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: message || t('errors.serverError', 'Server error'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function confirmDelete(site: SiteWithCounts) {
  if (!authResolved.value || !canEditInfrastructure.value) return
  deleteTarget.value = site
  showDeleteDialog.value = true
}

async function onDelete() {
  if (!authResolved.value || !canEditInfrastructure.value || !deleteTarget.value) return
  const generation = permissionGeneration
  const target = deleteTarget.value
  deleting.value = true
  try {
    await $fetch(`/api/sites/${target.id}`, { method: 'DELETE' })
    if (generation !== permissionGeneration || !canEditInfrastructure.value) return
    toast.add({ title: t('sites.messages.deleted', 'Site deleted'), color: 'success' })
    showDeleteDialog.value = false
    await loadSites()
  } catch (e: unknown) {
    const access = await handleInfrastructureForbidden(e)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled') return
    const message = (e as { data?: { message?: string } })?.data?.message
    toast.add({ title: message || t('errors.serverError', 'Server error'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

watch(canEditInfrastructure, (canEdit, wasEditable) => {
  if (!wasEditable || canEdit || !authResolved.value) return
  permissionGeneration++
  // Discard revoked editor state directly; never route through the dirty-save guard.
  showEdit.value = false
  editTarget.value = null
  editForm.name = ''
  editForm.description = ''
  showDeleteDialog.value = false
  deleteTarget.value = null
}, { flush: 'sync' })

onMounted(() => { loadSites() })
</script>
