<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" size="sm" :to="`/sites/${siteId}/networks`" />
        <h1 class="text-xl font-bold">{{ network?.name || $t('common.loading') }}</h1>
      </div>
      <div v-if="network" class="flex items-center gap-1">
        <UButton icon="i-heroicons-information-circle" :variant="showDetails ? 'solid' : 'ghost'" color="info" size="sm" :title="showDetails ? $t('common.hideDetails') : $t('common.showDetails')" @click="showDetails = !showDetails" />
        <UButton :icon="editing ? 'i-heroicons-x-mark' : 'i-heroicons-pencil'" :variant="editing ? 'solid' : 'ghost'" :color="editing ? 'neutral' : 'primary'" size="sm" :title="editing ? $t('common.cancel') : $t('common.edit')" @click="editing ? editing = false : startEdit()" />
        <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" :title="$t('common.delete')" @click="showDeleteDialog = true" />
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
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-green-500" /> {{ allocations.length }} {{ $t('networks.infoBar.allocated') }}</span>
          <span v-if="dhcpRangePercent > 0" class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-blue-500/60" /> {{ $t('networks.ranges.types.dhcp') }}</span>
          <span v-if="reservedRangePercent > 0" class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-yellow-500/50" /> {{ $t('networks.ranges.types.reserved') }}</span>
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-gray-500/30" /> {{ $t('common.free') }}</span>
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
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-700 dark:text-gray-300">{{ $t('networks.unified.title') }}</h2>
          <UButton icon="i-heroicons-plus" size="sm" @click="openAddPanel()">
            {{ $t('common.add') }}
          </UButton>
        </div>

        <!-- Unified list -->
        <div class="divide-y divide-default overflow-hidden rounded-lg border border-default bg-default">
          <div
            v-for="row in unifiedList"
            :key="row.key"
            class="group flex items-center gap-3 px-4 py-2.5 transition-colors"
            :class="rowClass(row)"
            @click="onRowClick(row)"
          >
            <!-- Fixed rows (network, gateway, broadcast) -->
            <template v-if="row.kind === 'fixed'">
              <div class="w-40 shrink-0">
                <code class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ row.ip }}</code>
              </div>
              <div class="flex-1">
                <span class="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">{{ row.label }}</span>
              </div>
            </template>

            <!-- Allocation rows -->
            <template v-else-if="row.kind === 'allocation'">
              <div class="w-40 shrink-0">
                <code class="font-mono text-xs text-gray-900 dark:text-white">{{ (row.data as IPAllocation).ip_address }}</code>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ (row.data as IPAllocation).hostname || (row.data as IPAllocation).ip_address }}</span>
                  <UBadge v-if="(row.data as IPAllocation).device_type" variant="subtle" color="neutral" size="sm">{{ $t(`networks.allocations.deviceTypes.${(row.data as IPAllocation).device_type}`) }}</UBadge>
                  <UBadge :color="(row.data as IPAllocation).status === 'active' ? 'success' : (row.data as IPAllocation).status === 'reserved' ? 'warning' : 'neutral'" variant="subtle" size="sm">{{ $t(`networks.allocations.statuses.${(row.data as IPAllocation).status}`) }}</UBadge>
                </div>
                <div v-if="(row.data as IPAllocation).description || (row.data as IPAllocation).mac_address" class="mt-0.5 flex items-center gap-3 text-[11px] text-gray-400">
                  <span v-if="(row.data as IPAllocation).description">{{ (row.data as IPAllocation).description }}</span>
                  <span v-if="(row.data as IPAllocation).mac_address" class="font-mono">{{ (row.data as IPAllocation).mac_address }}</span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click.stop="openEditAlloc(row.data as IPAllocation)" />
                <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.stop="openDeleteAllocDialog(row.data as IPAllocation)" />
              </div>
            </template>

            <!-- Range rows -->
            <template v-else-if="row.kind === 'range'">
              <div class="w-40 shrink-0">
                <code class="font-mono text-sm font-medium text-gray-900 dark:text-white">{{ (row.data as IPRange).start_ip }}</code>
                <span class="font-mono text-xs text-gray-400"> – {{ abbreviateEndIp((row.data as IPRange).start_ip, (row.data as IPRange).end_ip) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge :color="rangeTypeBadgeColor((row.data as IPRange).type)" variant="subtle" size="sm">{{ $t(`networks.ranges.types.${(row.data as IPRange).type}`) }}</UBadge>
                  <span class="font-mono text-[11px] text-gray-400">{{ $t('networks.ranges.ipCount', { count: rangeIpCount(row.data as IPRange) }) }}</span>
                  <span v-if="(row.data as IPRange).description" class="text-xs text-gray-500 dark:text-gray-400">{{ (row.data as IPRange).description }}</span>
                  <span v-if="(row.data as IPRange).type !== 'dhcp' && countAllocsInRange(row.data as IPRange) > 0" class="text-xs text-gray-400">
                    ({{ $t('networks.ranges.ipsDocumented', { count: countAllocsInRange(row.data as IPRange) }) }})
                  </span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click.stop="openRangeEdit(row.data as IPRange)" />
                <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.stop="openDeleteRange(row.data as IPRange)" />
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
    <USlideover v-model:open="showRangeEdit">
      <template #title>
        <div class="flex items-center gap-2">
          <UBadge :color="rangeTypeBadgeColor(rangeEditForm.type)" variant="subtle" size="sm">{{ $t(`networks.ranges.types.${rangeEditForm.type}`) }}</UBadge>
          <span>{{ rangeEditTarget?.start_ip }} – {{ rangeEditTarget?.end_ip }}</span>
        </div>
      </template>

      <template #body>
        <div v-if="rangeEditError" class="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {{ rangeEditError }}
        </div>
        <form class="space-y-4" @submit.prevent="onSaveRangeEdit">
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('networks.ranges.fields.startIp') + ' *'">
              <UInput v-model="rangeEditForm.start_ip" required class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.ranges.fields.endIp') + ' *'">
              <UInput v-model="rangeEditForm.end_ip" required class="w-full" />
            </UFormField>
          </div>
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

    <!-- Add/Edit IP/Range Sidebar -->
    <USlideover v-model:open="showAddPanel">
      <template #title>
        <div v-if="editAllocTarget" class="flex items-center gap-2">
          <code class="font-mono text-sm">{{ editAllocTarget.ip_address }}</code>
          <span v-if="editAllocTarget.hostname" class="text-sm text-gray-400">{{ editAllocTarget.hostname }}</span>
        </div>
        <span v-else>{{ $t('common.add') }}</span>
      </template>

      <template #actions>
        <div v-if="editAllocTarget" class="flex items-center gap-1">
          <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" :title="$t('common.delete')" @click="openDeleteAllocDialog(editAllocTarget)" />
        </div>
      </template>

      <template #body>
        <!-- Mode toggle (only for new entries) -->
        <div v-if="!editAllocTarget" class="mb-4 flex items-center gap-1">
          <button
            class="px-2.5 py-1 text-xs font-medium rounded border transition-colors"
            :class="addPanelMode === 'ip'
              ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
              : 'bg-neutral-100 border-neutral-300 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'"
            @click="addPanelMode = 'ip'"
          >{{ $t('networks.unified.addIp') }}</button>
          <button
            class="px-2.5 py-1 text-xs font-medium rounded border transition-colors"
            :class="addPanelMode === 'range'
              ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
              : 'bg-neutral-100 border-neutral-300 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'"
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
          <UButton :loading="addPanelMode === 'ip' ? creatingAlloc : creatingRange" @click="addPanelMode === 'ip' ? onCreateAllocation() : onCreateRange()">{{ editAllocTarget ? $t('common.save') : $t('common.add') }}</UButton>
        </div>
      </template>
    </USlideover>

    <SharedConfirmDialog v-model="showDeleteDialog" :title="$t('networks.delete')" :message="network ? `${$t('networks.delete')}: ${network.name} (${network.subnet})?` : ''" :loading="deleting" @confirm="confirmDeleteNetwork" />
    <SharedConfirmDialog
      v-model="showDeleteAllocDialog"
      :title="$t('networks.allocations.title')"
      :message="deleteAllocTarget
        ? (allocDeleteRefs.length > 0 && allocDeleteRefs[0] !== '(could not check port references)'
          ? `${$t('common.delete')}: ${deleteAllocTarget.ip_address}? — ${$t('networks.allocations.deleteWithRefs', {
              count: allocDeleteRefs.length,
              ports: allocDeleteRefs.length <= 5
                ? allocDeleteRefs.join(', ')
                : allocDeleteRefs.slice(0, 5).join(', ') + ` +${allocDeleteRefs.length - 5} ${t('common.more')}`
            })}`
          : `${$t('common.delete')}: ${deleteAllocTarget.ip_address}?`)
        : ''"
      :loading="deletingAlloc"
      @confirm="confirmDeleteAlloc"
      @update:model-value="(v) => { if (!v) allocDeleteRefs = [] }"
    />
    <SharedConfirmDialog v-model="showDeleteRangeDialog" :title="$t('networks.ranges.title')" :message="deleteRangeTarget ? `${$t('common.delete')}: ${deleteRangeTarget.start_ip} - ${deleteRangeTarget.end_ip}?` : ''" :loading="deletingRange" @confirm="confirmDeleteRange" />
  </div>
</template>

<script setup lang="ts">
import type { Network } from '~~/types/network'
import type { IPAllocation } from '~~/types/ipAllocation'
import type { IPRange } from '~~/types/ipRange'

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const router = useRouter()
const networkId = route.params.id as string
const { update: updateNetwork, remove: removeNetwork } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()

const pageLoading = ref(true)
const network = ref<Network | null>(null)

useHead({ title: computed(() => network.value?.name || t('networks.title')) })
const editing = ref(false)
const saving = ref(false)
const showDetails = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)

const allocations = ref<IPAllocation[]>([])
const showAddPanel = ref(false)
const addPanelMode = ref<'ip' | 'range'>('ip')
const addPanelError = ref('')
const creatingAlloc = ref(false)
const showDeleteAllocDialog = ref(false)
const deleteAllocTarget = ref<IPAllocation | null>(null)
const deletingAlloc = ref(false)
const allocDeleteRefs = ref<string[]>([])

const ranges = ref<IPRange[]>([])
const creatingRange = ref(false)
const showDeleteRangeDialog = ref(false)
const deleteRangeTarget = ref<IPRange | null>(null)
const deletingRange = ref(false)

// Range edit slideover
const showRangeEdit = ref(false)
const rangeEditTarget = ref<IPRange | null>(null)
const rangeEditForm = ref({ start_ip: '', end_ip: '', type: 'static', description: '' })
const rangeEditError = ref('')
const savingRangeEdit = ref(false)

const editAllocTarget = ref<IPAllocation | null>(null)

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
watch(network, (n) => { if (n?.name) breadcrumbOverrides.value[`/sites/${siteId.value}/networks/${networkId}`] = n.name }, { immediate: true })

const vlanOptions = computed(() => {
  const opts: { label: string; value: string }[] = []
  vlans.value.forEach((v) => { opts.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id }) })
  return opts
})

const associatedVlan = computed(() => {
  if (!network.value?.vlan_id) return null
  return vlans.value.find((v) => v.id === network.value!.vlan_id)
})

const deviceTypeOptions = computed(() => [
  { label: t('networks.allocations.deviceTypes.server'), value: 'server' },
  { label: t('networks.allocations.deviceTypes.switch'), value: 'switch' },
  { label: t('networks.allocations.deviceTypes.printer'), value: 'printer' },
  { label: t('networks.allocations.deviceTypes.phone'), value: 'phone' },
  { label: t('networks.allocations.deviceTypes.ap'), value: 'ap' },
  { label: t('networks.allocations.deviceTypes.camera'), value: 'camera' },
  { label: t('networks.allocations.deviceTypes.other'), value: 'other' }
])
const allocStatusOptions = computed(() => [
  { label: t('common.active'), value: 'active' },
  { label: t('networks.allocations.statuses.reserved'), value: 'reserved' },
  { label: t('common.inactive'), value: 'inactive' }
])
const rangeTypeOptions = computed(() => [
  { label: t('networks.ranges.types.dhcp'), value: 'dhcp' },
  { label: t('networks.ranges.types.static'), value: 'static' },
  { label: t('networks.ranges.types.reserved'), value: 'reserved' }
])


const subnetInfo = computed(() => {
  if (!network.value?.subnet) return { network: '-', broadcast: '-', mask: '-', totalHosts: 0, usableHosts: 0 }
  const parts = network.value.subnet.split('/')
  if (parts.length !== 2) return { network: '-', broadcast: '-', mask: '-', totalHosts: 0, usableHosts: 0 }
  const prefix = parseInt(parts[1]!, 10)
  const ipParts = parts[0]!.split('.').map(Number)
  const ipNum = ((ipParts[0]! << 24) | (ipParts[1]! << 16) | (ipParts[2]! << 8) | ipParts[3]!) >>> 0
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
  data?: IPAllocation | IPRange
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

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

function rangeTypeBadgeColor(type: string): BadgeColor {
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

function rangeIpCount(range: IPRange): number {
  return ipToLong(range.end_ip) - ipToLong(range.start_ip) + 1
}

// Selection tracking for master-detail
const selectedRowKey = computed(() => {
  if (showAddPanel.value && editAllocTarget.value) return `alloc-${editAllocTarget.value.id}`
  if (showRangeEdit.value && rangeEditTarget.value) return `range-${rangeEditTarget.value.id}`
  return null
})

function rowClass(row: UnifiedRow): string {
  const isSelected = selectedRowKey.value === row.key
  if (row.kind === 'fixed') {
    return 'bg-elevated'
  }
  if (row.kind === 'range') {
    const type = (row.data as IPRange | undefined)?.type
    if (isSelected) return 'cursor-pointer border-l-2 border-l-primary-500 bg-primary-500/10 dark:bg-primary-500/10'
    if (type === 'dhcp') return 'cursor-pointer border-l-2 border-l-blue-500 bg-blue-500/5 dark:bg-blue-500/5 hover:bg-blue-500/10 dark:hover:bg-blue-500/10'
    if (type === 'static') return 'cursor-pointer border-l-2 border-l-green-500 bg-green-500/5 dark:bg-green-500/5 hover:bg-green-500/10 dark:hover:bg-green-500/10'
    if (type === 'reserved') return 'cursor-pointer border-l-2 border-l-yellow-500 bg-yellow-500/5 dark:bg-yellow-500/5 hover:bg-yellow-500/10 dark:hover:bg-yellow-500/10'
  }
  if (isSelected) return 'cursor-pointer bg-primary-500/10 dark:bg-primary-500/10'
  return 'cursor-pointer row-hover'
}

function onRowClick(row: UnifiedRow) {
  if (row.kind === 'fixed') return
  if (row.kind === 'allocation') openEditAlloc(row.data as IPAllocation)
  if (row.kind === 'range') openRangeEdit(row.data as IPRange)
}

function openAddPanel() {
  editAllocTarget.value = null
  addPanelError.value = ''
  allocForm.value = { ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' }
  rangeForm.value = { start_ip: '', end_ip: '', type: 'static', description: '' }
  showAddPanel.value = true
}

function countAllocsInRange(range: IPRange): number {
  const start = ipToLong(range.start_ip)
  const end = ipToLong(range.end_ip)
  return allocations.value.filter(a => {
    const ip = ipToLong(a.ip_address)
    return ip >= start && ip <= end
  }).length
}

function openRangeEdit(range: IPRange) {
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
  if (!network.value) return
  editForm.value = { name: network.value.name, subnet: network.value.subnet, gateway: network.value.gateway || '', vlan_id: network.value.vlan_id || '', description: network.value.description || '' }
  editDnsInput.value = network.value.dns_servers?.join(', ') || ''
  editing.value = true
  showDetails.value = true
}

function validate(state: typeof editForm.value) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  if (!state.subnet?.trim()) {
    errors.push({ name: 'subnet', message: t('networks.validation.subnetRequired') })
  } else if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(state.subnet.trim())) {
    errors.push({ name: 'subnet', message: t('networks.validation.subnetFormat') })
  }
  if (state.gateway?.trim() && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(state.gateway.trim())) {
    errors.push({ name: 'gateway', message: t('networks.validation.gatewayFormat') })
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
  } catch (err: unknown) { const error = err as { data?: { message?: string } }; toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { saving.value = false }
}

async function confirmDeleteNetwork() {
  deleting.value = true
  try { await removeNetwork(networkId); toast.add({ title: t('networks.messages.deleted'), color: 'success' }); showDeleteDialog.value = false; await router.push(`/sites/${siteId.value}/networks`) }
  catch (err: unknown) { const error = err as { data?: { message?: string } }; toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deleting.value = false }
}

async function fetchAllocations() {
  try { const data = await $fetch<{ data?: IPAllocation[] } | IPAllocation[]>(`/api/networks/${networkId}/allocations`); allocations.value = (data as { data?: IPAllocation[] }).data || data as IPAllocation[] || [] }
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
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    addPanelError.value = error?.data?.message || t('errors.serverError')
  }
  finally { creatingAlloc.value = false }
}

function openEditAlloc(a: IPAllocation) {
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

function openDeleteRange(r: IPRange) {
  deleteRangeTarget.value = r
  showDeleteRangeDialog.value = true
}

async function checkAllocationRefs(allocId: string): Promise<string[]> {
  try {
    const data = await $fetch<{ ports?: { switch_name: string; port_label: string }[] }>(`/api/networks/${networkId}/allocations/${allocId}/references`)
    return (data.ports || []).map((p) => `${p.switch_name} ${p.port_label}`)
  } catch {
    return ['(could not check port references)']
  }
}

async function openDeleteAllocDialog(a: IPAllocation) {
  deleteAllocTarget.value = a
  allocDeleteRefs.value = await checkAllocationRefs(a.id)
  showDeleteAllocDialog.value = true
}

async function confirmDeleteAlloc() {
  if (!deleteAllocTarget.value) return
  deletingAlloc.value = true
  try {
    await $fetch(`/api/networks/${networkId}/allocations/${deleteAllocTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('networks.allocations.messages.deleted'), color: 'success' })
    showDeleteAllocDialog.value = false
    allocDeleteRefs.value = []
    await fetchAllocations()
  }
  catch (err: unknown) { const error = err as { data?: { message?: string } }; toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deletingAlloc.value = false }
}

async function fetchRanges() {
  try { const data = await $fetch<{ data?: IPRange[] } | IPRange[]>(`/api/networks/${networkId}/ranges`); ranges.value = (data as { data?: IPRange[] }).data || data as IPRange[] || [] }
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
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    addPanelError.value = error?.data?.message || t('errors.serverError')
  }
  finally { creatingRange.value = false }
}

function openDeleteRangeDialog(r: IPRange) {
  deleteRangeTarget.value = r
  showDeleteRangeDialog.value = true
  showRangeEdit.value = false
}

async function confirmDeleteRange() {
  if (!deleteRangeTarget.value) return
  deletingRange.value = true
  try { await $fetch(`/api/networks/${networkId}/ranges/${deleteRangeTarget.value.id}`, { method: 'DELETE' }); toast.add({ title: t('networks.ranges.messages.deleted'), color: 'success' }); showDeleteRangeDialog.value = false; await fetchRanges() }
  catch (err: unknown) { const error = err as { data?: { message?: string } }; toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' }) }
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
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    rangeEditError.value = error?.data?.message || t('errors.serverError')
  }
  finally { savingRangeEdit.value = false }
}

async function loadNetwork() {
  pageLoading.value = true
  try { network.value = await $fetch<Network>(`/api/networks/${networkId}`) }
  catch { toast.add({ title: t('errors.notFound'), color: 'error' }); await router.push(`/sites/${siteId.value}/networks`) }
  finally { pageLoading.value = false }
}

const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

onMounted(async () => { await Promise.all([loadNetwork(), fetchVlans(siteParams.value), fetchAllocations(), fetchRanges()]) })
</script>
