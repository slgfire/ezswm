export async function applyVlanBeforeSuccess(
  applyVlanConfig: () => Promise<void>,
  onSuccess: () => void
): Promise<void> {
  await applyVlanConfig()
  onSuccess()
}

type Ref<T> = { value: T }
export type SubmittedRemoteLag = { id: string; portIds: string[] }

export function buildLagSaveRequest(options: { switchId: string; lagId?: string; siteId?: string; isEdit: boolean; isDuplicate: boolean; body: Record<string, unknown> }) {
  const body = options.isDuplicate ? { ...options.body, remote_device: undefined, remote_device_id: undefined, sync: undefined } : options.body
  return { url: `/api/switches/${options.switchId}/lag-groups${options.isEdit && options.lagId ? `/${options.lagId}` : ''}`, method: options.isEdit && !options.isDuplicate ? 'PUT' as const : 'POST' as const, body, query: options.siteId ? { siteId: options.siteId } : undefined }
}

export async function executeLagSaveRequest<T>(request: ReturnType<typeof buildLagSaveRequest>, requestFn: (url: string, options: { method: 'POST' | 'PUT'; body: Record<string, unknown>; query?: { siteId: string } }) => Promise<T>): Promise<T> {
  return requestFn(request.url, { method: request.method, body: request.body, query: request.query })
}

export async function saveLagLocally(options: { isEdit: boolean; duplicate: boolean; remoteSwitch: boolean; update: () => Promise<void>; create: () => Promise<void> }): Promise<void> {
  if (options.isEdit && !options.duplicate) await options.update()
  else await options.create()
}

export async function submitLagSequence(options: {
  remoteLagId: Ref<string | null>
  remoteLagPortIds: Ref<string[] | null>
  createOrUpdateLocalLag: () => Promise<void>
  updateLocalPortConnections?: () => Promise<void>
  syncRemoteLag?: () => Promise<SubmittedRemoteLag | null>
  applyVlanConfig: () => Promise<void>
  onSuccess: () => void
}): Promise<void> {
  options.remoteLagId.value = null
  options.remoteLagPortIds.value = null
  await options.createOrUpdateLocalLag()
  await options.updateLocalPortConnections?.()
  const submittedRemoteLag = await options.syncRemoteLag?.()
  if (submittedRemoteLag) {
    options.remoteLagId.value = submittedRemoteLag.id
    options.remoteLagPortIds.value = submittedRemoteLag.portIds
  }
  await applyVlanBeforeSuccess(options.applyVlanConfig, options.onSuccess)
}
