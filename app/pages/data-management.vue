<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('dataManagement.title') }}</h1>

    <UTabs :items="tabs">
      <template #item="{ item }">
        <!-- Backup Tab -->
        <div v-if="item.key === 'backup'" class="mt-4">
          <div class="grid gap-6 md:grid-cols-2">
            <UCard>
              <template #header>
                <h2 class="font-semibold">{{ $t('common.export') }}</h2>
              </template>
              <p class="mb-4 text-sm text-gray-400">{{ $t('backup.exportDescription') }}</p>
              <UButton size="sm" icon="i-heroicons-arrow-down-tray" @click="downloadBackup">
                {{ $t('backup.export') }}
              </UButton>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="font-semibold">{{ $t('common.import') }}</h2>
              </template>
              <p class="mb-4 text-sm text-gray-400">{{ $t('backup.importDescription') }}</p>
              <div class="space-y-4">
                <UFormField :label="$t('backup.selectFile')">
                  <input
                    ref="backupFileInput"
                    type="file"
                    accept=".json"
                    class="block w-full text-sm text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100
                      dark:file:bg-primary-900 dark:file:text-primary-300"
                    @change="onBackupFileSelect"
                  />
                </UFormField>
                <UButton
                  size="sm"
                  icon="i-heroicons-arrow-up-tray"
                  :disabled="!backupFile"
                  @click="showRestoreDialog = true"
                >
                  {{ $t('backup.restore') }}
                </UButton>
              </div>
            </UCard>
          </div>
        </div>

        <!-- Export Tab -->
        <div v-else-if="item.key === 'export'" class="mt-4">
          <UCard>
            <div class="space-y-4 max-w-lg">
              <UFormField :label="$t('dataManagement.export.selectType')">
                <USelectMenu :search-input="false"
                  v-model="exportType"
                  :items="entityTypeOptions"
                  value-attribute="value"
                  option-attribute="label"
                  size="sm"
                />
              </UFormField>

              <UFormField :label="$t('dataManagement.export.selectFormat')">
                <USelectMenu :search-input="false"
                  v-model="exportFormat"
                  :items="formatOptions"
                  value-attribute="value"
                  option-attribute="label"
                  size="sm"
                />
              </UFormField>

              <UButton
                size="sm"
                icon="i-heroicons-arrow-down-tray"
                :disabled="!exportType"
                :loading="exportLoading"
                @click="downloadExport"
              >
                {{ $t('dataManagement.export.download') }}
              </UButton>
            </div>
          </UCard>
        </div>

        <!-- Import Tab -->
        <div v-else-if="item.key === 'import'" class="mt-4">
          <UCard>
            <div class="space-y-4 max-w-lg">
              <UFormField :label="$t('dataManagement.export.selectType')">
                <USelectMenu :search-input="false"
                  v-model="importType"
                  :items="entityTypeOptions"
                  value-attribute="value"
                  option-attribute="label"
                  size="sm"
                />
              </UFormField>

              <div>
                <UButton
                  size="sm"
                  variant="outline"
                  icon="i-heroicons-document-arrow-down"
                  :disabled="!importType"
                  @click="downloadTemplate"
                >
                  {{ $t('dataManagement.export.downloadTemplate') }}
                </UButton>
              </div>

              <UFormField :label="$t('dataManagement.import.selectFile')">
                <input
                  ref="importFileInput"
                  type="file"
                  accept=".json,.csv"
                  class="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100
                    dark:file:bg-primary-900 dark:file:text-primary-300"
                  @change="onImportFileSelect"
                />
              </UFormField>

              <!-- Preview -->
              <div v-if="importPreview !== null" class="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  {{ $t('dataManagement.import.preview') }}: <strong>{{ importPreview }}</strong> {{ $t('dataManagement.import.rows') }}
                </p>
              </div>

              <UButton
                size="sm"
                icon="i-heroicons-arrow-up-tray"
                :disabled="!importFile || !importType || importPreview === null"
                @click="showImportDialog = true"
              >
                {{ $t('dataManagement.import.importButton') }}
              </UButton>

              <!-- Results -->
              <div v-if="importResults" class="flex flex-wrap items-center gap-2 pt-2">
                <UBadge color="green" variant="subtle">
                  {{ importResults.imported }} {{ $t('dataManagement.import.imported') }}
                </UBadge>
                <UBadge v-if="importResults.skipped > 0" color="yellow" variant="subtle">
                  {{ importResults.skipped }} {{ $t('dataManagement.import.skipped') }}
                </UBadge>
                <UBadge v-if="importResults.errors.length > 0" color="red" variant="subtle">
                  {{ importResults.errors.length }} {{ $t('dataManagement.import.errorCount') }}
                </UBadge>
              </div>

              <!-- Error details -->
              <div v-if="importResults && importResults.errors.length > 0" class="space-y-1">
                <p v-for="(err, idx) in importResults.errors" :key="idx" class="text-xs text-red-500">
                  {{ err }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </template>
    </UTabs>

    <!-- Restore Backup Confirm Dialog -->
    <SharedConfirmDialog
      v-model="showRestoreDialog"
      :title="$t('backup.import')"
      :message="$t('backup.confirmRestore')"
      @confirm="restoreBackup"
    />

    <!-- Import Confirm Dialog -->
    <SharedConfirmDialog
      v-model="showImportDialog"
      :title="$t('dataManagement.import.confirmTitle')"
      :message="$t('dataManagement.import.confirmMessage', { count: importPreview ?? 0, type: importType })"
      @confirm="executeImport"
    />
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
const { t } = useI18n()

const MAX_IMPORT_SIZE = 5 * 1024 * 1024 // 5MB

const tabs = computed(() => [
  { key: 'backup', label: t('dataManagement.backupTab') },
  { key: 'export', label: t('dataManagement.exportTab') },
  { key: 'import', label: t('dataManagement.importTab') }
])

const entityTypeOptions = computed(() => [
  { value: 'switches', label: t('dataManagement.entities.switches') },
  { value: 'vlans', label: t('dataManagement.entities.vlans') },
  { value: 'networks', label: t('dataManagement.entities.networks') },
  { value: 'allocations', label: t('dataManagement.entities.allocations') },
  { value: 'templates', label: t('dataManagement.entities.templates') }
])

const formatOptions = computed(() => [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' }
])

const backupFile = ref<File | null>(null)
const showRestoreDialog = ref(false)

function onBackupFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  backupFile.value = target.files?.[0] || null
}

async function downloadBackup() {
  try {
    const response = await $fetch('/api/backup/export', { responseType: 'blob' })
    downloadBlob(response as Blob, `ezswm-backup-${new Date().toISOString().slice(0, 10)}.json`)
    toast.add({ title: t('backup.messages.exported'), color: 'green' })
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'red' })
  }
}

async function restoreBackup() {
  if (!backupFile.value) return
  try {
    const text = await backupFile.value.text()
    const backup = JSON.parse(text)
    await $fetch('/api/backup/import', { method: 'POST', body: backup })
    toast.add({ title: t('backup.messages.imported'), color: 'green' })
    backupFile.value = null
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    showRestoreDialog.value = false
  }
}

const exportType = ref('switches')
const exportFormat = ref('json')
const exportLoading = ref(false)

async function downloadExport() {
  if (!exportType.value) return
  exportLoading.value = true
  try {
    const response = await $fetch(`/api/data/export`, {
      params: { type: exportType.value, format: exportFormat.value },
      responseType: 'blob'
    })
    const ext = exportFormat.value === 'csv' ? 'csv' : 'json'
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadBlob(response as Blob, `ezswm-${exportType.value}-${timestamp}.${ext}`)
    toast.add({ title: t('dataManagement.export.success'), color: 'green' })
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'red' })
  } finally {
    exportLoading.value = false
  }
}

const importType = ref('switches')
const importFile = ref<File | null>(null)
const importPreview = ref<number | null>(null)
const importParsedData = ref<Record<string, unknown>[] | null>(null)
const showImportDialog = ref(false)
const importResults = ref<{ imported: number; skipped: number; errors: string[] } | null>(null)

function parseCsv(text: string): Record<string, unknown>[] {
  const stripped = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  const lines = stripped.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const rows: Record<string, unknown>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }
    rows.push(row)
  }
  return rows
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        values.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  values.push(current)
  return values
}

async function onImportFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] || null
  importFile.value = file
  importResults.value = null
  importPreview.value = null
  importParsedData.value = null

  if (!file) return

  if (file.size > MAX_IMPORT_SIZE) {
    toast.add({ title: t('dataManagement.import.fileTooLarge'), color: 'red' })
    importFile.value = null
    return
  }

  try {
    const text = await file.text()
    let data: Record<string, unknown>[]

    if (file.name.endsWith('.csv')) {
      data = parseCsv(text)
    } else {
      const parsed = JSON.parse(text)
      data = Array.isArray(parsed) ? parsed : [parsed]
    }

    importParsedData.value = data
    importPreview.value = data.length
  } catch {
    toast.add({ title: t('dataManagement.import.parseError'), color: 'red' })
  }
}

async function downloadTemplate() {
  if (!importType.value) return
  try {
    const response = await $fetch(`/api/data/template`, {
      params: { type: importType.value },
      responseType: 'blob'
    })
    downloadBlob(response as Blob, `ezswm-${importType.value}-template.csv`)
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'red' })
  }
}

async function executeImport() {
  showImportDialog.value = false
  if (!importType.value || !importParsedData.value) return

  try {
    const result = await $fetch('/api/data/import', {
      method: 'POST',
      body: {
        type: importType.value,
        data: importParsedData.value
      }
    })
    importResults.value = result as { imported: number; skipped: number; errors: string[] }

    if (importResults.value.imported > 0) {
      toast.add({ title: t('dataManagement.import.success', { count: importResults.value.imported }), color: 'green' })
    }
    if (importResults.value.errors.length > 0) {
      toast.add({ title: t('dataManagement.import.hasErrors', { count: importResults.value.errors.length }), color: 'yellow' })
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  }
}
</script>
