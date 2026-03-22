<template>
  <div>
    <NuxtLayout name="auth">
      <UCard class="w-full">
        <template #header>
          <div class="text-center">
            <h1 class="font-display text-2xl font-bold">{{ $t('auth.loginTitle') }}</h1>
            <p class="mt-1 text-sm text-gray-400">{{ $t('auth.loginDescription') }}</p>
          </div>
        </template>

        <UForm :state="form" @submit.prevent="onSubmit">
          <div class="space-y-4">
            <UFormField :label="$t('auth.username')" name="username" required>
              <UInput v-model="form.username" />
            </UFormField>

            <UFormField :label="$t('auth.password')" name="password" required>
              <UInput v-model="form.password" type="password" />
            </UFormField>

            <div class="flex items-center">
              <UCheckbox v-model="form.remember_me" :label="$t('auth.rememberMe')" />
            </div>

            <UButton type="submit" block :loading="loading">
              {{ $t('auth.login') }}
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

const { login } = useAuth()
const router = useRouter()

const loading = ref(false)
const error = ref('')

const form = reactive({
  username: '',
  password: '',
  remember_me: false
})

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await login(form.username, form.password, form.remember_me)
    await router.push('/')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
