export function useEditableDrawer<TForm extends Record<string, any>, TItem extends { id: string }>(
  createInitialState: () => TForm,
  mapItemToForm: (item: TItem) => Partial<TForm>
) {
  const isOpen = ref(false)
  const editingId = ref<string | null>(null)
  const form = reactive(createInitialState()) as TForm

  function resetForm() {
    editingId.value = null
    Object.assign(form, createInitialState())
  }

  function beginCreate() {
    resetForm()
    isOpen.value = true
  }

  function beginEdit(item: TItem) {
    editingId.value = item.id
    Object.assign(form, createInitialState(), mapItemToForm(item))
    isOpen.value = true
  }

  function closeDrawer() {
    isOpen.value = false
    resetForm()
  }

  return {
    isOpen,
    editingId,
    form,
    beginCreate,
    beginEdit,
    resetForm,
    closeDrawer
  }
}
