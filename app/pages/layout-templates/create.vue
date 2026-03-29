<template>
  <div class="p-6">
    <div class="flex items-center gap-4 mb-6">
      <UButton to="/layout-templates" icon="i-heroicons-arrow-left" color="neutral" variant="ghost" />
      <h1 class="text-2xl font-bold">{{ $t('templates.create') }}</h1>
    </div>


<div v-if="activeTab === 'import'">
      <UCard>
        <TemplateLibraryImport @import="handleLibraryImport" />
      </UCard>
    </div>

    <div v-if="activeTab === 'manual'">
      <UCard>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-6">
            <!-- Basic Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField :label="$t('templates.fields.name') + ' *'" name="name" :error="errors.name" required>
                <UInput v-model="form.name" :placeholder="$t('templates.fields.name')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('templates.fields.manufacturer')">
                <UInput v-model="form.manufacturer" :placeholder="$t('templates.fields.manufacturer')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('templates.fields.model')">
                <UInput v-model="form.model" :placeholder="$t('templates.fields.model')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('templates.fields.description')">
                <UInput v-model="form.description" :placeholder="$t('templates.fields.description')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('templates.datasheetUrl')">
                <UInput v-model="form.datasheet_url" placeholder="https://..." class="w-full" />
              </UFormField>
              <UFormField :label="$t('templates.airflow')">
                <USelect
                  v-model="form.airflow"
                  :items="airflowOptions"
                  placeholder="—"
                  class="w-full"
                />
              </UFormField>
            </div>

            <USeparator />

            <!-- Units Section -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold">{{ $t('templates.units.title') }}</h2>
                <UButton icon="i-heroicons-plus" size="sm" @click="addUnit">
                  {{ $t('templates.units.add') }}
                </UButton>
              </div>

              <div v-for="(unit, unitIndex) in form.units" :key="unitIndex" class="mb-6 border border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-medium">{{ $t('templates.units.unitNumber') }}: {{ unit.unit_number }}</h3>
                  <UButton
                    v-if="form.units.length > 1"
                    icon="i-heroicons-trash"
                    size="xs"
                    color="error"
                    variant="ghost"
                    @click="removeUnit(unitIndex)"
                  >
                    {{ $t('templates.units.remove') }}
                  </UButton>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <UFormField :label="$t('templates.units.unitNumber')">
                    <UInput v-model.number="unit.unit_number" type="number" min="1" class="w-full" />
                  </UFormField>
                  <UFormField :label="$t('templates.units.label')">
                    <UInput v-model="unit.label" :placeholder="$t('templates.units.label')" class="w-full" />
                  </UFormField>
                </div>

                <!-- Blocks Section -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-medium text-gray-400">{{ $t('templates.blocks.title') }}</h4>
                    <UButton icon="i-heroicons-plus" size="xs" variant="soft" @click="addBlock(unitIndex)">
                      {{ $t('templates.blocks.add') }}
                    </UButton>
                  </div>

                  <div
                    v-for="(block, blockIndex) in unit.blocks"
                    :key="blockIndex"
                    class="mb-3 border border-gray-600 rounded-md p-3"
                  >
                    <div class="flex items-start justify-between mb-3">
                      <span class="text-sm text-gray-400">{{ $t('templates.blocks.title') }} #{{ blockIndex + 1 }}</span>
                      <UButton
                        icon="i-heroicons-x-mark"
                        size="xs"
                        color="error"
                        variant="ghost"
                        @click="removeBlock(unitIndex, blockIndex)"
                      />
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <UFormField :label="$t('templates.blocks.type')" :name="`units[${unitIndex}].blocks[${blockIndex}].type`" :error="errors[`units[${unitIndex}].blocks[${blockIndex}].type`]">
                        <USelect v-model="block.type" :items="portTypeOptions" class="w-full" />
                      </UFormField>
                      <UFormField :label="$t('templates.blocks.count')" :name="`units[${unitIndex}].blocks[${blockIndex}].count`" :error="errors[`units[${unitIndex}].blocks[${blockIndex}].count`]">
                        <UInput v-model.number="block.count" type="number" min="1" class="w-full" />
                      </UFormField>
                      <UFormField :label="$t('templates.blocks.startIndex')">
                        <UInput v-model.number="block.start_index" type="number" min="0" class="w-full" />
                      </UFormField>
                      <UFormField :label="$t('templates.blocks.label')">
                        <UInput v-model="block.label" :placeholder="$t('templates.blocks.label')" class="w-full" />
                      </UFormField>
                      <UFormField :label="$t('templates.blocks.rows')">
                        <UInput v-model.number="block.rows" type="number" min="1" class="w-full" />
                      </UFormField>
                      <UFormField :label="$t('templates.blocks.rowLayout')">
                        <USelect v-model="block.row_layout" :items="rowLayoutOptions" :disabled="block.rows < 2" class="w-full" />
                      </UFormField>
                      <UFormField :label="$t('templates.blocks.defaultSpeed')">
                        <USelect v-model="block.default_speed" :items="speedOptions" placeholder="-- None --" class="w-full" />
                      </UFormField>
                      <UFormField :label="$t('templates.poe')">
                        <USelect
                          v-model="block.poe_selection"
                          :items="poeOptions"
                          :placeholder="$t('templates.poeNone')"
                          class="w-full"
                        />
                      </UFormField>
                      <UFormField v-if="block.type === 'management'" :label="$t('templates.physicalType')">
                        <USelect
                          v-model="block.physical_type"
                          :items="physicalTypeOptions"
                          class="w-full"
                        />
                      </UFormField>
                    </div>
                  </div>

                  <div v-if="unit.blocks.length === 0" class="text-center py-4 text-sm text-gray-500">
                    {{ $t('common.noData') }}
                  </div>
                  <p v-if="errors[`units[${unitIndex}].blocks`]" class="mt-1 text-sm text-red-500">{{ errors[`units[${unitIndex}].blocks`] }}</p>
                </div>
              </div>

              <div v-if="form.units.length === 0" class="text-center py-8 text-gray-500">
                {{ $t('common.noData') }}
              </div>
              <p v-if="errors.units" class="mt-1 text-sm text-red-500">{{ errors.units }}</p>
            </div>

            <!-- Live Preview -->
            <USeparator />
            <div>
              <h2 class="mb-3 text-lg font-semibold">{{ $t('templates.preview') }}</h2>
              <div v-if="previewPorts.length" class="rounded-lg border border-default bg-elevated p-4">
                <SwitchPortGrid
                  :ports="previewPorts"
                  :units="form.units"
                  :selected-ports="[]"
                />
              </div>
              <p v-else class="text-sm text-gray-400">{{ $t('templates.previewEmpty') }}</p>
            </div>

            <USeparator />

            <!-- Form Actions -->
            <div class="flex justify-end gap-3">
              <UButton to="/layout-templates" color="neutral" variant="ghost">
                {{ $t('common.cancel') }}
              </UButton>
              <UButton type="submit" :loading="submitting">
                {{ $t('common.create') }}
              </UButton>
            </div>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
useHead({ title: t('templates.create') })
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { create, getById } = useLayoutTemplates()

const submitting = ref(false)
const errors = ref<Record<string, string>>({})
const cloneId = route.query.clone as string | undefined

const activeTab = ref((route.query.mode as string) === 'import' ? 'import' : 'manual')

const portTypeOptions = [
  { label: 'RJ45', value: 'rj45' },
  { label: 'SFP', value: 'sfp' },
  { label: 'SFP+', value: 'sfp+' },
  { label: 'QSFP', value: 'qsfp' },
  { label: 'Console', value: 'console' },
  { label: 'Management', value: 'management' }
]

const rowLayoutOptions = computed(() => [
  { label: t('templates.rowLayout.sequential'), value: 'sequential' },
  { label: t('templates.rowLayout.oddEven'), value: 'odd-even' },
  { label: t('templates.rowLayout.evenOdd'), value: 'even-odd' }
])

const speedOptions = [
  { label: '100M', value: '100M' },
  { label: '1G', value: '1G' },
  { label: '2.5G', value: '2.5G' },
  { label: '10G', value: '10G' },
  { label: '100G', value: '100G' }
]

const airflowOptions = [
  { label: t('airflowOptions.front-to-rear'), value: 'front-to-rear' },
  { label: t('airflowOptions.rear-to-front'), value: 'rear-to-front' },
  { label: t('airflowOptions.left-to-right'), value: 'left-to-right' },
  { label: t('airflowOptions.right-to-left'), value: 'right-to-left' },
  { label: t('airflowOptions.passive'), value: 'passive' },
  { label: t('airflowOptions.mixed'), value: 'mixed' },
]

const poeOptions = [
  { label: '802.3af (15.4W)', value: '802.3af' },
  { label: '802.3at (30W)', value: '802.3at' },
  { label: '802.3bt Type 3 (60W)', value: '802.3bt-type3' },
  { label: '802.3bt Type 4 (100W)', value: '802.3bt-type4' },
  { label: 'Passive 24V', value: 'passive-24v' },
  { label: 'Passive 48V', value: 'passive-48v' },
]

const POE_WATTS: Record<string, number> = {
  '802.3af': 15.4, '802.3at': 30, '802.3bt-type3': 60,
  '802.3bt-type4': 100, 'passive-24v': 24, 'passive-48v': 48,
}

const physicalTypeOptions = [
  { label: 'RJ45', value: 'rj45' },
  { label: 'SFP', value: 'sfp' },
]

const form = reactive({
  name: '',
  manufacturer: '',
  model: '',
  description: '',
  datasheet_url: '',
  airflow: '',
  units: [
    {
      unit_number: 1,
      label: 'Unit 1',
      blocks: [
        { type: 'rj45', count: 24, start_index: 1, rows: 2, row_layout: 'sequential', default_speed: '', label: '', poe_selection: '', physical_type: '' }
      ]
    }
  ]
})

const previewPorts = computed(() => {
  const ports: any[] = []
  for (const unit of form.units) {
    for (let bi = 0; bi < unit.blocks.length; bi++) {
      const block = unit.blocks[bi]
      for (let i = 0; i < block.count; i++) {
        const portIndex = block.start_index + i
        const label = block.label
          ? (block.label.match(/[\/\-:.]$/) ? `${block.label}${portIndex}` : `${block.label} ${unit.unit_number}/${portIndex}`)
          : `${unit.unit_number}/${portIndex}`
        ports.push({
          id: `p-${unit.unit_number}-b${bi}-${portIndex}`,
          unit: unit.unit_number,
          index: portIndex,
          label,
          type: block.type,
          status: 'down',
          tagged_vlans: []
        })
      }
    }
  }
  return ports
})

function addUnit() {
  const nextNumber = form.units.length > 0
    ? Math.max(...form.units.map(u => u.unit_number)) + 1
    : 1
  form.units.push({
    unit_number: nextNumber,
    label: `Unit ${nextNumber}`,
    blocks: []
  })
}

function removeUnit(index: number) {
  form.units.splice(index, 1)
}

function addBlock(unitIndex: number) {
  const unit = form.units[unitIndex]
  const lastBlock = unit.blocks[unit.blocks.length - 1]
  const nextStartIndex = lastBlock
    ? lastBlock.start_index + lastBlock.count
    : 1
  unit.blocks.push({
    type: 'rj45',
    count: 1,
    start_index: nextStartIndex,
    rows: 1,
    row_layout: 'sequential',
    default_speed: '',
    label: '',
    poe_selection: '',
    physical_type: '',
  })
}

function removeBlock(unitIndex: number, blockIndex: number) {
  form.units[unitIndex].blocks.splice(blockIndex, 1)
}

function validate(): boolean {
  errors.value = {}
  if (!form.name.trim()) {
    errors.value.name = 'Name is required'
  }
  if (form.units.length === 0) {
    errors.value.units = 'At least one unit is required'
  }
  form.units.forEach((unit, ui) => {
    if (unit.blocks.length === 0) {
      errors.value[`units[${ui}].blocks`] = 'Each unit must have at least one block'
    }
    unit.blocks.forEach((block, bi) => {
      if (!block.count || block.count < 1) {
        errors.value[`units[${ui}].blocks[${bi}].count`] = 'Count must be greater than 0'
      }
      if (!block.type) {
        errors.value[`units[${ui}].blocks[${bi}].type`] = 'Type is required'
      }
    })
  })
  return Object.keys(errors.value).length === 0
}

function handleLibraryImport(template: any) {
  form.name = template.name ?? ''
  form.manufacturer = template.manufacturer ?? ''
  form.model = template.model ?? ''
  form.description = ''
  form.datasheet_url = template.datasheet_url ?? ''
  form.airflow = template.airflow ?? ''
  form.units = (template.units ?? []).map((u: any) => ({
    unit_number: u.unit_number,
    label: u.label || '',
    blocks: (u.blocks || []).map((b: any) => ({
      type: b.type,
      count: b.count,
      start_index: b.start_index,
      rows: b.rows,
      row_layout: b.row_layout || 'sequential',
      default_speed: b.default_speed || '',
      label: b.label || '',
      poe_selection: b.poe?.type || '',
      physical_type: b.physical_type || '',
    }))
  }))
  activeTab.value = 'manual'
}

async function handleSubmit() {
  if (!validate()) return

  submitting.value = true
  try {
    const result = await create({
      name: form.name,
      manufacturer: form.manufacturer || undefined,
      model: form.model || undefined,
      description: form.description || undefined,
      datasheet_url: form.datasheet_url || undefined,
      airflow: form.airflow || undefined,
      units: form.units.map(u => ({
        unit_number: u.unit_number,
        label: u.label || undefined,
        blocks: u.blocks.map(b => ({
          type: b.type,
          count: b.count,
          start_index: b.start_index,
          rows: b.rows,
          row_layout: b.row_layout || undefined,
          default_speed: b.default_speed || undefined,
          label: b.label || undefined,
          poe: b.poe_selection ? { type: b.poe_selection, max_watts: POE_WATTS[b.poe_selection] || 0 } : undefined,
          physical_type: b.type === 'management' && b.physical_type ? b.physical_type : undefined,
        }))
      }))
    })
    toast.add({ title: t('templates.messages.created'), color: 'success' })
    const id = (result as any).id || (result as any).data?.id
    if (id) {
      router.push(`/layout-templates/${id}`)
    } else {
      router.push('/layout-templates')
    }
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (cloneId) {
    try {
      const data = await getById(cloneId)
      form.name = `${data.name} (Copy)`
      form.manufacturer = data.manufacturer || ''
      form.model = data.model || ''
      form.description = data.description || ''
      form.datasheet_url = data.datasheet_url || ''
      form.airflow = data.airflow || ''
      form.units = (data.units || []).map((u: any) => ({
        unit_number: u.unit_number,
        label: u.label || '',
        blocks: (u.blocks || []).map((b: any) => ({
          type: b.type,
          count: b.count,
          start_index: b.start_index,
          rows: b.rows,
          row_layout: b.row_layout || 'sequential',
          default_speed: b.default_speed || '',
          label: b.label || '',
          poe_selection: b.poe?.type || '',
          physical_type: b.physical_type || '',
        }))
      }))
    } catch { /* ignore, use defaults */ }
  }
})
</script>
