<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('dataManagement.title') }}</h1>

    <UTabs :items="tabs" variant="link" color="neutral">
      <template #backup>
        <div class="mt-4 grid gap-6 md:grid-cols-2">
          <!-- Create Backup -->
          <div class="list-container rounded-lg bg-default p-5">
            <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{{ $t('backup.createTitle') }}</h2>
            <p class="mb-4 text-sm text-gray-500">{{ $t('backup.exportDescription') }}</p>
            <UButton size="sm" icon="i-heroicons-arrow-down-tray" @click="downloadBackup">
              {{ $t('backup.export') }}
            </UButton>
          </div>

          <!-- Restore Backup -->
          <div class="list-container rounded-lg bg-default p-5">
            <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{{ $t('backup.restoreTitle') }}</h2>
            <p class="mb-4 text-sm text-gray-500">{{ $t('backup.importDescription') }}</p>
            <div class="space-y-4">
              <div
                class="cursor-pointer rounded-lg border-2 border-dashed border-default p-6 text-center transition-colors hover:border-primary-500/50"
                :class="{ 'border-primary-500 bg-primary-500/10': isBackupDragOver }"
                @click="($refs.backupFileInput as HTMLInputElement)?.click()"
                @dragover.prevent="isBackupDragOver = true"
                @dragleave="isBackupDragOver = false"
                @drop.prevent="onBackupFileDrop"
              >
                <UIcon name="i-heroicons-cloud-arrow-up" class="mx-auto mb-2 h-8 w-8 text-gray-500" />
                <p class="text-sm text-gray-400">
                  <span v-if="backupFile" class="text-primary-400">{{ (backupFile as File).name }}</span>
                  <span v-else>{{ $t('backup.selectFile') }} (.json)</span>
                </p>
                <input
                  ref="backupFileInput"
                  type="file"
                  accept=".json"
                  class="hidden"
                  @change="onBackupFileSelect"
                >
              </div>
              <UButton
                size="sm"
                icon="i-heroicons-arrow-up-tray"
                :disabled="!backupFile"
                @click="showRestoreDialog = true"
              >
                {{ $t('backup.restore') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <template #export>
        <div class="mt-4 max-w-lg">
          <p class="mb-4 text-sm text-gray-500">{{ $t('dataManagement.export.description') }}</p>
          <div class="space-y-4">
            <UFormField :label="$t('dataManagement.export.selectType')">
              <USelectMenu
                v-model="exportType"
                :search-input="false"
                :items="entityTypeOptions"
                value-key="value"
                size="sm"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('dataManagement.export.selectFormat')">
              <USelectMenu
                v-model="exportFormat"
                :search-input="false"
                :items="formatOptions"
                value-key="value"
                size="sm"
                class="w-full"
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
        </div>
      </template>

      <template #import>
        <div class="mt-4 max-w-lg">
          <p class="mb-4 text-sm text-gray-500">{{ $t('dataManagement.import.description') }}</p>
          <div class="space-y-4">
            <!-- Step 1: Entity Type -->
            <UFormField :label="$t('dataManagement.import.selectType')">
              <USelectMenu
                v-model="importType"
                :search-input="false"
                :items="entityTypeOptions"
                value-key="value"
                :placeholder="$t('dataManagement.import.selectTypePlaceholder')"
                size="sm"
                class="w-full"
              />
            </UFormField>

            <!-- Step 2: Template (optional) -->
            <div class="flex items-center gap-3">
              <UButton
                size="sm"
                variant="outline"
                icon="i-heroicons-document-arrow-down"
                :disabled="!importType"
                @click="downloadTemplate"
              >
                {{ $t('dataManagement.import.downloadTemplate') }}
              </UButton>
              <span class="text-xs text-gray-500">{{ $t('dataManagement.import.templateHint') }}</span>
            </div>

            <!-- Step 3: File Upload -->
            <div
              class="cursor-pointer rounded-lg border-2 border-dashed border-default p-5 text-center transition-colors hover:border-primary-500/50"
              :class="{ 'border-primary-500 bg-primary-500/10': isDragOver }"
              @click="($refs.importFileInput as HTMLInputElement)?.click()"
              @dragover.prevent="isDragOver = true"
              @dragleave="isDragOver = false"
              @drop.prevent="onImportFileDrop"
            >
              <UIcon name="i-heroicons-cloud-arrow-up" class="mx-auto mb-1 h-7 w-7 text-gray-500" />
              <p class="text-sm text-gray-400">
                <span v-if="importFile" class="text-primary-400">{{ (importFile as File).name }}</span>
                <span v-else>{{ $t('dataManagement.import.dropOrSelect') }}</span>
              </p>
              <p v-if="!importFile" class="mt-1 text-xs text-gray-500">JSON, CSV — max. 5 MB</p>
              <input
                ref="importFileInput"
                type="file"
                accept=".json,.csv"
                class="hidden"
                @change="onImportFileSelect"
              >
            </div>

            <!-- Preview -->
            <div v-if="importPreview !== null" class="rounded-md bg-elevated p-3">
              <p class="text-sm text-gray-600 dark:text-gray-300">
                {{ $t('dataManagement.import.preview') }}: <strong>{{ importPreview }}</strong> {{ $t('dataManagement.import.rows') }}
              </p>
            </div>

            <!-- Step 4: Import -->
            <UButton
              size="sm"
              icon="i-heroicons-arrow-up-tray"
              :disabled="!importFile || !importType || importPreview === null"
              @click="showImportDialog = true"
            >
              {{ $t('dataManagement.import.importButton') }}
            </UButton>

            <!-- Results -->
            <div v-if="importResults" class="flex flex-wrap items-center gap-2">
              <UBadge color="success" variant="subtle">
                {{ importResults.imported }} {{ $t('dataManagement.import.imported') }}
              </UBadge>
              <UBadge v-if="importResults.skipped > 0" color="warning" variant="subtle">
                {{ importResults.skipped }} {{ $t('dataManagement.import.skipped') }}
              </UBadge>
              <UBadge v-if="importResults.errors.length > 0" color="error" variant="subtle">
                {{ importResults.errors.length }} {{ $t('dataManagement.import.errorCount') }}
              </UBadge>
            </div>

            <!-- Skipped details -->
            <div v-if="importResults && importResults.skippedDetails?.length > 0" class="space-y-1">
              <p v-for="(msg, idx) in importResults.skippedDetails" :key="'s'+idx" class="text-xs text-yellow-500">
                {{ msg }}
              </p>
            </div>

            <!-- Error details -->
            <div v-if="importResults && importResults.errors.length > 0" class="space-y-1">
              <p v-for="(err, idx) in importResults.errors" :key="'e'+idx" class="text-xs text-red-500">
                {{ err }}
              </p>
            </div>
          </div>
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
useHead({ title: t('dataManagement.title') })

const MAX_IMPORT_SIZE = 5 * 1024 * 1024 // 5MB

const tabs = computed(() => [
  { label: t('dataManagement.backupRestoreTab'), slot: 'backup' as const },
  { label: t('dataManagement.exportTab'), slot: 'export' as const },
  { label: t('dataManagement.importTab'), slot: 'import' as const }
])

const entityTypeOptions = computed(() => [
  { value: 'switches', label: t('dataManagement.entities.switches') },
  { value: 'vlans', label: t('dataManagement.entities.vlans') },
  { value: 'networks', label: t('dataManagement.entities.networks') },
  { value: 'allocations', label: t('dataManagement.entities.allocations') },
  { value: 'ranges', label: t('dataManagement.entities.ranges') },
  { value: 'templates', label: t('dataManagement.entities.templates') }
])

const formatOptions = computed(() => [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' }
])

const backupFile = ref<File | null>(null)
const showRestoreDialog = ref(false)
const isBackupDragOver = ref(false)

function onBackupFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  backupFile.value = target.files?.[0] || null
}

function onBackupFileDrop(event: DragEvent) {
  isBackupDragOver.value = false
  const file = event.dataTransfer?.files?.[0] || null
  if (file) backupFile.value = file
}

async function downloadBackup() {
  try {
    const response = await $fetch('/api/backup/export', { responseType: 'blob' })
    downloadBlob(response as unknown as Blob, `ezswm-backup-${new Date().toISOString().slice(0, 10)}.json`)
    toast.add({ title: t('backup.messages.exported'), color: 'success' })
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'error' })
  }
}

async function restoreBackup() {
  if (!backupFile.value) return
  try {
    const text = await backupFile.value.text()
    const backup = JSON.parse(text)
    await $fetch('/api/backup/import', { method: 'POST', body: backup })
    toast.add({ title: t('backup.messages.imported'), color: 'success' })
    backupFile.value = null
  } catch (err: unknown) {
    const message = (err as { data?: { message?: string } })?.data?.message
    toast.add({ title: message || t('errors.serverError'), color: 'error' })
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
    downloadBlob(response as unknown as Blob, `ezswm-${exportType.value}-${timestamp}.${ext}`)
    toast.add({ title: t('dataManagement.export.success'), color: 'success' })
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    exportLoading.value = false
  }
}

const importType = ref('')
const importFile = ref<File | null>(null)
const importPreview = ref<number | null>(null)
const importParsedData = ref<Record<string, unknown>[] | null>(null)
const showImportDialog = ref(false)
const importResults = ref<{ imported: number; skipped: number; skippedDetails: string[]; errors: string[] } | null>(null)
const isDragOver = ref(false)

function parseCsv(text: string): Record<string, unknown>[] {
  const stripped = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  const lines = stripped.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0]!.split(',').map(h => h.trim())
  const rows: Record<string, unknown>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]!)
    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = values[j] ?? ''
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
    toast.add({ title: t('dataManagement.import.fileTooLarge'), color: 'error' })
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
    toast.add({ title: t('dataManagement.import.parseError'), color: 'error' })
  }
}

function onImportFileDrop(event: DragEvent) {
  isDragOver.value = false
  const file = event.dataTransfer?.files?.[0] || null
  if (!file) return
  // Reuse the same logic as file input selection
  const fakeEvent = { target: { files: [file] } } as unknown as Event
  onImportFileSelect(fakeEvent)
}

async function downloadTemplate() {
  if (!importType.value) return
  try {
    const response = await $fetch(`/api/data/template`, {
      params: { type: importType.value },
      responseType: 'blob'
    })
    downloadBlob(response as unknown as Blob, `ezswm-${importType.value}-template.csv`)
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'error' })
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
    importResults.value = result as { imported: number; skipped: number; skippedDetails: string[]; errors: string[] }

    if (importResults.value.imported > 0) {
      toast.add({ title: t('dataManagement.import.success', { count: importResults.value.imported }), color: 'success' })
    }
    if (importResults.value.errors.length > 0) {
      toast.add({ title: t('dataManagement.import.hasErrors', { count: importResults.value.errors.length }), color: 'warning' })
    }
  } catch (err: unknown) {
    const message = (err as { data?: { message?: string } })?.data?.message
    toast.add({ title: message || t('errors.serverError'), color: 'error' })
  }
}
</script>
