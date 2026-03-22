<template>
  <div>
    <NuxtLayout name="auth">
      <UCard class="w-full">
        <template #header>
          <div class="text-center">
            <h1 class="text-2xl font-bold">{{ $t('auth.setupTitle') }}</h1>
            <p class="mt-1 text-sm text-gray-400">{{ $t('auth.setupDescription') }}</p>
          </div>
        </template>

        <UForm :state="form" :validate="validate" @submit.prevent="onSubmit">
          <div class="space-y-4">
            <UFormField :label="$t('auth.username')" name="username" required>
              <UInput v-model="form.username" />
            </UFormField>

            <UFormField :label="$t('auth.displayName')" name="display_name" required>
              <UInput v-model="form.display_name" />
            </UFormField>

            <UFormField :label="$t('auth.password')" name="password" required>
              <UInput v-model="form.password" type="password" />
            </UFormField>

            <UFormField :label="$t('auth.confirmPassword')" name="confirm_password" required>
              <UInput v-model="form.confirm_password" type="password" />
            </UFormField>

            <UFormField :label="$t('auth.language')" name="language">
              <USelect v-model="form.language" :items="languageOptions" />
            </UFormField>

            <UButton type="submit" block :loading="loading">
              {{ $t('auth.setup') }}
            </UButton>
          </div>
        </UForm>

        <div v-if="error" class="mt-4 text-sm text-red-500">
          {{ error }}
        </div>
      </UCard>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { setup: doSetup } = useAuth()
const { setLocale } = useI18n()
const router = useRouter()

const loading = ref(false)
const error = ref('')

const form = reactive({
  username: '',
  display_name: '',
  password: '',
  confirm_password: '',
  language: 'en'
})

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Deutsch', value: 'de' }
]

function validate(state: typeof form) {
  const errors: { path: string; message: string }[] = []
  if (!state.username || state.username.length < 3) {
    errors.push({ path: 'username', message: 'Username must be at least 3 characters' })
  }
  if (!state.display_name) {
    errors.push({ path: 'display_name', message: 'Display name is required' })
  }
  if (!state.password || state.password.length < 8) {
    errors.push({ path: 'password', message: 'Password must be at least 8 characters' })
  }
  if (state.password !== state.confirm_password) {
    errors.push({ path: 'confirm_password', message: 'Passwords do not match' })
  }
  return errors
}

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await doSetup({
      username: form.username,
      display_name: form.display_name,
      password: form.password,
      language: form.language
    })
    await setLocale(form.language)
    await router.push('/')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Setup failed'
  } finally {
    loading.value = false
  }
}
</script>
