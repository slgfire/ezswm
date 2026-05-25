<template>
  <div>
    <NuxtLayout name="auth">
      <UCard class="w-full">
        <template #header>
          <div class="text-center">
            <h1 class="text-2xl font-bold">
              {{ currentStep === 1 ? $t('auth.setupTitle') : $t('setup.siteTitle') }}
            </h1>
            <p class="mt-1 text-sm text-gray-400">
              {{ currentStep === 1 ? $t('auth.setupDescription') : $t('setup.siteDescription') }}
            </p>
            <p class="mt-2 text-xs uppercase tracking-wide text-gray-500">
              {{ $t('setup.stepIndicator', { current: currentStep, total: 2 }) }} ·
              {{ currentStep === 1 ? $t('setup.stepAccount') : $t('setup.stepSite') }}
            </p>
          </div>
        </template>

        <!-- Step 1: Admin account -->
        <UForm
          v-if="currentStep === 1"
          :state="accountForm"
          :validate="validateAccount"
          :validate-on="['blur', 'change']"
          novalidate
          @submit.prevent="onSubmitAccount"
        >
          <div class="space-y-4">
            <UFormField :label="$t('auth.username')" name="username" required>
              <UInput v-model="accountForm.username" class="w-full" />
            </UFormField>

            <UFormField :label="$t('auth.displayName')" name="display_name" required>
              <UInput v-model="accountForm.display_name" class="w-full" />
            </UFormField>

            <UFormField :label="$t('auth.password')" name="password" required>
              <UInput v-model="accountForm.password" type="password" class="w-full" />
            </UFormField>

            <UFormField :label="$t('auth.confirmPassword')" name="confirm_password" required>
              <UInput v-model="accountForm.confirm_password" type="password" class="w-full" />
            </UFormField>

            <UFormField :label="$t('auth.language')" name="language">
              <USelect v-model="accountForm.language" :items="languageOptions" class="w-full" />
            </UFormField>

            <UButton type="submit" block :loading="loading">
              {{ $t('auth.setup') }}
            </UButton>
          </div>
        </UForm>

        <!-- Step 2: First site -->
        <div v-else>
          <UAlert
            v-if="orphanTotal > 0"
            color="info"
            variant="subtle"
            class="mb-4"
            :description="$t('setup.migrationBanner', {
              switches: setupOrphans?.switches ?? 0,
              vlans: setupOrphans?.vlans ?? 0,
              networks: setupOrphans?.networks ?? 0
            })"
          />

          <UForm
            :state="siteForm"
            :validate="validateSite"
            :validate-on="['blur', 'change']"
            novalidate
            @submit.prevent="onSubmitSite"
          >
            <div class="space-y-4">
              <UFormField :label="$t('setup.siteName')" name="name" required>
                <UInput
                  v-model="siteForm.name"
                  :placeholder="$t('setup.siteNamePlaceholder')"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="$t('setup.siteDescriptionField')" name="description">
                <UTextarea
                  v-model="siteForm.description"
                  :placeholder="$t('setup.siteDescriptionPlaceholder')"
                  :rows="2"
                  class="w-full"
                />
              </UFormField>

              <UButton type="submit" block :loading="loading">
                {{ $t('setup.createSite') }}
              </UButton>
            </div>
          </UForm>
        </div>

        <div v-if="error" class="mt-4 text-sm text-red-500">
          {{ error }}
        </div>
      </UCard>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Setup' })

const { setup: doSetup, createInitialSite, checkSetup, setupCompleted, sitesInitialized, setupOrphans } = useAuth()
const { setLocale } = useI18n()
const router = useRouter()

const loading = ref(false)
const error = ref('')

// Make sure we have current setup status (middleware seeds it, but a hard
// refresh on /setup mid-flow shouldn't reset us).
if (setupCompleted.value === null || sitesInitialized.value === null) {
  await checkSetup()
}

// Step 1 = admin account, Step 2 = first site. We only ever advance — once
// step 1 is submitted, setupCompleted flips true and we render step 2.
const currentStep = computed(() => (setupCompleted.value ? 2 : 1))

const orphanTotal = computed(() => {
  const o = setupOrphans.value
  return o ? o.switches + o.vlans + o.networks : 0
})

const accountForm = reactive({
  username: '',
  display_name: '',
  password: '',
  confirm_password: '',
  language: 'en'
})

const siteForm = reactive({
  name: '',
  description: ''
})

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Deutsch', value: 'de' }
]

function validateAccount(state: typeof accountForm) {
  const errors: { name: string; message: string }[] = []
  if (!state.username || state.username.length < 3) {
    errors.push({ name: 'username', message: 'Username must be at least 3 characters' })
  }
  if (!state.display_name) {
    errors.push({ name: 'display_name', message: 'Display name is required' })
  }
  if (!state.password || state.password.length < 8) {
    errors.push({ name: 'password', message: 'Password must be at least 8 characters' })
  }
  if (state.password !== state.confirm_password) {
    errors.push({ name: 'confirm_password', message: 'Passwords do not match' })
  }
  return errors
}

function validateSite(state: typeof siteForm) {
  const errors: { name: string; message: string }[] = []
  const trimmed = state.name.trim()
  if (!trimmed) {
    errors.push({ name: 'name', message: 'Site name is required' })
  } else if (trimmed.length > 100) {
    errors.push({ name: 'name', message: 'Site name must be 100 characters or fewer' })
  }
  if (state.description && state.description.length > 500) {
    errors.push({ name: 'description', message: 'Description must be 500 characters or fewer' })
  }
  return errors
}

async function onSubmitAccount() {
  loading.value = true
  error.value = ''
  try {
    await doSetup({
      username: accountForm.username,
      display_name: accountForm.display_name,
      password: accountForm.password,
      language: accountForm.language
    })
    await setLocale(accountForm.language as 'en' | 'de')
    // setupCompleted now true → template flips to Step 2 automatically.
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Setup failed'
  } finally {
    loading.value = false
  }
}

async function onSubmitSite() {
  loading.value = true
  error.value = ''
  try {
    await createInitialSite({
      name: siteForm.name.trim(),
      description: siteForm.description.trim() || undefined
    })
    await router.push('/')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Failed to create site'
  } finally {
    loading.value = false
  }
}
</script>
