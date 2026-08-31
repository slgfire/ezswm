import type { Switch } from '~~/types/switch'
import type { LayoutTemplate } from '~~/types/layoutTemplate'

type WarningPort = { id: string; unit: number; index: number; type: string; label?: string | null }

const clearableOptionalTextFields = new Set([
  'model',
  'manufacturer',
  'serial_number',
  'location',
  'rack_position',
  'management_ip',
  'firmware_version',
  'notes'
])

export function buildSwitchEditSaveBody(editForm: {
  layout_template_id: string
  stack_size: number
  tags: string[]
  [key: string]: unknown
}, expectedUpdatedAt?: string): Record<string, unknown> {
  const body: Record<string, unknown> = { ...editForm, tags: [...editForm.tags] }
  for (const key of Object.keys(body)) {
    if (body[key] === '' && key !== 'layout_template_id') {
      if (clearableOptionalTextFields.has(key)) body[key] = null
      else delete body[key]
    }
    // Empty `tags` array means "remove all" — must reach the API. Other empty
    // arrays (configured_vlans etc.) are managed via dedicated endpoints.
    if (Array.isArray(body[key]) && (body[key] as unknown[]).length === 0 && key !== 'tags') delete body[key]
  }
  if (body.layout_template_id === '') delete body.layout_template_id
  body.stack_size = editForm.stack_size || 1
  if (expectedUpdatedAt) body.expected_updated_at = expectedUpdatedAt
  return body
}

export function resolveEffectiveTemplateId(currentTemplateId?: string | null, requestedTemplateId?: string | null): string {
  return requestedTemplateId || currentTemplateId || ''
}

export function computeTemplateWarningRemovedPorts(input: {
  currentTemplateId?: string | null
  nextTemplateId?: string | null
  currentStackSize?: number | null
  nextStackSize?: number | null
  currentPorts: WarningPort[]
  templates: LayoutTemplate[]
}): { removed: { id: string; label: string }[]; removesAll: boolean } {
  const currentTemplateId = input.currentTemplateId || ''
  const requestedTemplateId = input.nextTemplateId || ''
  // Mirrors buildSaveBody(): blank template gets stripped, so server keeps current.
  const effectiveTemplateId = resolveEffectiveTemplateId(currentTemplateId, requestedTemplateId)
  const currentStackSize = input.currentStackSize ?? 1
  const nextStackSize = input.nextStackSize ?? 1
  const templateChanged = effectiveTemplateId !== currentTemplateId
  const stackChanged = nextStackSize !== currentStackSize

  if (!templateChanged && !stackChanged) return { removed: [], removesAll: false }
  if (!effectiveTemplateId) return { removed: [], removesAll: false }
  if (stackChanged) {
    return {
      removed: input.currentPorts.map(p => ({ id: p.id, label: p.label || `${p.unit}/${p.index}` })),
      removesAll: input.currentPorts.length > 0
    }
  }

  const tpl = input.templates.find(tpl => tpl.id === effectiveTemplateId)
  if (!tpl) return { removed: [], removesAll: false }

  const keys = new Set<string>()
  const baseCount = tpl.units.length
  for (let member = 1; member <= currentStackSize; member++) {
    const offset = (member - 1) * baseCount
    for (const unit of tpl.units) {
      for (const block of unit.blocks) {
        for (let i = 0; i < block.count; i++) {
          keys.add(`${unit.unit_number + offset}:${block.start_index + i}:${block.type}`)
        }
      }
    }
  }

  const removed = input.currentPorts
    .filter(p => !keys.has(`${p.unit}:${p.index}:${p.type}`))
    .map(p => ({ id: p.id, label: p.label || `${p.unit}/${p.index}` }))

  return { removed, removesAll: false }
}

export function useSwitchEditForm(
  item: Ref<Switch | null>,
  templates: Ref<LayoutTemplate[]>,
  updateFn: (body: Record<string, unknown>) => Promise<unknown>,
  refreshFn?: () => Promise<void>
) {
  const { t } = useI18n()
  const toast = useToast()

  const editMode = ref(false)
  const saving = ref(false)
  const editFormRef = ref<{ submit: () => void } | null>(null)
  const editTagInput = ref('')

  const editForm = reactive({
    name: '', model: '', manufacturer: '', serial_number: '',
    location: '', rack_position: '', management_ip: '', firmware_version: '',
    layout_template_id: '', role: '', tags: [] as string[], notes: '', stack_size: 1
  })

  const stackSizeOptions = Array.from({ length: 8 }, (_, i) => ({
    label: String(i + 1), value: i + 1
  }))

  const editRoleOptions = computed(() => [
    { label: t('switches.roles.core'), value: 'core' },
    { label: t('switches.roles.distribution'), value: 'distribution' },
    { label: t('switches.roles.access'), value: 'access' },
    { label: t('switches.roles.management'), value: 'management' }
  ])

  const templateOptions = computed(() => {
    const options = [{ label: '---', value: '' }]
    for (const tpl of templates.value) {
      options.push({ label: tpl.name, value: tpl.id })
    }
    return options
  })

  // Guarded close: confirm before discarding unsaved edits. The slideover binds
  // :open (one-way) + @update:open to this, so it stays open until confirmed.
  const {
    isDirty: isEditDirty, takeSnapshot, requestClose: requestCloseEdit, onOpenChange
  } = useSlideoverGuard(editForm, () => { editMode.value = false })

  function onEditOpenChange(val: boolean) {
    if (val) editMode.value = true
    else onOpenChange(false)
  }

  function openEditPanel() {
    if (!item.value) return
    editForm.name = item.value.name || ''
    editForm.model = item.value.model || ''
    editForm.manufacturer = item.value.manufacturer || ''
    editForm.serial_number = item.value.serial_number || ''
    editForm.location = item.value.location || ''
    editForm.rack_position = item.value.rack_position || ''
    editForm.management_ip = item.value.management_ip || ''
    editForm.firmware_version = item.value.firmware_version || ''
    editForm.layout_template_id = item.value.layout_template_id || ''
    editForm.role = item.value.role || ''
    editForm.tags = [...(item.value.tags || [])]
    editForm.notes = item.value.notes || ''
    editForm.stack_size = item.value.stack_size ?? 1
    editTagInput.value = ''
    editMode.value = true
    takeSnapshot()
  }

  function validateEdit(state: typeof editForm) {
    const errors: { name: string; message: string }[] = []
    if (!state.name?.trim()) {
      errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
    }
    if (state.management_ip?.trim() && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(state.management_ip.trim())) {
      errors.push({ name: 'management_ip', message: t('networks.validation.managementIpFormat') })
    }
    return errors
  }

  const showTemplateConfirm = ref(false)
  const removedPorts = ref<{ id: string; label: string }[]>([])
  const pendingTemplateName = ref('')
  const removesAllPorts = ref(false)
  // True when the destructive save is a stack-size-only regeneration — the
  // dialog copy must not blame a template change in that case.
  const pendingStackOnlyChange = ref(false)
  let pendingSaveBody: Record<string, unknown> | null = null

  // Returns current ports the save would delete under the repository's update()
  // behavior, or [] for a non-destructive save.
  function computeRemovedPorts(): { removed: { id: string; label: string }[]; removesAll: boolean } {
    const sw = item.value
    if (!sw) return { removed: [], removesAll: false }
    return computeTemplateWarningRemovedPorts({
      currentTemplateId: sw.layout_template_id,
      nextTemplateId: editForm.layout_template_id,
      currentStackSize: sw.stack_size,
      nextStackSize: editForm.stack_size,
      currentPorts: sw.ports || [],
      templates: templates.value
    })
  }

  function buildSaveBody(): Record<string, unknown> {
    return buildSwitchEditSaveBody(editForm, item.value?.updated_at)
  }

  async function onSave() {
    const body = buildSaveBody()
    const { removed, removesAll } = computeRemovedPorts()
    if (removed.length > 0) {
      pendingSaveBody = body
      removedPorts.value = removed
      removesAllPorts.value = removesAll
      const currentTemplateId = item.value?.layout_template_id || ''
      const effectiveTemplateId = resolveEffectiveTemplateId(currentTemplateId, editForm.layout_template_id)
      pendingStackOnlyChange.value = effectiveTemplateId === currentTemplateId
      pendingTemplateName.value =
        templates.value.find((tpl) => tpl.id === (editForm.layout_template_id || item.value?.layout_template_id))?.name || ''
      showTemplateConfirm.value = true
      return
    }
    await executeSave(body)
  }

  async function confirmTemplateChange() {
    if (!pendingSaveBody) return
    await executeSave(pendingSaveBody)
  }

  async function executeSave(body: Record<string, unknown>) {
    saving.value = true
    try {
      await updateFn(body)
      toast.add({ title: t('switches.messages.updated'), color: 'success' })
      showTemplateConfirm.value = false
      pendingSaveBody = null
      editMode.value = false
    } catch (e: unknown) {
      const err = e as { statusCode?: number; statusMessage?: string; data?: { message?: string } }
      if (err.statusCode === 409) {
        showTemplateConfirm.value = false
        pendingSaveBody = null
        toast.add({ title: 'Switch was modified. Please try again.', color: 'warning' })
        await refreshFn?.()
      } else {
        toast.add({ title: err?.data?.message || err.statusMessage || t('errors.serverError'), color: 'error' })
      }
    } finally {
      saving.value = false
    }
  }

  function addEditTag() {
    const tag = editTagInput.value.trim()
    if (tag && !editForm.tags.includes(tag)) editForm.tags.push(tag)
    editTagInput.value = ''
  }

  function removeEditTag(tag: string) {
    editForm.tags = editForm.tags.filter((tg) => tg !== tag)
  }

  return {
    editMode, saving, editFormRef, editTagInput, editForm,
    stackSizeOptions, editRoleOptions, templateOptions,
    openEditPanel, validateEdit, onSave, addEditTag, removeEditTag,
    isEditDirty, requestCloseEdit, onEditOpenChange,
    showTemplateConfirm, removedPorts, removesAllPorts, pendingTemplateName, pendingStackOnlyChange, confirmTemplateChange
  }
}
