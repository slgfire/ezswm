<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('backup.title') }}</h1>

    <div class="grid gap-6 md:grid-cols-2">
      <UCard>
        <template #header>
          <h2 class="font-semibold">{{ $t('common.export') }}</h2>
        </template>
        <p class="mb-4 text-sm text-gray-400">{{ $t('backup.exportDescription') }}</p>
        <UButton icon="i-heroicons-arrow-down-tray" @click="downloadBackup">
          {{ $t('backup.export') }}
        </UButton>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">{{ $t('common.import') }}</h2>
        </template>
        <p class="mb-4 text-sm text-gray-400">{{ $t('backup.importDescription') }}</p>
        <div class="space-y-4">
          <UFormGroup :label="$t('backup.selectFile')">
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              class="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                dark:file:bg-primary-900 dark:file:text-primary-300"
              @change="onFileSelect"
            />
          </UFormGroup>
          <UButton
            icon="i-heroicons-arrow-up-tray"
            :disabled="!selectedFile"
            @click="showRestoreDialog = true"
          >
            {{ $t('backup.restore') }}
          </UButton>
        </div>
      </UCard>
    </div>

    <SharedConfirmDialog
      v-model="showRestoreDialog"
      :title="$t('backup.import')"
      :message="$t('backup.confirmRestore')"
      @confirm="restoreBackup"
    />
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const showRestoreDialog = ref(false)

function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0] || null
}

async function downloadBackup() {
  try {
    const response = await $fetch('/api/backup/export', { responseType: 'blob' })
    const url = URL.createObjectURL(response as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ezswm-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.add({ title: t('backup.messages.exported'), color: 'green' })
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'red' })
  }
}

async function restoreBackup() {
  if (!selectedFile.value) return
  try {
    const text = await selectedFile.value.text()
    const backup = JSON.parse(text)
    await $fetch('/api/backup/import', { method: 'POST', body: backup })
    toast.add({ title: t('backup.messages.imported'), color: 'green' })
    selectedFile.value = null
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    showRestoreDialog.value = false
  }
}
</script>
