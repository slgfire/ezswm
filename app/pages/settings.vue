<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('settings.title') }}</h1>

    <UTabs :items="tabs">
      <template #general>
        <div class="mt-4">
          <UCard>
            <form @submit.prevent="saveGeneral">
              <div class="space-y-4">
                <UFormField :label="$t('settings.general.appName')">
                  <UInput v-model="generalForm.app_name" :placeholder="$t('settings.general.appName')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('settings.general.defaultPortStatus')">
                  <USelect
                    v-model="generalForm.default_port_status"
                    :items="portStatusOptions"
                    class="w-full"
                  />
                </UFormField>
                <UFormField :label="$t('settings.general.paginationSize')">
                  <UInput v-model.number="generalForm.pagination_size" type="number" min="5" max="100" class="w-full" />
                </UFormField>
                <div class="flex justify-end">
                  <UButton type="submit" :loading="savingGeneral">{{ $t('common.save') }}</UButton>
                </div>
              </div>
            </form>
          </UCard>
        </div>
      </template>

      <template #account>
        <div class="mt-4 space-y-6">
          <UCard>
            <template #header>
              <h3 class="font-semibold">{{ $t('settings.account.title') }}</h3>
            </template>
            <form @submit.prevent="saveAccount">
              <div class="space-y-4">
                <UFormField :label="$t('settings.account.displayName')">
                  <UInput v-model="accountForm.display_name" :placeholder="$t('settings.account.displayName')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('settings.account.language')">
                  <USelect v-model="accountForm.language" :items="languageOptions" class="w-full" />
                </UFormField>
                <div class="flex justify-end">
                  <UButton type="submit" :loading="savingProfile">
                    {{ $t('settings.account.saveProfile') }}
                  </UButton>
                </div>
              </div>
            </form>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="font-semibold">{{ $t('settings.account.changePassword') }}</h3>
            </template>
            <UForm :state="passwordForm" :validate="validatePassword" :validate-on="['blur', 'submit']" novalidate @submit="handleChangePassword">
              <div class="space-y-4">
                <UFormField :label="$t('settings.account.currentPassword')" name="current_password">
                  <UInput v-model="passwordForm.current_password" type="password" class="w-full" />
                </UFormField>
                <UFormField :label="$t('settings.account.newPassword')" name="new_password">
                  <UInput v-model="passwordForm.new_password" type="password" class="w-full" />
                </UFormField>
                <UFormField :label="$t('settings.account.confirmNewPassword')" name="confirm_password">
                  <UInput v-model="passwordForm.confirm_password" type="password" class="w-full" />
                </UFormField>
                <div class="flex justify-end">
                  <UButton type="submit" :loading="savingPassword">
                    {{ $t('settings.account.savePassword') }}
                  </UButton>
                </div>
              </div>
            </UForm>
          </UCard>
        </div>
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
const { t, setLocale } = useI18n()
useHead({ title: t('settings.title') })
const { user } = useAuth()
const { settings, fetch: fetchSettings, update: updateSettings } = useSettings()
const { update: updateUser, changePassword: changePasswordApi } = useUsers()

const savingGeneral = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)

const tabs = computed(() => [
  { label: t('common.general'), slot: 'general' as const },
  { label: t('common.account'), slot: 'account' as const }
])

const portStatusOptions = [
  { label: 'Up', value: 'up' },
  { label: 'Down', value: 'down' },
  { label: 'Disabled', value: 'disabled' }
]

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Deutsch', value: 'de' }
]

const generalForm = reactive({
  app_name: '',
  default_port_status: 'down',
  pagination_size: 25
})

const accountForm = reactive({
  display_name: '',
  language: 'en'
})

const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

async function saveGeneral() {
  savingGeneral.value = true
  try {
    await updateSettings({
      app_name: generalForm.app_name,
      default_port_status: generalForm.default_port_status,
      pagination_size: generalForm.pagination_size
    })
    toast.add({ title: t('settings.messages.updated'), color: 'success' })
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    savingGeneral.value = false
  }
}

async function saveAccount() {
  if (!user.value) return
  savingProfile.value = true
  try {
    await updateUser(user.value.id, {
      display_name: accountForm.display_name,
      language: accountForm.language
    })
    await setLocale(accountForm.language)
    user.value = { ...user.value!, language: accountForm.language }
    toast.add({ title: t('settings.messages.profileUpdated'), color: 'success' })
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    savingProfile.value = false
  }
}

function validatePassword(state: typeof passwordForm) {
  const errors: { name: string; message: string }[] = []
  if (!state.current_password) {
    errors.push({ name: 'current_password', message: 'Current password is required' })
  }
  if (!state.new_password || state.new_password.length < 8) {
    errors.push({ name: 'new_password', message: 'New password must be at least 8 characters' })
  }
  if (state.new_password !== state.confirm_password) {
    errors.push({ name: 'confirm_password', message: 'Passwords do not match' })
  }
  return errors
}

async function handleChangePassword() {
  if (!user.value) return

  savingPassword.value = true
  try {
    await changePasswordApi(user.value.id, {
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password
    })
    toast.add({ title: t('settings.messages.passwordChanged'), color: 'success' })
    passwordForm.current_password = ''
    passwordForm.new_password = ''
    passwordForm.confirm_password = ''
  } catch (e: any) {
    toast.add({ title: e.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    savingPassword.value = false
  }
}

onMounted(async () => {
  await fetchSettings()
  if (settings.value) {
    generalForm.app_name = settings.value.app_name || 'ezSWM'
    generalForm.default_port_status = settings.value.default_port_status || 'down'
    generalForm.pagination_size = settings.value.pagination_size || 25
  }
  if (user.value) {
    accountForm.display_name = user.value.display_name || ''
    accountForm.language = user.value.language || 'en'
  }
})
</script>
