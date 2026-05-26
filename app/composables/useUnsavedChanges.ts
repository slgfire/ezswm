import { onBeforeRouteLeave } from 'vue-router'

type FormSource = object | Ref<unknown>

export function useUnsavedChanges(form: FormSource) {
  const { t } = useI18n()
  const snapshot = ref<string | null>(null)

  const read = () => (isRef(form) ? form.value : form)

  const isDirty = computed(() => {
    if (snapshot.value === null) return false
    const value = read()
    if (value == null) return false
    return JSON.stringify(value) !== snapshot.value
  })

  function takeSnapshot() {
    const value = read()
    snapshot.value = value == null ? null : JSON.stringify(value)
  }

  function clearDirty() {
    takeSnapshot()
  }

  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (!isDirty.value) return
    e.preventDefault()
    e.returnValue = ''
  }

  if (import.meta.client) {
    onMounted(() => {
      window.addEventListener('beforeunload', beforeUnloadHandler)
      if (snapshot.value === null) takeSnapshot()
    })
    onBeforeUnmount(() => {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
    })
  }

  onBeforeRouteLeave(() => {
    if (!isDirty.value) return true
    return window.confirm(t('common.unsavedChangesWarning'))
  })

  return { isDirty, takeSnapshot, clearDirty }
}
