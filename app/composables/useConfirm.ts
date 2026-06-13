export interface ConfirmOptions {
  title: string
  message: string
  /** Defaults to common.confirm in the dialog. */
  confirmLabel?: string
}

// The pending promise resolver lives at module scope, not in useState: a
// function isn't SSR-serializable, and confirm() is only ever called client-side
// from event handlers / navigation guards.
let pendingResolver: ((value: boolean) => void) | null = null

/**
 * Imperative, promise-based confirmation backed by a single global modal
 * (SharedConfirmHost, mounted in app.vue). Use instead of window.confirm():
 *
 *   const { confirm } = useConfirm()
 *   if (!(await confirm({ title, message }))) return
 */
export function useConfirm() {
  const open = useState<boolean>('confirm-dialog-open', () => false)
  const options = useState<ConfirmOptions | null>('confirm-dialog-options', () => null)

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    // Resolve any still-pending confirm as cancelled before opening a new one.
    if (pendingResolver) {
      pendingResolver(false)
      pendingResolver = null
    }
    options.value = opts
    open.value = true
    return new Promise<boolean>((resolve) => {
      pendingResolver = resolve
    })
  }

  // Called by the host on confirm (true) or any dismissal (false).
  function settle(value: boolean) {
    open.value = false
    if (pendingResolver) {
      pendingResolver(value)
      pendingResolver = null
    }
  }

  return { open, options, confirm, settle }
}
