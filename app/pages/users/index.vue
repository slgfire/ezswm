<template>
  <div v-if="isAdmin" class="p-6">
    <div class="mb-4">
      <h1 class="text-xl font-bold">{{ $t('users.title') }}</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ $t('users.description') }}</p>
    </div>

    <section aria-labelledby="users-list-title">
      <h2 id="users-list-title" class="sr-only">{{ $t('users.listTitle') }}</h2>

      <div v-if="loading || !hasLoaded" class="flex justify-center py-12" role="status" aria-live="polite">
        <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" aria-hidden="true" />
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
        <UButton color="neutral" variant="outline" icon="i-heroicons-arrow-path" @click="loadUsers">
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
          <table class="w-full min-w-[36rem] table-fixed divide-y divide-default text-left text-sm">
            <caption class="sr-only">{{ $t('users.tableCaption') }}</caption>
            <colgroup>
              <col class="w-1/4">
              <col class="w-1/4">
              <col class="w-1/4">
              <col class="w-1/4">
            </colgroup>
            <thead class="border-b border-default text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" class="px-5 py-1.5">{{ $t('users.username') }}</th>
                <th scope="col" class="px-5 py-1.5">{{ $t('users.displayName') }}</th>
                <th scope="col" class="px-5 py-1.5">{{ $t('users.role') }}</th>
                <th scope="col" class="px-5 py-1.5">{{ $t('users.signInMethod') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="row in userRows" :key="row.username" class="row-hover">
                <th scope="row" class="break-all px-5 py-3 text-left font-medium text-gray-900 dark:text-white">{{ row.username }}</th>
                <td class="break-words px-5 py-3 text-gray-600 dark:text-gray-300">{{ row.display_name || '—' }}</td>
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
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~~/types/user'

definePageMeta({ middleware: 'admin' })

const { t } = useI18n()
const { user } = useAuth()
const isAdmin = computed(() => user.value?.role === 'admin')
const { items, loading, fetch: fetchUsers } = useUsers()
const hasLoaded = ref(false)
const loadError = ref(false)

type UserOverviewRow = Pick<User, 'username' | 'display_name' | 'role' | 'auth_provider'>
const userRows = computed<UserOverviewRow[]>(() => items.value.map(({ username, display_name, role, auth_provider }) => ({
  username,
  display_name,
  role,
  auth_provider
})))

useHead({ title: t('users.title') })

async function loadUsers() {
  loadError.value = false
  hasLoaded.value = false
  try {
    await fetchUsers()
  } catch {
    loadError.value = true
  } finally {
    hasLoaded.value = true
  }
}

onMounted(() => {
  if (isAdmin.value) void loadUsers()
})
</script>
