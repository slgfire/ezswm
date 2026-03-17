<template>
  <div class="p-6">
    <div class="flex items-center gap-4 mb-6">
      <UButton to="/layout-templates" icon="i-heroicons-arrow-left" color="gray" variant="ghost" />
      <h1 class="text-2xl font-bold">{{ $t('templates.create') }}</h1>
    </div>

    <UCard>
      <form @submit.prevent="handleSubmit">
        <div class="space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormGroup :label="$t('templates.fields.name') + ' *'" required>
              <UInput v-model="form.name" :placeholder="$t('templates.fields.name')" />
            </UFormGroup>
            <UFormGroup :label="$t('templates.fields.manufacturer')">
              <UInput v-model="form.manufacturer" :placeholder="$t('templates.fields.manufacturer')" />
            </UFormGroup>
            <UFormGroup :label="$t('templates.fields.model')">
              <UInput v-model="form.model" :placeholder="$t('templates.fields.model')" />
            </UFormGroup>
            <UFormGroup :label="$t('templates.fields.description')">
              <UInput v-model="form.description" :placeholder="$t('templates.fields.description')" />
            </UFormGroup>
          </div>

          <UDivider />

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
                  color="red"
                  variant="ghost"
                  @click="removeUnit(unitIndex)"
                >
                  {{ $t('templates.units.remove') }}
                </UButton>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <UFormGroup :label="$t('templates.units.unitNumber')">
                  <UInput v-model.number="unit.unit_number" type="number" min="1" />
                </UFormGroup>
                <UFormGroup :label="$t('templates.units.label')">
                  <UInput v-model="unit.label" :placeholder="$t('templates.units.label')" />
                </UFormGroup>
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
                      color="red"
                      variant="ghost"
                      @click="removeBlock(unitIndex, blockIndex)"
                    />
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <UFormGroup :label="$t('templates.blocks.type')">
                      <USelect
                        v-model="block.type"
                        :options="portTypeOptions"
                      />
                    </UFormGroup>
                    <UFormGroup :label="$t('templates.blocks.count')">
                      <UInput v-model.number="block.count" type="number" min="1" />
                    </UFormGroup>
                    <UFormGroup :label="$t('templates.blocks.startIndex')">
                      <UInput v-model.number="block.start_index" type="number" min="1" />
                    </UFormGroup>
                    <UFormGroup :label="$t('templates.blocks.rows')">
                      <UInput v-model.number="block.rows" type="number" min="1" />
                    </UFormGroup>
                    <UFormGroup :label="$t('templates.blocks.label')">
                      <UInput v-model="block.label" :placeholder="$t('templates.blocks.label')" />
                    </UFormGroup>
                  </div>
                </div>

                <div v-if="unit.blocks.length === 0" class="text-center py-4 text-sm text-gray-500">
                  {{ $t('common.noData') }}
                </div>
              </div>
            </div>

            <div v-if="form.units.length === 0" class="text-center py-8 text-gray-500">
              {{ $t('common.noData') }}
            </div>
          </div>

          <UDivider />

          <!-- Form Actions -->
          <div class="flex justify-end gap-3">
            <UButton to="/layout-templates" color="gray" variant="ghost">
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
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const { create } = useLayoutTemplates()

const submitting = ref(false)

const portTypeOptions = [
  { label: 'RJ45', value: 'rj45' },
  { label: 'SFP', value: 'sfp' },
  { label: 'SFP+', value: 'sfp+' },
  { label: 'QSFP', value: 'qsfp' },
  { label: 'Console', value: 'console' },
  { label: 'Management', value: 'management' }
]

const form = reactive({
  name: '',
  manufacturer: '',
  model: '',
  description: '',
  units: [
    {
      unit_number: 1,
      label: 'Unit 1',
      blocks: [
        { type: 'rj45', count: 24, start_index: 1, rows: 2, label: '' }
      ]
    }
  ]
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
    label: ''
  })
}

function removeBlock(unitIndex: number, blockIndex: number) {
  form.units[unitIndex].blocks.splice(blockIndex, 1)
}

async function handleSubmit() {
  if (!form.name.trim()) return

  submitting.value = true
  try {
    const result = await create({
      name: form.name,
      manufacturer: form.manufacturer || undefined,
      model: form.model || undefined,
      description: form.description || undefined,
      units: form.units
    })
    toast.add({ title: t('templates.messages.created'), color: 'green' })
    const id = (result as any).id || (result as any).data?.id
    if (id) {
      router.push(`/layout-templates/${id}`)
    } else {
      router.push('/layout-templates')
    }
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'red' })
  } finally {
    submitting.value = false
  }
}
</script>
