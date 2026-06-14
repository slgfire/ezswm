import type { LAGGroup } from '~~/types/lagGroup'
import type { Port } from '~~/types/port'
import type { Switch } from '~~/types/switch'

export function useRemoteConnection(
  switchId: Ref<string>,
  ports: Ref<Port[]>,
  formPortIds: Ref<string[]>,
  formRemoteDevice: Ref<string>,
  formRemoteDeviceId: Ref<string | undefined>,
  vlanForm: ReturnType<typeof useLagVlanConfig>['vlanForm']
) {
  const { t } = useI18n()
  const { apiFetch } = useApiFetch()

  const remoteMode = ref<'none' | 'switch' | 'freetext'>('none')
  const allSwitches = ref<Switch[]>([])
  const selectedRemoteSwitchId = ref('')
  const remoteLags = ref<LAGGroup[]>([])
  const portMapping = reactive<Record<string, { remotePortId: string; remotePortLabel: string }>>({})

  // Switch references in stored data (remote_device_id, connected_device_id) are
  // UUIDs, but the detail page addresses switches by slug, so `switchId` here is a
  // slug. Resolve any ref (slug or UUID) to the UUID via the loaded switch list.
  // Older mirror LAGs were written with a slug, so comparisons tolerate both.
  const resolveSwitchUuid = (ref: string): string => {
    if (!ref) return ''
    return allSwitches.value.find(s => s.id === ref || s.slug === ref)?.id || ref
  }
  const localSwitchUuid = computed(() => resolveSwitchUuid(switchId.value))
  const isLocalSwitch = (deviceId: string | null | undefined): boolean =>
    !!deviceId && (deviceId === localSwitchUuid.value || deviceId === switchId.value)

  // VLANs from the VLAN form state
  const formVlanNumbers = computed(() => {
    const vlans: number[] = []
    if (vlanForm.port_mode === 'trunk') {
      if (vlanForm.native_vlan) vlans.push(vlanForm.native_vlan)
      if (vlanForm.tagged_vlans.length) vlans.push(...vlanForm.tagged_vlans)
    } else {
      if (vlanForm.access_vlan) vlans.push(vlanForm.access_vlan)
    }
    return [...new Set(vlans)]
  })

  const switchOptions = computed(() => [
    { label: '— None —', value: '' },
    ...allSwitches.value
      .filter(s => s.id !== localSwitchUuid.value)
      .map(s => ({ label: s.name, value: s.id }))
  ])

  const selectedSwitchOption = computed(() =>
    switchOptions.value.find(o => o.value === selectedRemoteSwitchId.value) || switchOptions.value[0]
  )

  const existingRemoteLag = computed(() => {
    if (!selectedRemoteSwitchId.value) return null
    return remoteLags.value.find(lag => isLocalSwitch(lag.remote_device_id)) || null
  })

  // Remote port options for selected switch (with connection conflict info)
  const remotePortOptions = computed(() => {
    if (!selectedRemoteSwitchId.value) return []
    const sw = allSwitches.value.find(s => s.id === selectedRemoteSwitchId.value)
    if (!sw?.ports) return []
    return [
      { label: '— None —', value: '', conflict: '' },
      ...sw.ports.map((p: Port) => {
        const label = p.label || `${p.unit}/${p.index}`
        let conflict = ''
        if (p.connected_device_id && !isLocalSwitch(p.connected_device_id)) {
          conflict = `→ ${p.connected_device || 'Unknown'}`
        } else if (isLocalSwitch(p.connected_device_id) && p.connected_port_id) {
          const isOurLagPort = formPortIds.value.includes(p.connected_port_id)
          if (!isOurLagPort) {
            const ourPort = ports.value.find((lp: Port) => lp.id === p.connected_port_id)
            conflict = `→ ${ourPort?.label || 'this switch'}`
          }
        }
        return {
          label: conflict ? `${label}  ⚠ ${conflict}` : label,
          value: p.id,
          conflict
        }
      })
    ]
  })

  // Check if selected remote ports are in a DIFFERENT LAG on the remote switch
  const remotePortLagConflicts = computed(() => {
    if (remoteMode.value !== 'switch' || !selectedRemoteSwitchId.value) return []
    const conflicts: { portId: string; portLabel: string; lagName: string }[] = []
    const allowedRemoteLagId = existingRemoteLag.value?.id

    for (const localPortId of formPortIds.value) {
      const mapping = portMapping[localPortId]
      if (!mapping?.remotePortId) continue

      for (const rlag of remoteLags.value) {
        if (rlag.id === allowedRemoteLagId) continue
        if (rlag.port_ids.includes(mapping.remotePortId)) {
          conflicts.push({
            portId: mapping.remotePortId,
            portLabel: mapping.remotePortLabel || mapping.remotePortId,
            lagName: rlag.name
          })
        }
      }
    }
    return conflicts
  })

  // Connection conflict check per port (existing connections, not LAG conflicts)
  function getPortConflict(localPortId: string): string | null {
    if (remoteMode.value !== 'switch') return null
    const mapping = portMapping[localPortId]
    if (!mapping?.remotePortId) return null
    const option = remotePortOptions.value.find(o => o.value === mapping.remotePortId)
    if (option?.conflict) {
      return t('lag.portAlreadyConnected', { port: mapping.remotePortLabel, device: option.conflict.replace('→ ', '') })
    }
    return null
  }

  const hasConnectionConflicts = computed(() => {
    return formPortIds.value.some(pid => getPortConflict(pid) !== null)
  })

  // Missing VLANs for a given switch (used in switch dropdown badges)
  function getMissingRemoteVlans(targetSwitchId: string): number[] {
    if (!targetSwitchId || !formVlanNumbers.value.length) return []
    const sw = allSwitches.value.find(s => s.id === targetSwitchId)
    if (!sw) return []
    const configured = new Set(sw.configured_vlans || [])
    return formVlanNumbers.value.filter(v => !configured.has(v))
  }

  // Missing VLANs on selected remote switch
  const remoteSwitchMissingVlans = computed(() =>
    getMissingRemoteVlans(selectedRemoteSwitchId.value)
  )

  // Remote switch configured VLANs for badge display
  const remoteConfiguredVlansList = computed(() => {
    if (remoteMode.value !== 'switch' || !selectedRemoteSwitchId.value) return undefined
    const sw = allSwitches.value.find(s => s.id === selectedRemoteSwitchId.value)
    return sw?.configured_vlans || []
  })

  const showPortMapping = computed(() => {
    if (remoteMode.value === 'switch' && selectedRemoteSwitchId.value) return true
    if (remoteMode.value === 'freetext' && formRemoteDevice.value.trim()) return true
    return false
  })

  function onRemoteModeChange(mode: 'none' | 'switch' | 'freetext') {
    remoteMode.value = mode
    if (mode === 'none') {
      formRemoteDevice.value = ''
      formRemoteDeviceId.value = undefined
      selectedRemoteSwitchId.value = ''
      for (const key of Object.keys(portMapping)) delete portMapping[key]
    }
  }

  async function onSwitchSelect(option: { label: string; value: string } | undefined) {
    selectedRemoteSwitchId.value = option?.value || ''
    const sw = allSwitches.value.find(s => s.id === option?.value)
    formRemoteDevice.value = sw?.name || ''
    formRemoteDeviceId.value = option?.value || undefined
    for (const key of Object.keys(portMapping)) delete portMapping[key]
    if (option?.value) {
      await fetchRemoteLags(option.value)
    } else {
      remoteLags.value = []
    }
  }

  async function fetchSwitches() {
    try {
      const route = useRoute()
      const siteId = route.params.siteId as string
      const params: Record<string, string> = {}
      if (siteId && siteId !== 'all') params.site_id = siteId
      const data = await apiFetch<{ data?: Switch[] } | Switch[]>('/api/switches', { params })
      allSwitches.value = (Array.isArray(data) ? data : data.data) || []
    } catch { /* ignore */ }
  }

  async function fetchRemoteLags(remoteSwitchId: string) {
    try {
      remoteLags.value = await apiFetch<LAGGroup[]>(`/api/switches/${remoteSwitchId}/lag-groups`)
    } catch {
      remoteLags.value = []
    }
  }

  function initPortMapping() {
    for (const portId of formPortIds.value) {
      const port = ports.value.find(p => p.id === portId)
      if (port) {
        portMapping[portId] = {
          remotePortId: port.connected_port_id || '',
          remotePortLabel: port.connected_port || ''
        }
      }
    }
  }

  function getRemotePortOption(localPortId: string) {
    const mapping = portMapping[localPortId]
    if (!mapping?.remotePortId) return remotePortOptions.value[0]
    return remotePortOptions.value.find(o => o.value === mapping.remotePortId) || remotePortOptions.value[0]
  }

  function setRemotePort(localPortId: string, option: { label: string; value: string; conflict: string } | undefined) {
    const portId = option?.value || ''
    const sw = allSwitches.value.find(s => s.id === selectedRemoteSwitchId.value)
    const remotePort = sw?.ports?.find((p: Port) => p.id === portId)
    portMapping[localPortId] = {
      remotePortId: portId,
      remotePortLabel: remotePort?.label || option?.label?.replace(/\s+⚠.*/, '') || ''
    }
  }

  function setRemotePortFreetext(localPortId: string, label: string) {
    portMapping[localPortId] = {
      remotePortId: '',
      remotePortLabel: label
    }
  }

  return {
    remoteMode,
    allSwitches,
    selectedRemoteSwitchId,
    remoteLags,
    portMapping,
    switchOptions,
    selectedSwitchOption,
    existingRemoteLag,
    remotePortOptions,
    remotePortLagConflicts,
    hasConnectionConflicts,
    remoteSwitchMissingVlans,
    remoteConfiguredVlansList,
    showPortMapping,
    formVlanNumbers,
    resolveSwitchUuid,
    onRemoteModeChange,
    onSwitchSelect,
    fetchSwitches,
    fetchRemoteLags,
    initPortMapping,
    getRemotePortOption,
    setRemotePort,
    setRemotePortFreetext,
    getPortConflict,
    getMissingRemoteVlans
  }
}
