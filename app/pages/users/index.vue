<template>
  <div v-if="isAuthLoading" class="flex min-h-48 items-center justify-center p-6" role="status" aria-live="polite">
    <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" aria-hidden="true" />
    <span class="sr-only">{{ $t('common.loading') }}</span>
  </div>

  <div v-else-if="isAdmin && authResolved" class="p-6">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-bold">{{ $t('users.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('users.description') }}</p>
      </div>
      <UButton icon="i-heroicons-plus" size="sm" :disabled="!!pendingMutation" @click="openCreateDialog">
        {{ $t('users.management.createAccount') }}
      </UButton>
    </div>

    <section aria-labelledby="users-list-title">
      <h2 id="users-list-title" class="sr-only">{{ $t('users.listTitle') }}</h2>

      <div v-if="loading || !hasLoaded" class="flex justify-center py-12" role="status" aria-live="polite">
        <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" aria-hidden="true" />
        <span class="sr-only">{{ $t('users.loading') }}</span>
      </div>

      <div v-else-if="loadError" class="list-container flex flex-col items-center gap-4 rounded-lg bg-default p-4 text-center sm:p-6">
        <UAlert
          class="w-full max-w-xl text-left"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="$t('users.loadFailedTitle')"
          :description="$t('users.loadFailedDescription')"
          role="alert"
        />
        <UButton color="neutral" variant="outline" icon="i-heroicons-arrow-path" :disabled="!!pendingMutation" @click="loadUsers">
          {{ $t('users.retry') }}
        </UButton>
      </div>

      <SharedEmptyState
        v-else-if="userRows.length === 0"
        icon="i-lucide-users-round"
        :title="$t('users.emptyTitle')"
        :description="$t('users.emptyDescription')"
      />

      <template v-else>
        <div class="list-container overflow-x-auto rounded-lg bg-default" role="region" :aria-label="$t('users.tableCaption')" tabindex="0">
          <table class="w-full min-w-[56rem] table-fixed divide-y divide-default text-left text-sm">
            <caption class="sr-only">{{ $t('users.tableCaption') }}</caption>
            <colgroup>
              <col class="w-[18%]">
              <col class="w-[20%]">
              <col class="w-[12%]">
              <col class="w-[18%]">
              <col class="w-[14%]">
              <col class="w-[18%]">
            </colgroup>
            <thead class="border-b border-default text-[10px] uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" class="px-5 py-1.5">{{ $t('users.username') }}</th>
                <th scope="col" class="px-5 py-1.5">{{ $t('users.displayName') }}</th>
                <th scope="col" class="px-5 py-1.5">{{ $t('users.role') }}</th>
                <th scope="col" class="px-5 py-1.5">{{ $t('users.signInMethod') }}</th>
                <th scope="col" class="px-5 py-1.5">{{ $t('users.management.createdAt') }}</th>
                <th scope="col" class="px-5 py-1.5 text-right">{{ $t('users.management.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="row in userRows" :key="row.id" class="row-hover">
                <th scope="row" class="break-all px-5 py-3 text-left font-medium text-highlighted">{{ row.username }}</th>
                <td class="break-words px-5 py-3 text-toned">{{ row.display_name || '—' }}</td>
                <td class="px-5 py-3">
                  <UBadge :color="row.role === 'admin' ? 'primary' : 'neutral'" variant="subtle">
                    {{ row.role === 'admin' ? $t('users.admin') : $t('users.viewer') }}
                  </UBadge>
                </td>
                <td class="px-5 py-3">
                  <UBadge :color="row.auth_provider === 'oidc' ? 'info' : 'neutral'" variant="subtle">
                    {{ row.auth_provider === 'oidc' ? $t('users.openIdConnect') : $t('users.localAccount') }}
                  </UBadge>
                </td>
                <td class="px-5 py-3 text-toned">{{ formatCreatedAt(row.created_at) }}</td>
                <td class="px-5 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <template v-if="row.auth_provider === 'local'">
                      <UButton
                        icon="i-heroicons-pencil-square"
                        variant="ghost"
                        color="primary"
                        size="xs"
                        :aria-label="$t('users.management.editAccountFor', { username: row.username })"
                        :title="$t('users.management.editAccount')"
                        :disabled="!!pendingMutation"
                        @click="openEditDialog(row)"
                      />
                    </template>
                    <span v-else class="mr-1 text-xs text-muted">{{ $t('users.management.providerManaged') }}</span>
                    <UTooltip :text="row.id === currentUserId ? $t('users.management.cannotDeleteSelf') : $t('users.management.deleteAccount')">
                      <UButton
                        icon="i-heroicons-trash"
                        variant="ghost"
                        color="error"
                        size="xs"
                        :aria-label="row.id === currentUserId ? $t('users.management.cannotDeleteSelf') : $t('users.management.deleteAccountFor', { username: row.username })"
                        :title="row.id === currentUserId ? $t('users.management.cannotDeleteSelf') : $t('users.management.deleteAccount')"
                        :disabled="!!pendingMutation || row.id === currentUserId"
                        @click="openDeleteDialog(row)"
                      />
                    </UTooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>

  <div v-else class="p-6">
    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-shield-alert"
      :title="$t('users.management.accessLostTitle')"
      :description="$t('users.management.accessLostDescription')"
      role="alert"
    />
  </div>

  <UModal
    v-if="isAdmin && authResolved"
    v-model:open="showCreateDialog"
    :title="$t('users.management.createAccount')"
    :dismissible="!pendingMutation"
    :close="!pendingMutation"
  >
    <template #body>
      <UForm ref="createFormRef" :schema="createSchema" :state="createForm" class="space-y-4" @submit="submitCreate">
        <UFormField :label="$t('users.username')" name="username" required>
          <UInput v-model="createForm.username" autocomplete="username" maxlength="50" class="w-full" />
        </UFormField>
        <UFormField :label="$t('users.displayName')" name="display_name" required>
          <UInput v-model="createForm.display_name" maxlength="100" class="w-full" />
        </UFormField>
        <UFormField :label="$t('users.management.password')" name="password" required>
          <UInput v-model="createForm.password" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>
        <UFormField :label="$t('users.role')" name="role" required>
          <USelect v-model="createForm.role" :items="roleOptions" :ui="{ content: 'z-[210]' }" class="w-full" />
        </UFormField>
        <UFormField :label="$t('users.management.language')" name="language" required>
          <USelect v-model="createForm.language" :items="languageOptions" :ui="{ content: 'z-[210]' }" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="!!pendingMutation" @click="() => { showCreateDialog = false }">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton :loading="pendingMutation === 'create'" :disabled="!!pendingMutation" @click="createFormRef?.submit()">
          {{ $t('users.management.createAccount') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-if="isAdmin && authResolved"
    v-model:open="showEditDialog"
    :title="$t('users.management.editAccount')"
    :dismissible="!pendingMutation"
    :close="!pendingMutation"
  >
    <template #body>
      <div v-if="editingUser" class="mb-4 rounded-md bg-elevated px-3 py-2 text-sm">
        <span class="text-muted">{{ $t('users.username') }}:</span>
        <span class="ml-1 break-all font-medium text-highlighted">{{ editingUser.username }}</span>
      </div>
      <UForm ref="editFormRef" :schema="editSchema" :state="editForm" class="space-y-4" @submit="submitEdit">
        <UFormField :label="$t('users.displayName')" name="display_name" required>
          <UInput v-model="editForm.display_name" maxlength="100" class="w-full" />
        </UFormField>
        <UFormField :label="$t('users.role')" name="role" required>
          <USelect v-model="editForm.role" :items="roleOptions" :ui="{ content: 'z-[210]' }" class="w-full" />
        </UFormField>
        <UFormField :label="$t('users.management.language')" name="language" required>
          <USelect v-model="editForm.language" :items="languageOptions" :ui="{ content: 'z-[210]' }" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="!!pendingMutation" @click="() => { showEditDialog = false }">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton :loading="pendingMutation === 'edit'" :disabled="!!pendingMutation || !editingUser" @click="editFormRef?.submit()">
          {{ $t('common.save') }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-if="isAdmin && authResolved"
    v-model:open="showDeleteDialog"
    :title="$t('users.management.deleteTitle')"
    :dismissible="!pendingMutation"
    :close="!pendingMutation"
  >
    <template #title>
      <span class="flex items-center gap-2">
        <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-500" aria-hidden="true" />
        <span class="text-lg font-semibold">{{ $t('users.management.deleteTitle') }}</span>
      </span>
    </template>
    <template #body>
      <div v-if="deleteTarget" class="space-y-3 text-sm">
        <p class="text-muted">
          {{ $t('users.management.deleteIdentity', { displayName: deleteTarget.display_name || deleteTarget.username, username: deleteTarget.username }) }}
        </p>
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-history"
          :description="$t('users.management.historyWarning')"
        />
        <UAlert
          v-if="deleteTarget.auth_provider === 'oidc'"
          color="info"
          variant="subtle"
          icon="i-lucide-shield"
          :description="$t('users.management.oidcDeleteWarning')"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="!!pendingMutation" @click="() => { showDeleteDialog = false }">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton color="error" :loading="pendingMutation === 'delete'" :disabled="!!pendingMutation || !deleteTarget" @click="confirmDelete">
          {{ $t('common.delete') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { User } from '~~/types/user'

definePageMeta({ middleware: 'admin' })

type CreateUserForm = {
  username: string
  display_name: string
  password: string
  role: 'admin' | 'viewer'
  language: 'en' | 'de'
}
type EditUserForm = Pick<CreateUserForm, 'display_name' | 'role' | 'language'>
type UserOverviewRow = Pick<User, 'id' | 'username' | 'display_name' | 'role' | 'auth_provider' | 'language' | 'created_at'>
type MutationKind = 'create' | 'edit' | 'delete'

const { t, locale } = useI18n()
const toast = useToast()
const { user, isAdmin, isAuthLoading, authResolved, fetchUser, handleInfrastructureForbidden } = useAuth()
const { items, loading, fetch: fetchUsers, create, update, remove } = useUsers()
const hasLoaded = ref(false)
const loadError = ref(false)
const accessLost = ref(false)
const pendingMutation = ref<MutationKind | null>(null)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const editingUser = ref<UserOverviewRow | null>(null)
const deleteTarget = ref<UserOverviewRow | null>(null)
const createFormRef = ref<{ submit: () => void }>()
const editFormRef = ref<{ submit: () => void }>()
const roleChangeGeneration = ref(0)
let confirmedAdminState: boolean | null = null
let accessChangeNoticeShown = false

const currentUserId = computed(() => user.value?.id ?? '')
const userRows = computed<UserOverviewRow[]>(() => items.value.map(({ id, username, display_name, role, auth_provider, language, created_at }) => ({
  id,
  username,
  display_name,
  role,
  auth_provider,
  language,
  created_at
})))

const createForm = reactive<CreateUserForm>({
  username: '',
  display_name: '',
  password: '',
  role: 'viewer',
  language: 'en'
})
const editForm = reactive<EditUserForm>({ display_name: '', role: 'viewer', language: 'en' })

const createSchema = computed(() => z.object({
  username: z.string()
    .min(3, t('users.management.validation.usernameLength'))
    .max(50, t('users.management.validation.usernameLength'))
    .regex(/^[a-zA-Z0-9_]+$/, t('users.management.validation.usernameFormat')),
  display_name: z.string().trim()
    .min(1, t('users.management.validation.displayNameLength'))
    .max(100, t('users.management.validation.displayNameLength')),
  password: z.string().min(8, t('users.management.validation.passwordLength')),
  role: z.enum(['admin', 'viewer']),
  language: z.enum(['en', 'de'])
}))
const editSchema = computed(() => z.object({
  display_name: z.string().trim()
    .min(1, t('users.management.validation.displayNameLength'))
    .max(100, t('users.management.validation.displayNameLength')),
  role: z.enum(['admin', 'viewer']),
  language: z.enum(['en', 'de'])
}))

const roleOptions = computed(() => [
  { label: t('users.admin'), value: 'admin' },
  { label: t('users.viewer'), value: 'viewer' }
])
const languageOptions = computed(() => [
  { label: t('users.management.english'), value: 'en' },
  { label: t('users.management.german'), value: 'de' }
])

useHead({ title: t('users.title') })

function resetCreateForm() {
  createForm.username = ''
  createForm.display_name = ''
  createForm.password = ''
  createForm.role = 'viewer'
  createForm.language = locale.value === 'de' ? 'de' : 'en'
}

function resetEditForm() {
  editForm.display_name = ''
  editForm.role = 'viewer'
  editForm.language = locale.value === 'de' ? 'de' : 'en'
  editingUser.value = null
}

function resetDeleteDraft() {
  deleteTarget.value = null
}

watch(showCreateDialog, (open) => { if (!open) resetCreateForm() }, { flush: 'sync' })
watch(showEditDialog, (open) => { if (!open) resetEditForm() }, { flush: 'sync' })
watch(showDeleteDialog, (open) => { if (!open) resetDeleteDraft() }, { flush: 'sync' })

function loseAccess() {
  if (accessLost.value) return
  accessLost.value = true
  roleChangeGeneration.value++
  items.value = []
  showCreateDialog.value = false
  showEditDialog.value = false
  showDeleteDialog.value = false
  resetCreateForm()
  resetEditForm()
  resetDeleteDraft()
}

watch([authResolved, isAdmin], ([resolved, admin]) => {
  if (!resolved) return
  if (confirmedAdminState === null) {
    confirmedAdminState = admin
    if (!admin) accessLost.value = true
    return
  }
  if (confirmedAdminState && !admin) {
    loseAccess()
  } else if (!confirmedAdminState && admin) {
    accessLost.value = false
    accessChangeNoticeShown = false
    hasLoaded.value = false
    void loadUsers()
  }
  confirmedAdminState = admin
}, { flush: 'sync' })

async function consumeInfrastructureForbidden(error: unknown): Promise<boolean> {
  const result = await handleInfrastructureForbidden(error)
  if (result === 'demoted') {
    loseAccess()
    if (!accessChangeNoticeShown) {
      accessChangeNoticeShown = true
      toast.add({ title: t('permissions.accessChanged'), color: 'warning' })
    }
    return true
  }
  if (result === 'already-handled') {
    if (!isAdmin.value) loseAccess()
    return true
  }
  return false
}

function getStatusCode(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const value = error as { statusCode?: unknown; status?: unknown; data?: { statusCode?: unknown } }
  return Number(value.statusCode ?? value.status ?? value.data?.statusCode ?? 0)
}

async function loadUsers() {
  if (!authResolved.value || !isAdmin.value) return
  loadError.value = false
  hasLoaded.value = false
  try {
    await fetchUsers()
  } catch (error: unknown) {
    if (await consumeInfrastructureForbidden(error)) return
    if (isAdmin.value) loadError.value = true
  } finally {
    hasLoaded.value = true
  }
}

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(locale.value)
}

function openCreateDialog() {
  if (!authResolved.value || !isAdmin.value || pendingMutation.value) return
  resetCreateForm()
  showCreateDialog.value = true
}

function openEditDialog(row: UserOverviewRow) {
  if (!authResolved.value || !isAdmin.value || pendingMutation.value || row.auth_provider !== 'local') return
  editingUser.value = row
  editForm.display_name = row.display_name
  editForm.role = row.role
  editForm.language = row.language
  showEditDialog.value = true
}

function openDeleteDialog(row: UserOverviewRow) {
  if (!authResolved.value || !isAdmin.value || pendingMutation.value || row.id === currentUserId.value) return
  deleteTarget.value = row
  showDeleteDialog.value = true
}

function canContinueMutation(generation: number, targetId?: string, kind?: MutationKind): boolean {
  if (!authResolved.value || !isAdmin.value || generation !== roleChangeGeneration.value) return false
  if (kind === 'edit' && editingUser.value?.id !== targetId) return false
  if (kind === 'delete' && deleteTarget.value?.id !== targetId) return false
  return true
}

async function showMutationError(error: unknown, kind: MutationKind, targetId?: string, forbiddenChecked = false) {
  if (!forbiddenChecked && await consumeInfrastructureForbidden(error)) return
  if (!isAdmin.value) {
    loseAccess()
    return
  }
  const status = getStatusCode(error)
  if (status === 400) {
    toast.add({ title: t('users.management.validationRejected'), color: 'error' })
    return
  }
  if (status === 404) {
    if (kind === 'edit' && editingUser.value?.id === targetId) showEditDialog.value = false
    if (kind === 'delete' && deleteTarget.value?.id === targetId) showDeleteDialog.value = false
    toast.add({ title: t('users.management.targetGone'), color: 'warning' })
    if (isAdmin.value) await loadUsers()
    return
  }
  if (status === 409) {
    toast.add({
      title: t(kind === 'create' ? 'users.management.usernameExists' : 'users.management.lastLocalAdmin'),
      color: 'error'
    })
    return
  }
  toast.add({ title: t('errors.serverError'), color: 'error' })
}

async function submitCreate() {
  if (!authResolved.value || !isAdmin.value || pendingMutation.value) return
  const generation = roleChangeGeneration.value
  const payload: CreateUserForm = {
    username: createForm.username,
    display_name: createForm.display_name.trim(),
    password: createForm.password,
    role: createForm.role,
    language: createForm.language
  }
  pendingMutation.value = 'create'
  try {
    await create(payload)
    if (!canContinueMutation(generation)) return
    toast.add({ title: t('users.management.created'), color: 'success' })
    showCreateDialog.value = false
    await loadUsers()
  } catch (error: unknown) {
    if (await consumeInfrastructureForbidden(error)) return
    if (generation !== roleChangeGeneration.value || !isAdmin.value) {
      if (!isAdmin.value) loseAccess()
      return
    }
    await showMutationError(error, 'create', undefined, true)
  } finally {
    pendingMutation.value = null
  }
}

async function submitEdit() {
  const target = editingUser.value
  if (!authResolved.value || !isAdmin.value || pendingMutation.value || !target || target.auth_provider !== 'local') return
  const targetId = target.id
  const generation = roleChangeGeneration.value
  const isSelf = targetId === currentUserId.value
  const changesOwnRole = isSelf && target.role !== editForm.role
  pendingMutation.value = 'edit'
  try {
    await update(targetId, {
      display_name: editForm.display_name.trim(),
      role: editForm.role,
      language: editForm.language
    })
    if (!canContinueMutation(generation, targetId, 'edit')) return
    if (changesOwnRole) {
      await fetchUser()
      if (!canContinueMutation(generation, targetId, 'edit')) {
        if (!isAdmin.value) {
          loseAccess()
          toast.add({ title: t('users.management.roleChanged'), color: 'warning' })
        }
        return
      }
    }
    toast.add({ title: t('users.management.updated'), color: 'success' })
    showEditDialog.value = false
    await loadUsers()
  } catch (error: unknown) {
    if (await consumeInfrastructureForbidden(error)) return
    if (generation !== roleChangeGeneration.value || !isAdmin.value) {
      if (!isAdmin.value) loseAccess()
      return
    }
    await showMutationError(error, 'edit', targetId, true)
  } finally {
    pendingMutation.value = null
  }
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!authResolved.value || !isAdmin.value || pendingMutation.value || !target || target.id === currentUserId.value) return
  const targetId = target.id
  const generation = roleChangeGeneration.value
  pendingMutation.value = 'delete'
  try {
    await remove(targetId)
    if (!canContinueMutation(generation, targetId, 'delete')) return
    toast.add({ title: t('users.management.deleted'), color: 'success' })
    showDeleteDialog.value = false
    await loadUsers()
  } catch (error: unknown) {
    if (await consumeInfrastructureForbidden(error)) return
    if (generation !== roleChangeGeneration.value || !isAdmin.value) {
      if (!isAdmin.value) loseAccess()
      return
    }
    await showMutationError(error, 'delete', targetId, true)
  } finally {
    pendingMutation.value = null
  }
}

onMounted(async () => {
  if (!authResolved.value) await fetchUser()
  if (isAdmin.value) void loadUsers()
  else if (authResolved.value) accessLost.value = true
})

onBeforeUnmount(() => {
  createForm.password = ''
  resetCreateForm()
  resetEditForm()
  resetDeleteDraft()
})
</script>
