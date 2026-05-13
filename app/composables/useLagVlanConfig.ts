import type { VLAN } from '~~/types/vlan'

export function useLagVlanConfig() {
  const { t } = useI18n()
  const { apiFetch } = useApiFetch()

  const allVlans = ref<VLAN[]>([])

  const vlanForm = reactive({
    port_mode: 'access' as string,
    access_vlan: null as number | null,
    native_vlan: null as number | null,
    tagged_vlans: [] as number[]
  })

  const vlanPortModeOptions = computed(() => [
    { label: t('switches.ports.modeAccess'), value: 'access' },
    { label: t('switches.ports.modeTrunk'), value: 'trunk' }
  ])

  async function fetchVlans() {
    try {
      const route = useRoute()
      const siteId = route.params.siteId as string
      const params: Record<string, string> = {}
      if (siteId && siteId !== 'all') params.site_id = siteId
      const data = await apiFetch<{ data?: VLAN[] } | VLAN[]>('/api/vlans', { params })
      allVlans.value = (Array.isArray(data) ? data : data.data || []).sort((a: VLAN, b: VLAN) => a.vlan_id - b.vlan_id)
    } catch { /* ignore */ }
  }

  return {
    allVlans,
    vlanForm,
    vlanPortModeOptions,
    fetchVlans
  }
}
