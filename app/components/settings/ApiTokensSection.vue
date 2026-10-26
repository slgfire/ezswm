<template>
  <section class="list-container rounded-xl border border-default bg-default p-4 sm:p-6" aria-labelledby="api-tokens-title">
    <div class="mb-5 flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
        <UIcon name="i-lucide-key-round" class="size-5" aria-hidden="true" />
      </div>
      <div class="min-w-0">
        <h3 id="api-tokens-title" class="text-base font-semibold">{{ $t('settings.account.apiTokens.title') }}</h3>
        <p class="mt-1 text-xs text-muted">{{ $t('settings.account.apiTokens.description') }}</p>
      </div>
    </div>

    <UAlert
      v-if="user"
      class="mb-4"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :description="$t('settings.account.apiTokens.accountRules')"
    />

    <template v-if="user">
      <div
        v-if="issuedToken"
        ref="secretNotice"
        class="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-4"
        role="alert"
        aria-live="assertive"
        tabindex="-1"
      >
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <div class="min-w-0 flex-1 space-y-3">
            <div>
              <p class="font-semibold text-highlighted">{{ $t('settings.account.apiTokens.secretTitle') }}</p>
              <p class="mt-1 text-sm text-toned">{{ $t('settings.account.apiTokens.secretWarning') }}</p>
            </div>
            <code data-testid="api-token-secret" class="block select-all break-all rounded-md bg-default px-3 py-2 font-mono text-xs text-highlighted">{{ issuedToken }}</code>
            <div class="flex flex-wrap gap-2">
              <UButton size="sm" color="warning" variant="subtle" icon="i-lucide-copy" @click="copyIssuedToken">
                {{ $t('settings.account.apiTokens.copy') }}
              </UButton>
              <UButton ref="createButton" size="sm" color="neutral" variant="ghost" @click="dismissIssuedToken">
                {{ $t('settings.account.apiTokens.dismissSecret') }}
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <UAlert
        v-if="actionError"
        class="mb-4"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="actionError"
        role="alert"
      />

      <form class="space-y-3" novalidate @submit.prevent="createToken">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)_auto] sm:items-end">
          <UFormField :label="$t('settings.account.apiTokens.name')" name="api-token-name" required :error="nameError">
            <UInput
              id="api-token-name"
              v-model="tokenName"
              :aria-label="$t('settings.account.apiTokens.name')"
              :aria-invalid="!!nameError"
              maxlength="100"
              autocomplete="off"
              class="w-full"
              :disabled="pendingMutation !== null || !!issuedToken"
              @input="clearFormErrors"
            />
          </UFormField>
          <UFormField :label="$t('settings.account.apiTokens.expiresAt')" name="api-token-expires" :hint="$t('settings.account.apiTokens.expiryHint')" :error="expiryError">
            <UInput
              id="api-token-expires"
              v-model="expiryInput"
              type="datetime-local"
              step="60"
              :aria-label="$t('settings.account.apiTokens.expiresAt')"
              :aria-invalid="!!expiryError"
              class="w-full"
              :disabled="pendingMutation !== null || !!issuedToken"
              @input="clearFormErrors"
            />
          </UFormField>
          <UButton
            type="submit"
            icon="i-lucide-plus"
            :loading="pendingMutation === 'create'"
            :disabled="pendingMutation !== null || !!issuedToken"
            class="w-full justify-center sm:w-auto"
          >
            {{ $t('settings.account.apiTokens.create') }}
          </UButton>
        </div>
      </form>

      <UAlert
        v-if="loadFailed"
        class="mt-4"
        color="warning"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="$t('settings.account.apiTokens.loadFailed')"
        role="alert"
      >
        <template #actions>
          <UButton size="xs" color="neutral" variant="ghost" :loading="loading" @click="void fetchTokens()">
            {{ $t('common.retry') }}
          </UButton>
        </template>
      </UAlert>
      <div v-else-if="loading" class="mt-4 flex items-center gap-3 py-2 text-sm text-muted" role="status" aria-live="polite">
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" aria-hidden="true" />
        {{ $t('common.loading') }}
      </div>
      <div v-else-if="tokens.length === 0" data-testid="api-token-empty" class="mt-4 rounded-lg border border-dashed border-default px-4 py-6 text-center text-sm text-muted">
        {{ $t('settings.account.apiTokens.empty') }}
      </div>
      <template v-else>
        <div class="mt-5 flex flex-col gap-2 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-muted">{{ $t('settings.account.apiTokens.listHint') }}</p>
          <UButton
            size="sm"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            :loading="pendingMutation === 'all'"
            :disabled="pendingMutation !== null"
            class="w-full justify-center sm:w-auto"
            @click="confirmRevokeAll"
          >
            {{ $t('settings.account.apiTokens.revokeAll') }}
          </UButton>
        </div>
        <ul class="mt-2 divide-y divide-default" :aria-label="$t('settings.account.apiTokens.listLabel')">
          <li
            v-for="token in tokens"
            :key="token.id"
            data-testid="api-token-row"
            class="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0 flex-1">
              <p class="break-words text-sm font-medium text-highlighted">{{ token.name }}</p>
              <dl class="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                <div>
                  <dt class="text-muted">{{ $t('settings.account.apiTokens.createdAt') }}</dt>
                  <dd class="mt-0.5 text-toned">{{ formatDate(token.created_at) }}</dd>
                </div>
                <div>
                  <dt class="text-muted">{{ $t('settings.account.apiTokens.lastUsed') }}</dt>
                  <dd class="mt-0.5 text-toned">{{ token.last_used_at ? formatDate(token.last_used_at) : $t('settings.account.apiTokens.neverUsed') }}</dd>
                </div>
                <div>
                  <dt class="text-muted">{{ $t('settings.account.apiTokens.expiresAt') }}</dt>
                  <dd class="mt-0.5 text-toned">{{ token.expires_at ? formatDate(token.expires_at) : $t('settings.account.apiTokens.neverExpires') }}</dd>
                </div>
              </dl>
            </div>
            <UButton
              size="sm"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :aria-label="$t('settings.account.apiTokens.revokeNamed', { name: token.name })"
              :loading="pendingMutation === token.id"
              :disabled="pendingMutation !== null"
              class="w-full justify-center sm:w-auto sm:shrink-0"
              @click="confirmRevoke(token)"
            >
              {{ $t('settings.account.apiTokens.revoke') }}
            </UButton>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { ApiTokenExpiryError } from '../../utils/apiTokens'
import { useApiTokens } from '../../composables/useApiTokens'
import { parseApiTokenExpiry } from '../../utils/apiTokens'

const props = defineProps<{ active: boolean }>()
const { user } = useAuth()
const { t, locale } = useI18n()
const toast = useToast()
const { confirm } = useConfirm()
const { tokens, loading, loadFailed, fetch: fetchTokens, create, revoke, revokeAll, reset } = useApiTokens()

const tokenName = ref('')
const expiryInput = ref('')
const nameError = ref('')
const expiryError = ref('')
const actionError = ref('')
const issuedToken = ref<string | null>(null)
const pendingMutation = ref<string | null>(null)
const secretNotice = ref<HTMLElement | null>(null)
let componentActive = true

function clearFormErrors() {
  nameError.value = ''
  expiryError.value = ''
  actionError.value = ''
}

function clearIssuedToken() {
  issuedToken.value = null
}

function dismissIssuedToken() {
  clearIssuedToken()
  nextTick(() => document.getElementById('api-token-name')?.focus())
}

function formatDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  }).format(date)
}

async function copyIssuedToken() {
  if (!issuedToken.value) return
  try {
    await navigator.clipboard.writeText(issuedToken.value)
    toast.add({ title: t('settings.account.apiTokens.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.account.apiTokens.copyFailed'), color: 'error' })
  }
}

function expiryErrorMessage(error: ApiTokenExpiryError) {
  return t(`settings.account.apiTokens.expiryErrors.${error}`)
}

function errorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null) return 0
  const data = error as { status?: number, statusCode?: number }
  return data.statusCode ?? data.status ?? 0
}

function showActionError(error: unknown) {
  const status = errorStatus(error)
  if (status === 400) actionError.value = t('settings.account.apiTokens.validationRejected')
  else if (status === 409) actionError.value = t('settings.account.apiTokens.conflict')
  else actionError.value = t('settings.account.apiTokens.actionFailed')
}

async function createToken() {
  if (!user.value || pendingMutation.value || issuedToken.value) return
  clearFormErrors()
  const name = tokenName.value.trim()
  if (!name) {
    nameError.value = t('settings.account.apiTokens.nameRequired')
    return
  }
  if (name.length > 100) {
    nameError.value = t('settings.account.apiTokens.nameTooLong')
    return
  }

  const parsedExpiry = parseApiTokenExpiry(expiryInput.value)
  if (parsedExpiry.error) {
    expiryError.value = expiryErrorMessage(parsedExpiry.error)
    return
  }

  pendingMutation.value = 'create'
  try {
    const token = await create({ name, ...(parsedExpiry.expiresAt ? { expires_at: parsedExpiry.expiresAt } : {}) })
    if (!componentActive || !props.active || !user.value) return
    tokenName.value = ''
    expiryInput.value = ''
    issuedToken.value = token
    await nextTick()
    secretNotice.value?.focus()
  } catch (error) {
    if (componentActive) showActionError(error)
  } finally {
    pendingMutation.value = null
  }
}

async function confirmRevoke(token: { id: string, name: string }) {
  if (pendingMutation.value || !user.value) return
  const approved = await confirm({
    title: t('settings.account.apiTokens.revokeTitle'),
    message: t('settings.account.apiTokens.confirmRevoke', { name: token.name }),
    confirmLabel: t('settings.account.apiTokens.revoke')
  })
  if (!approved || !user.value || pendingMutation.value) return
  pendingMutation.value = token.id
  actionError.value = ''
  try {
    await revoke(token.id)
    toast.add({ title: t('settings.account.apiTokens.revoked'), color: 'success' })
  } catch (error) {
    showActionError(error)
  } finally {
    pendingMutation.value = null
  }
}

async function confirmRevokeAll() {
  if (pendingMutation.value || !user.value || !tokens.value.length) return
  const approved = await confirm({
    title: t('settings.account.apiTokens.revokeAllTitle'),
    message: t('settings.account.apiTokens.confirmRevokeAll'),
    confirmLabel: t('settings.account.apiTokens.revokeAll')
  })
  if (!approved || !user.value || pendingMutation.value) return
  pendingMutation.value = 'all'
  actionError.value = ''
  try {
    await revokeAll()
    clearIssuedToken()
    toast.add({ title: t('settings.account.apiTokens.allRevoked'), color: 'success' })
  } catch (error) {
    showActionError(error)
  } finally {
    pendingMutation.value = null
  }
}

watch(() => props.active, (active) => {
  if (!active) clearIssuedToken()
})

watch(user, (currentUser) => {
  if (currentUser) void fetchTokens()
  else {
    reset()
    clearIssuedToken()
  }
})

onMounted(() => {
  if (user.value) void fetchTokens()
})

onBeforeUnmount(() => {
  componentActive = false
  clearIssuedToken()
  reset()
})
</script>
