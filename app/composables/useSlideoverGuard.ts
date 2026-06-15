type FormSource = object | Ref<unknown> | (() => unknown)

/**
 * Unsaved-changes guard for in-page slideovers/panels (no route change, so
 * useUnsavedChanges' onBeforeRouteLeave never fires). Snapshots the editable
 * surface on open and confirms before discarding dirty edits — same copy and
 * behaviour as the full-page useUnsavedChanges guard.
 *
 *   const { takeSnapshot, requestClose, onOpenChange } =
 *     useSlideoverGuard(() => ({ ...form, vlans: tagged.value }), () => { isOpen.value = false })
 *
 * Wire the slideover as `:open="isOpen" @update:open="onOpenChange"`, route
 * explicit close buttons through `requestClose`, and call `takeSnapshot()` once
 * the editable state is fully populated (after any async rehydrate on open).
 *
 * `form` may be a getter (for state spread across multiple refs), a single ref,
 * or a reactive object.
 */
export function useSlideoverGuard(form: FormSource, close: () => void) {
  const { t } = useI18n()
  const { confirm } = useConfirm()
  const snapshot = ref<string | null>(null)

  const read = () =>
    typeof form === 'function' ? (form as () => unknown)() : isRef(form) ? form.value : form

  const isDirty = computed(() => {
    if (snapshot.value === null) return false
    const v = read()
    if (v == null) return false
    return JSON.stringify(v) !== snapshot.value
  })

  function takeSnapshot() {
    const v = read()
    snapshot.value = v == null ? null : JSON.stringify(v)
  }

  async function requestClose() {
    if (isDirty.value) {
      const ok = await confirm({
        title: t('common.unsavedChangesTitle'),
        message: t('common.unsavedChangesWarning'),
        confirmLabel: t('common.leave')
      })
      if (!ok) return
    }
    snapshot.value = null // reset so a fresh open re-snapshots
    close()
  }

  // For USlideover :open + @update:open — guards backdrop/Esc closes.
  function onOpenChange(val: boolean) {
    if (!val) requestClose()
  }

  return { isDirty, takeSnapshot, requestClose, onOpenChange }
}
