import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { useSwitchEditForm } from '../app/composables/useSwitchEditForm'
import { useSlideoverGuard } from '../app/composables/useSlideoverGuard'
import type { Switch } from '../types/switch'

// Resolve Nuxt's transitive Vue dependency, as in topologyAutosave.test.ts.
const require = createRequire(import.meta.url)
const { computed, effectScope, isRef, reactive, ref, watch } = createRequire(require.resolve('nuxt/package.json'))('vue')
let stopScope: (() => void) | undefined

function setup(update = vi.fn().mockResolvedValue(undefined)) {
  const confirm = vi.fn().mockResolvedValue(false)
  for (const [name, value] of Object.entries({ computed, isRef, reactive, ref, watch, useSlideoverGuard })) {
    vi.stubGlobal(name, value)
  }
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
  vi.stubGlobal('useConfirm', () => ({ confirm }))
  vi.stubGlobal('useAuth', () => ({
    canEditInfrastructure: ref(true),
    handleInfrastructureForbidden: vi.fn().mockResolvedValue('not-forbidden')
  }))
  const sw: Switch = {
    id: 'switch-1', site_id: 'site-1', slug: 'switch-1', name: 'Switch 1',
    ports: [], configured_vlans: [], is_favorite: false,
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z'
  }
  const item = ref(sw)
  const scope = effectScope()
  stopScope = () => scope.stop()
  const form = scope.run(() => useSwitchEditForm(item, ref([]), update))!
  form.openEditPanel()
  form.editForm.name = 'Saved switch'
  expect(form.isEditDirty.value).toBe(true)
  return { form, confirm, update }
}

afterEach(() => {
  stopScope?.()
  vi.unstubAllGlobals()
})

describe('saved switch edit guard (#299)', () => {
  it('closes after a successful save without asking to discard saved changes', async () => {
    const { form, confirm, update } = setup()
    await form.onSave()
    expect(update).toHaveBeenCalledOnce()
    expect(form.editMode.value).toBe(false)
    expect(form.isEditDirty.value).toBe(false)
    await form.requestCloseEdit()
    expect(confirm).not.toHaveBeenCalled()

    form.openEditPanel()
    form.editForm.notes = 'Unsaved next edit'
    await form.requestCloseEdit()
    expect(confirm).toHaveBeenCalledOnce()
    expect(form.editMode.value).toBe(true)
  })

  it('keeps failed saves dirty and cancelling the discard prompt preserves edits', async () => {
    const { form, confirm } = setup(vi.fn().mockRejectedValue(new Error('Save failed')))
    await form.onSave()
    expect(form.isEditDirty.value).toBe(true)
    await form.requestCloseEdit()
    expect(confirm).toHaveBeenCalledOnce()
    expect(form.editMode.value).toBe(true)
    expect(form.editForm.name).toBe('Saved switch')
  })
})
