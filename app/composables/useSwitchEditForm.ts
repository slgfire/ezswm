import type { Switch } from '~~/types/switch'
import type { LayoutTemplate } from '~~/types/layoutTemplate'

export function useSwitchEditForm(
  item: Ref<Switch | null>,
  templates: Ref<LayoutTemplate[]>,
  updateFn: (body: Record<string, unknown>) => Promise<unknown>
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

  async function onSave() {
    saving.value = true
    try {
      const body: Record<string, unknown> = { ...editForm, tags: [...editForm.tags] }
      for (const key of Object.keys(body)) {
        if (body[key] === '' && key !== 'layout_template_id') delete body[key]
        // Empty `tags` array means "remove all" — must reach the API. Other empty
        // arrays (configured_vlans etc.) are managed via dedicated endpoints.
        if (Array.isArray(body[key]) && (body[key] as unknown[]).length === 0 && key !== 'tags') delete body[key]
      }
      if (body.layout_template_id === '') delete body.layout_template_id
      body.stack_size = editForm.stack_size || 1
      await updateFn(body)
      toast.add({ title: t('switches.messages.updated'), color: 'success' })
      editMode.value = false
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
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
    openEditPanel, validateEdit, onSave, addEditTag, removeEditTag
  }
}
