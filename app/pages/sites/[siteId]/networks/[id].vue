<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" size="sm" :to="`/sites/${siteId}/networks`" />
        <h1 class="text-xl font-bold">{{ network?.name || $t('common.loading') }}</h1>
      </div>
      <div v-if="network" class="flex items-center gap-1">
        <UTooltip :text="showDetails ? $t('common.hideDetails') : $t('common.showDetails')">
          <UButton icon="i-heroicons-information-circle" :variant="showDetails ? 'solid' : 'ghost'" color="info" size="sm" @click="showDetails = !showDetails" />
        </UTooltip>
        <UTooltip :text="editing ? $t('common.cancel') : $t('common.edit')">
          <UButton :icon="editing ? 'i-heroicons-x-mark' : 'i-heroicons-pencil'" :variant="editing ? 'solid' : 'ghost'" :color="editing ? 'neutral' : 'primary'" size="sm" @click="editing ? editing = false : startEdit()" />
        </UTooltip>
        <UTooltip :text="$t('common.delete')">
          <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" @click="showDeleteDialog = true" />
        </UTooltip>
      </div>
    </div>

    <div v-if="pageLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="network" class="space-y-5">
      <!-- Subnet stats -->
      <div class="-mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-default bg-default/30 px-5 py-3">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.subnet') }}</div>
          <div class="font-mono text-sm font-bold text-gray-900 dark:text-white">{{ network.subnet }}</div>
        </div>
        <div class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div v-if="network.gateway">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.gateway') }}</div>
          <div class="font-mono text-sm font-semibold text-gray-900 dark:text-white">{{ network.gateway }}</div>
        </div>
        <div v-if="network.gateway" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div>
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.mask') }}</div>
          <div class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ subnetInfo.mask }}</div>
        </div>
        <div class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div>
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.hosts') }}</div>
          <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ subnetInfo.usableHosts.toLocaleString() }}</div>
        </div>
        <div class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div>
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.allocated') }}</div>
          <div class="text-sm font-semibold" :class="utilizationPercent > 80 ? 'text-red-500' : 'text-primary-500'">{{ allocations.length }} <span class="text-xs font-normal text-gray-400">({{ utilizationPercent }}%)</span></div>
        </div>
        <div v-if="associatedVlan" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div v-if="associatedVlan">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.vlan') }}</div>
          <div class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
            <div class="h-2 w-2 rounded-full" :style="{ backgroundColor: associatedVlan.color }" />
            {{ associatedVlan.vlan_id }} <span class="font-normal text-gray-400">{{ associatedVlan.name }}</span>
          </div>
        </div>
      </div>

      <!-- Utilization bar -->
      <div class="space-y-1.5">
        <div class="flex h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <div
            class="h-full bg-green-500 transition-all"
            :style="{ width: `${Math.min(utilizationPercent, 100)}%` }"
          />
          <div
            v-if="dhcpRangePercent > 0"
            class="h-full bg-blue-500/60 transition-all"
            :style="{ width: `${Math.min(dhcpRangePercent, 100 - utilizationPercent)}%` }"
          />
          <div
            v-if="reservedRangePercent > 0"
            class="h-full bg-yellow-500/50 transition-all"
            :style="{ width: `${Math.min(reservedRangePercent, 100 - utilizationPercent - dhcpRangePercent)}%` }"
          />
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-green-500" /> {{ allocations.length }} Allocated</span>
          <span v-if="dhcpRangePercent > 0" class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-blue-500/60" /> DHCP</span>
          <span v-if="reservedRangePercent > 0" class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-yellow-500/50" /> Reserved</span>
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-gray-500/30" /> Free</span>
        </div>
      </div>

      <!-- Details panel (toggled) -->
      <div v-show="showDetails || editing" class="rounded-lg border border-default bg-default/30 p-4">
        <div v-if="!editing" class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.network') }}</dt>
            <dd class="font-mono">{{ subnetInfo.network }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.broadcast') }}</dt>
            <dd class="font-mono">{{ subnetInfo.broadcast }}</dd>
          </div>
          <div v-if="network.dns_servers?.length">
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.dns') }}</dt>
            <dd class="font-mono">{{ network.dns_servers.join(', ') }}</dd>
          </div>
          <div v-if="network.description" class="col-span-2 sm:col-span-3 lg:col-span-4">
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('common.description') }}</dt>
            <dd>{{ network.description }}</dd>
          </div>
        </div>

        <!-- Edit form -->
        <UForm v-if="editing" :state="editForm" :validate="validate" :validate-on="['blur', 'change']" novalidate class="space-y-4" @submit="onSave">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormField :label="$t('networks.fields.name') + ' *'" name="name" required>
              <UInput v-model="editForm.name" required class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.fields.subnet') + ' *'" name="subnet" required>
              <UInput v-model="editForm.subnet" required class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.fields.gateway')" name="gateway">
              <UInput v-model="editForm.gateway" class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.fields.dnsServers')" name="dns_servers">
              <UInput v-model="editDnsInput" placeholder="8.8.8.8, 8.8.4.4" class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.fields.vlan')" name="vlan_id">
              <USelect v-model="editForm.vlan_id" :items="vlanOptions" placeholder="-" class="w-full" />
            </UFormField>
            <UFormField :label="$t('common.description')" name="description">
              <UInput v-model="editForm.description" class="w-full" />
            </UFormField>
          </div>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="editing = false">{{ $t('common.cancel') }}</UButton>
            <UButton type="submit" :loading="saving">{{ $t('common.save') }}</UButton>
          </div>
        </UForm>
      </div>

      <!-- Unified IP Overview -->
      <div>
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('networks.unified.title') }}</h2>
          <UButton icon="i-heroicons-plus" size="sm" @click="addPanelError = ''; showAddPanel = true">
            {{ $t('common.add') }}
          </UButton>
        </div>


        <!-- Unified list -->
        <div class="divide-y divide-default overflow-hidden rounded-lg border border-default bg-default">
          <div
            v-for="row in unifiedList"
            :key="row.key"
            class="group flex items-center gap-3 px-4 py-2.5"
            :class="rowClass(row)"
          >
            <!-- Fixed rows (network, gateway, broadcast) -->
            <template v-if="row.kind === 'fixed'">
              <div class="w-40 shrink-0">
                <code class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ row.ip }}</code>
              </div>
              <div class="flex-1">
                <span class="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">{{ row.label }}</span>
              </div>
            </template>

            <!-- Allocation rows -->
            <template v-else-if="row.kind === 'allocation'">
              <div class="w-40 shrink-0">
                <code class="font-mono text-xs text-gray-900 dark:text-white">{{ row.data.ip_address }}</code>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="row.data.hostname" class="text-sm font-medium text-gray-900 dark:text-white">{{ row.data.hostname }}</span>
                  <span v-if="row.data.device_type" class="text-xs text-gray-500">{{ row.data.device_type }}</span>
                  <UBadge :color="row.data.status === 'active' ? 'success' : row.data.status === 'reserved' ? 'warning' : 'neutral'" variant="subtle" size="sm">{{ row.data.status }}</UBadge>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click="openEditAlloc(row.data)" />
                <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="openDeleteAllocDialog(row.data)" />
              </div>
            </template>

            <!-- Range rows -->
            <template v-else-if="row.kind === 'range'">
              <div class="w-40 shrink-0">
                <code class="font-mono text-xs text-gray-900 dark:text-white">{{ row.data.start_ip }} &ndash; {{ abbreviateEndIp(row.data.start_ip, row.data.end_ip) }}</code>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge :color="rangeTypeBadgeColor(row.data.type)" variant="subtle" size="sm">{{ $t(`networks.ranges.types.${row.data.type}`) }}</UBadge>
                  <span class="font-mono text-[11px] text-gray-400">{{ rangeIpCount(row.data) }} IPs</span>
                  <span v-if="row.data.description" class="text-xs text-gray-500 dark:text-gray-400">{{ row.data.description }}</span>
                  <span v-if="row.data.type !== 'dhcp' && countAllocsInRange(row.data) > 0" class="text-xs text-gray-400">
                    ({{ $t('networks.ranges.ipsDocumented', { count: countAllocsInRange(row.data) }) }})
                  </span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click="openRangeEdit(row.data)" />
                <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="openDeleteRange(row.data)" />
              </div>
            </template>
          </div>
          <div v-if="unifiedList.length === 0" class="px-4 py-3">
            <p class="text-xs text-gray-500">{{ $t('common.noData') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Range edit slideover -->
    <USlideover v-model:open="showRangeEdit" :title="$t('networks.ranges.editRange')" description="Modify IP range settings">

      <template #body>
        <div v-if="rangeEditError" class="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {{ rangeEditError }}
        </div>
        <form class="space-y-4" @submit.prevent="onSaveRangeEdit">
          <UFormField :label="$t('networks.ranges.fields.startIp') + ' *'">
            <UInput v-model="rangeEditForm.start_ip" required class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.ranges.fields.endIp') + ' *'">
            <UInput v-model="rangeEditForm.end_ip" required class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.ranges.fields.type') + ' *'">
            <USelect v-model="rangeEditForm.type" :items="rangeTypeOptions" class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.description')">
            <UInput v-model="rangeEditForm.description" class="w-full" />
          </UFormField>
        </form>
      </template>

      <template #footer>
        <div class="flex items-center justify-between">
          <UButton icon="i-heroicons-trash" variant="ghost" color="error" @click="openDeleteRangeDialog(rangeEditTarget!)">
            {{ $t('common.delete') }}
          </UButton>
          <div class="flex gap-2">
            <UButton variant="ghost" color="neutral" @click="showRangeEdit = false">{{ $t('common.cancel') }}</UButton>
            <UButton :loading="savingRangeEdit" @click="onSaveRangeEdit">{{ $t('common.save') }}</UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Add IP/Range Sidebar -->
    <USlideover v-model:open="showAddPanel" :title="editAllocTarget ? $t('networks.allocations.edit') : addPanelMode === 'ip' ? $t('networks.unified.addIp') : $t('networks.unified.addRange')" description="Add IP allocation or range">

        <template #body>
        <!-- Mode toggle -->
        <div class="mb-4 flex items-center gap-1">
          <button
            class="px-2.5 py-1 text-xs font-medium rounded border transition-colors"
            :class="addPanelMode === 'ip'
              ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
              : 'bg-neutral-100 border-neutral-300 text-neutral-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'"
            @click="addPanelMode = 'ip'"
          >{{ $t('networks.unified.addIp') }}</button>
          <button
            class="px-2.5 py-1 text-xs font-medium rounded border transition-colors"
            :class="addPanelMode === 'range'
              ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
              : 'bg-neutral-100 border-neutral-300 text-neutral-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'"
            @click="addPanelMode = 'range'"
          >{{ $t('networks.unified.addRange') }}</button>
        </div>

        <!-- Error -->
        <div v-if="addPanelError" class="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {{ addPanelError }}
        </div>

        <!-- IP Address form -->
        <form v-if="addPanelMode === 'ip'" class="space-y-4" @submit.prevent="onCreateAllocation">
          <UFormField :label="$t('networks.allocations.fields.ipAddress') + ' *'">
            <UInput v-model="allocForm.ip_address" placeholder="10.0.1.10" required :color="addPanelError ? 'error' : undefined" class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.allocations.fields.hostname')">
            <UInput v-model="allocForm.hostname" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('networks.allocations.fields.deviceType')">
              <USelect v-model="allocForm.device_type" :items="deviceTypeOptions" placeholder="-" class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.allocations.fields.status')">
              <USelect v-model="allocForm.status" :items="allocStatusOptions" class="w-full" />
            </UFormField>
          </div>
          <UFormField :label="$t('networks.allocations.fields.macAddress')">
            <UInput v-model="allocForm.mac_address" placeholder="AA:BB:CC:DD:EE:FF" class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.description')">
            <UInput v-model="allocForm.description" class="w-full" />
          </UFormField>
        </form>

        <!-- IP Range form -->
        <form v-if="addPanelMode === 'range'" class="space-y-4" @submit.prevent="onCreateRange">
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('networks.ranges.fields.startIp') + ' *'">
              <UInput v-model="rangeForm.start_ip" placeholder="10.0.1.100" required :color="addPanelError ? 'error' : undefined" class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.ranges.fields.endIp') + ' *'">
              <UInput v-model="rangeForm.end_ip" placeholder="10.0.1.200" required :color="addPanelError ? 'error' : undefined" class="w-full" />
            </UFormField>
          </div>
          <UFormField :label="$t('networks.ranges.fields.type') + ' *'">
            <USelect v-model="rangeForm.type" :items="rangeTypeOptions" class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.description')">
            <UInput v-model="rangeForm.description" class="w-full" />
          </UFormField>
        </form>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showAddPanel = false; editAllocTarget = null">{{ $t('common.cancel') }}</UButton>
            <UButton :loading="addPanelMode === 'ip' ? creatingAlloc : creatingRange" @click="addPanelMode === 'ip' ? onCreateAllocation() : onCreateRange()">{{ $t('common.add') }}</UButton>
          </div>
        </template>
    </USlideover>

    <SharedConfirmDialog v-model="showDeleteDialog" :title="$t('networks.delete')" :message="network ? `${$t('networks.delete')}: ${network.name} (${network.subnet})?` : ''" :loading="deleting" @confirm="confirmDeleteNetwork" />
    <SharedConfirmDialog v-model="showDeleteAllocDialog" :title="$t('networks.allocations.title')" :message="deleteAllocTarget ? `${$t('common.delete')}: ${deleteAllocTarget.ip_address}?` : ''" :loading="deletingAlloc" @confirm="confirmDeleteAlloc" />
    <SharedConfirmDialog v-model="showDeleteRangeDialog" :title="$t('networks.ranges.title')" :message="deleteRangeTarget ? `${$t('common.delete')}: ${deleteRangeTarget.start_ip} - ${deleteRangeTarget.end_ip}?` : ''" :loading="deletingRange" @confirm="confirmDeleteRange" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const router = useRouter()
const networkId = route.params.id as string
const { update: updateNetwork, remove: removeNetwork } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()

const pageLoading = ref(true)
const network = ref<any>(null)

useHead({ title: computed(() => network.value?.name || t('networks.title')) })
const editing = ref(false)
const saving = ref(false)
const showDetails = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)

const allocations = ref<any[]>([])
const showAddPanel = ref(false)
const addPanelMode = ref<'ip' | 'range'>('ip')
const addPanelError = ref('')
const creatingAlloc = ref(false)
const showDeleteAllocDialog = ref(false)
const deleteAllocTarget = ref<any>(null)
const deletingAlloc = ref(false)

const ranges = ref<any[]>([])
const creatingRange = ref(false)
const showDeleteRangeDialog = ref(false)
const deleteRangeTarget = ref<any>(null)
const deletingRange = ref(false)

// Range edit slideover
const showRangeEdit = ref(false)
const rangeEditTarget = ref<any>(null)
const rangeEditForm = ref({ start_ip: '', end_ip: '', type: 'static', description: '' })
const rangeEditError = ref('')
const savingRangeEdit = ref(false)

const editAllocTarget = ref<any>(null)

const editForm = ref({ name: '', subnet: '', gateway: '', vlan_id: '', description: '' })
const editDnsInput = ref('')
const allocForm = ref({ ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' })
const rangeForm = ref({ start_ip: '', end_ip: '', type: 'static', description: '' })

// IP to numeric for sorting
function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0
}

const utilizationPercent = computed(() => {
  if (!subnetInfo.value.usableHosts || subnetInfo.value.usableHosts <= 0) return 0
  return Math.round((allocations.value.length / subnetInfo.value.usableHosts) * 100)
})

const dhcpRangePercent = computed(() => {
  if (!subnetInfo.value.usableHosts || subnetInfo.value.usableHosts <= 0) return 0
  let dhcpIps = 0
  for (const r of ranges.value) {
    if (r.type === 'dhcp') {
      dhcpIps += ipToLong(r.end_ip) - ipToLong(r.start_ip) + 1
    }
  }
  return Math.round((dhcpIps / subnetInfo.value.usableHosts) * 100)
})

const reservedRangePercent = computed(() => {
  if (!subnetInfo.value.usableHosts || subnetInfo.value.usableHosts <= 0) return 0
  let reservedIps = 0
  for (const r of ranges.value) {
    if (r.type === 'reserved') {
      reservedIps += ipToLong(r.end_ip) - ipToLong(r.start_ip) + 1
    }
  }
  return Math.round((reservedIps / subnetInfo.value.usableHosts) * 100)
})

const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))
watch(network, (n) => { if (n?.name) breadcrumbOverrides.value[`/networks/${networkId}`] = n.name }, { immediate: true })

const vlanOptions = computed(() => {
  const opts: { label: string; value: string }[] = []
  vlans.value.forEach((v: any) => { opts.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id }) })
  return opts
})

const associatedVlan = computed(() => {
  if (!network.value?.vlan_id) return null
  return vlans.value.find((v: any) => v.id === network.value.vlan_id)
})

const deviceTypeOptions = [{ label: 'Server', value: 'server' }, { label: 'Switch', value: 'switch' }, { label: 'Printer', value: 'printer' }, { label: 'Phone', value: 'phone' }, { label: 'AP', value: 'ap' }, { label: 'Camera', value: 'camera' }, { label: 'Other', value: 'other' }]
const allocStatusOptions = computed(() => [{ label: t('common.active'), value: 'active' }, { label: 'Reserved', value: 'reserved' }, { label: t('common.inactive'), value: 'inactive' }])
const rangeTypeOptions = [{ label: 'DHCP', value: 'dhcp' }, { label: 'Static', value: 'static' }, { label: 'Reserved', value: 'reserved' }]

// Add menu for the "+" dropdown
const addMenuItems = computed(() => [[
  { label: t('networks.unified.addIp'), icon: 'i-heroicons-computer-desktop', click: () => { addPanelMode.value = 'ip'; addPanelError.value = ''; showAddPanel.value = true } },
  { label: t('networks.unified.addRange'), icon: 'i-heroicons-bars-3-bottom-left', click: () => { addPanelMode.value = 'range'; addPanelError.value = ''; showAddPanel.value = true } }
]])

const subnetInfo = computed(() => {
  if (!network.value?.subnet) return { network: '-', broadcast: '-', mask: '-', totalHosts: 0, usableHosts: 0 }
  const parts = network.value.subnet.split('/')
  if (parts.length !== 2) return { network: '-', broadcast: '-', mask: '-', totalHosts: 0, usableHosts: 0 }
  const prefix = parseInt(parts[1], 10)
  const ipParts = parts[0].split('.').map(Number)
  const ipNum = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0
  const maskNum = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0
  const networkNum = (ipNum & maskNum) >>> 0
  const broadcastNum = (networkNum | (~maskNum >>> 0)) >>> 0
  const totalHosts = Math.pow(2, 32 - prefix)
  const usableHosts = prefix <= 30 ? totalHosts - 2 : totalHosts
  const numToIp = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`
  return { network: numToIp(networkNum), broadcast: numToIp(broadcastNum), mask: numToIp(maskNum), totalHosts, usableHosts: Math.max(0, usableHosts) }
})

// Unified list computed
interface UnifiedRow {
  key: string
  kind: 'fixed' | 'allocation' | 'range'
  sortIp: number
  ip?: string
  label?: string
  data?: any
}

const unifiedList = computed<UnifiedRow[]>(() => {
  const rows: UnifiedRow[] = []
  const info = subnetInfo.value

  // Fixed rows
  if (info.network !== '-') {
    rows.push({ key: 'net', kind: 'fixed', sortIp: ipToLong(info.network), ip: info.network, label: t('networks.unified.networkAddress') })
  }
  if (network.value?.gateway) {
    rows.push({ key: 'gw', kind: 'fixed', sortIp: ipToLong(network.value.gateway), ip: network.value.gateway, label: t('networks.unified.gateway') })
  }
  if (info.broadcast !== '-') {
    rows.push({ key: 'bc', kind: 'fixed', sortIp: ipToLong(info.broadcast), ip: info.broadcast, label: t('networks.unified.broadcast') })
  }

  // Allocation rows
  for (const a of allocations.value) {
    rows.push({ key: `alloc-${a.id}`, kind: 'allocation', sortIp: ipToLong(a.ip_address), data: a })
  }

  // Range rows
  for (const r of ranges.value) {
    rows.push({ key: `range-${r.id}`, kind: 'range', sortIp: ipToLong(r.start_ip), data: r })
  }

  rows.sort((a, b) => a.sortIp - b.sortIp)
  return rows
})

function rangeTypeBadgeColor(type: string): any {
  if (type === 'dhcp') return 'info'
  if (type === 'static') return 'success'
  return 'warning'
}

function abbreviateEndIp(startIp: string, endIp: string): string {
  const startParts = startIp.split('.')
  const endParts = endIp.split('.')
  let common = 0
  for (let i = 0; i < 4; i++) {
    if (startParts[i] === endParts[i]) common++
    else break
  }
  if (common >= 3) return '.' + endParts.slice(3).join('.')
  if (common >= 2) return '.' + endParts.slice(2).join('.')
  return endIp
}

function rangeIpCount(range: any): number {
  return ipToLong(range.end_ip) - ipToLong(range.start_ip) + 1
}

function rowClass(row: UnifiedRow): string {
  if (row.kind === 'fixed') {
    return 'bg-elevated'
  }
  if (row.kind === 'range') {
    const type = row.data?.type
    if (type === 'dhcp') return 'border-l-2 border-l-blue-500 bg-blue-500/5 dark:bg-blue-500/5'
    if (type === 'static') return 'border-l-2 border-l-green-500 bg-green-500/5 dark:bg-green-500/5'
    if (type === 'reserved') return 'border-l-2 border-l-yellow-500 bg-yellow-500/5 dark:bg-yellow-500/5'
  }
  return 'row-hover'
}

function countAllocsInRange(range: any): number {
  const start = ipToLong(range.start_ip)
  const end = ipToLong(range.end_ip)
  return allocations.value.filter(a => {
    const ip = ipToLong(a.ip_address)
    return ip >= start && ip <= end
  }).length
}

function openRangeEdit(range: any) {
  rangeEditTarget.value = range
  rangeEditForm.value = {
    start_ip: range.start_ip,
    end_ip: range.end_ip,
    type: range.type,
    description: range.description || ''
  }
  rangeEditError.value = ''
  showRangeEdit.value = true
}

function startEdit() {
  editForm.value = { name: network.value.name, subnet: network.value.subnet, gateway: network.value.gateway || '', vlan_id: network.value.vlan_id || '', description: network.value.description || '' }
  editDnsInput.value = network.value.dns_servers?.join(', ') || ''
  editing.value = true
  showDetails.value = true
}

function validate(state: any) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: 'Name is required' })
  }
  if (!state.subnet?.trim()) {
    errors.push({ name: 'subnet', message: 'Subnet is required' })
  } else if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(state.subnet.trim())) {
    errors.push({ name: 'subnet', message: 'Must be valid CIDR notation (e.g. 10.0.0.0/24)' })
  }
  if (state.gateway?.trim() && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(state.gateway.trim())) {
    errors.push({ name: 'gateway', message: 'Must be a valid IPv4 address (e.g. 10.0.0.1)' })
  }
  return errors
}

async function onSave() {
  saving.value = true
  try {
    const dnsServers = editDnsInput.value ? editDnsInput.value.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    await updateNetwork(networkId, { name: editForm.value.name.trim(), subnet: editForm.value.subnet.trim(), gateway: editForm.value.gateway.trim() || undefined, dns_servers: dnsServers, vlan_id: editForm.value.vlan_id || undefined, description: editForm.value.description.trim() || undefined })
    toast.add({ title: t('networks.messages.updated'), color: 'success' })
    editing.value = false
    await loadNetwork()
  } catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { saving.value = false }
}

async function confirmDeleteNetwork() {
  deleting.value = true
  try { await removeNetwork(networkId); toast.add({ title: t('networks.messages.deleted'), color: 'success' }); showDeleteDialog.value = false; await router.push(`/sites/${siteId.value}/networks`) }
  catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deleting.value = false }
}

async function fetchAllocations() {
  try { const data = await $fetch<any>(`/api/networks/${networkId}/allocations`); allocations.value = data.data || data || [] }
  catch { allocations.value = [] }
}

async function onCreateAllocation() {
  addPanelError.value = ''
  creatingAlloc.value = true
  const body = {
    ip_address: allocForm.value.ip_address.trim(),
    hostname: allocForm.value.hostname.trim() || undefined,
    mac_address: allocForm.value.mac_address.trim() || undefined,
    device_type: allocForm.value.device_type || undefined,
    description: allocForm.value.description.trim() || undefined,
    status: allocForm.value.status
  }
  try {
    if (editAllocTarget.value) {
      await $fetch(`/api/networks/${networkId}/allocations/${editAllocTarget.value.id}`, { method: 'PUT', body })
      toast.add({ title: t('networks.allocations.messages.updated'), color: 'success' })
    } else {
      await $fetch(`/api/networks/${networkId}/allocations`, { method: 'POST', body })
      toast.add({ title: t('networks.allocations.messages.created'), color: 'success' })
    }
    showAddPanel.value = false
    editAllocTarget.value = null
    allocForm.value = { ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' }
    await fetchAllocations()
  } catch (err: any) {
    addPanelError.value = err?.data?.message || t('errors.serverError')
  }
  finally { creatingAlloc.value = false }
}

function openEditAlloc(a: any) {
  editAllocTarget.value = a
  allocForm.value = {
    ip_address: a.ip_address,
    hostname: a.hostname || '',
    mac_address: a.mac_address || '',
    device_type: a.device_type || '',
    description: a.description || '',
    status: a.status || 'active'
  }
  addPanelMode.value = 'ip'
  addPanelError.value = ''
  showAddPanel.value = true
}

function openDeleteRange(r: any) {
  deleteRangeTarget.value = r
  showDeleteRangeDialog.value = true
}

function openDeleteAllocDialog(a: any) { deleteAllocTarget.value = a; showDeleteAllocDialog.value = true }
async function confirmDeleteAlloc() {
  if (!deleteAllocTarget.value) return
  deletingAlloc.value = true
  try { await $fetch(`/api/networks/${networkId}/allocations/${deleteAllocTarget.value.id}`, { method: 'DELETE' }); toast.add({ title: t('networks.allocations.messages.deleted'), color: 'success' }); showDeleteAllocDialog.value = false; await fetchAllocations() }
  catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deletingAlloc.value = false }
}

async function fetchRanges() {
  try { const data = await $fetch<any>(`/api/networks/${networkId}/ranges`); ranges.value = data.data || data || [] }
  catch { ranges.value = [] }
}

async function onCreateRange() {
  addPanelError.value = ''
  creatingRange.value = true
  try {
    await $fetch(`/api/networks/${networkId}/ranges`, { method: 'POST', body: { start_ip: rangeForm.value.start_ip.trim(), end_ip: rangeForm.value.end_ip.trim(), type: rangeForm.value.type, description: rangeForm.value.description.trim() || undefined } })
    toast.add({ title: t('networks.ranges.messages.created'), color: 'success' })
    showAddPanel.value = false
    rangeForm.value = { start_ip: '', end_ip: '', type: 'static', description: '' }
    await fetchRanges()
  } catch (err: any) {
    addPanelError.value = err?.data?.message || t('errors.serverError')
  }
  finally { creatingRange.value = false }
}

function openDeleteRangeDialog(r: any) {
  deleteRangeTarget.value = r
  showDeleteRangeDialog.value = true
  showRangeEdit.value = false
}

async function confirmDeleteRange() {
  if (!deleteRangeTarget.value) return
  deletingRange.value = true
  try { await $fetch(`/api/networks/${networkId}/ranges/${deleteRangeTarget.value.id}`, { method: 'DELETE' }); toast.add({ title: t('networks.ranges.messages.deleted'), color: 'success' }); showDeleteRangeDialog.value = false; await fetchRanges() }
  catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deletingRange.value = false }
}

async function onSaveRangeEdit() {
  if (!rangeEditTarget.value) return
  rangeEditError.value = ''
  savingRangeEdit.value = true
  try {
    await $fetch(`/api/networks/${networkId}/ranges/${rangeEditTarget.value.id}`, {
      method: 'PUT',
      body: {
        start_ip: rangeEditForm.value.start_ip.trim(),
        end_ip: rangeEditForm.value.end_ip.trim(),
        type: rangeEditForm.value.type,
        description: rangeEditForm.value.description.trim() || null
      }
    })
    toast.add({ title: t('networks.ranges.messages.updated'), color: 'success' })
    showRangeEdit.value = false
    await fetchRanges()
  } catch (err: any) {
    rangeEditError.value = err?.data?.message || t('errors.serverError')
  }
  finally { savingRangeEdit.value = false }
}

async function loadNetwork() {
  pageLoading.value = true
  try { network.value = await $fetch<any>(`/api/networks/${networkId}`) }
  catch { toast.add({ title: t('errors.notFound'), color: 'error' }); await router.push(`/sites/${siteId.value}/networks`) }
  finally { pageLoading.value = false }
}

const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

onMounted(async () => { await Promise.all([loadNetwork(), fetchVlans(siteParams.value), fetchAllocations(), fetchRanges()]) })
</script>
