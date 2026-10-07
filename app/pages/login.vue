<template>
  <div>
    <NuxtLayout name="auth">
      <UCard class="w-full">
        <template #header>
          <div class="text-center">
            <h1 class="font-display text-2xl font-bold tracking-tight">{{ $t('auth.loginTitle') }}</h1>
            <p class="mt-1 text-sm text-muted">{{ $t('auth.loginDescription') }}</p>
          </div>
        </template>

        <div class="space-y-5">
          <UAlert
            v-if="oidcErrorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :description="oidcErrorMessage"
            role="alert"
          />

          <UForm :state="form" :validate="validate" :validate-on="['blur', 'change']" novalidate @submit.prevent="onSubmit">
            <div class="space-y-4">
              <UFormField :label="$t('auth.username')" name="username" required>
                <UInput v-model="form.username" autocomplete="username" class="w-full" />
              </UFormField>

              <UFormField :label="$t('auth.password')" name="password" required>
                <UInput v-model="form.password" type="password" autocomplete="current-password" class="w-full" />
              </UFormField>

              <div class="flex items-center">
                <UCheckbox v-model="form.remember_me" :label="$t('auth.rememberMe')" />
              </div>

              <UButton type="submit" block :loading="loading" icon="i-lucide-log-in">
                {{ $t('auth.login') }}
              </UButton>
            </div>
          </UForm>

          <div v-if="error" class="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-300" role="alert">
            {{ error }}
          </div>

          <div v-if="oidcEnabled" class="-mt-2 text-center text-xs text-muted">
            {{ $t('auth.oidc.localHint') }}
          </div>

          <div v-if="oidcEnabled" class="relative flex items-center" aria-hidden="true">
            <div class="h-px flex-1 bg-accented" />
            <span class="px-3 text-xs font-medium uppercase tracking-wider text-muted">{{ $t('auth.oidc.orSso') }}</span>
            <div class="h-px flex-1 bg-accented" />
          </div>

          <a
            v-if="oidcEnabled"
            href="/api/auth/oidc/start"
            class="group flex min-h-12 w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-inverted bg-primary shadow-sm transition duration-200 hover:bg-primary/75 hover:shadow-md focus-visible:outline-3 focus-visible:outline-primary/25 active:bg-primary/75 active:translate-y-px"
          >
            <UIcon name="i-lucide-shield-check" class="size-5 transition-transform duration-200 group-hover:scale-110" />
            <span class="min-w-0 flex-1 break-words text-center [overflow-wrap:anywhere]">
              {{ oidcProviderName ? $t('auth.oidc.signInWith', { provider: oidcProviderName }) : $t('auth.oidc.signIn') }}
            </span>
            <UIcon name="i-lucide-arrow-up-right" class="ml-auto size-4 opacity-70" />
          </a>
        </div>
      </UCard>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import type { OidcErrorCode } from '../../types/oidc'

definePageMeta({ layout: false })
const { t } = useI18n()
useHead({ title: t('auth.loginTitle') })

const { login } = useAuth()
const { getStatus } = useOidc()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const oidcEnabled = ref(false)
const oidcProviderName = ref('')
const knownOidcErrors: OidcErrorCode[] = [
  'oidc_not_configured',
  'oidc_invalid_request',
  'oidc_transaction_invalid',
  'oidc_provider_error',
  'oidc_token_invalid',
  'oidc_access_denied',
  'oidc_unavailable'
]
const oidcErrorMessage = computed(() => {
  const queryValue = router.currentRoute.value.query.oidc_error
  const code = Array.isArray(queryValue) ? queryValue[0] : queryValue
  if (!code || !knownOidcErrors.includes(code as OidcErrorCode)) return ''
  return t(`auth.oidc.errors.${code}`)
})

const form = reactive({
  username: '',
  password: '',
  remember_me: false
})

function validate(state: typeof form) {
  const errors: { name: string; message: string }[] = []
  if (!state.username || state.username.length < 3) {
    errors.push({ name: 'username', message: t('auth.validation.usernameMin') })
  }
  if (!state.password) {
    errors.push({ name: 'password', message: t('auth.validation.passwordRequired') })
  }
  return errors
}

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await login(form.username, form.password, form.remember_me)
    await router.push('/')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || t('auth.loginFailed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const status = await getStatus()
    oidcEnabled.value = status.enabled === true
    oidcProviderName.value = typeof status.provider_name === 'string' ? status.provider_name.trim() : ''
  } catch {
    oidcEnabled.value = false
    oidcProviderName.value = ''
  }
})
</script>
