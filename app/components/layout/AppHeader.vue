<template>
  <header class="flex h-16 items-center justify-between border-b border-gray-800 bg-gray-950 px-4">
    <div class="flex items-center gap-4">
      <!-- Mobile menu toggle -->
      <UButton
        class="lg:hidden"
        variant="ghost"
        color="gray"
        icon="i-heroicons-bars-3"
        @click="$emit('toggleSidebar')"
      />

      <!-- Search -->
      <div class="hidden sm:block">
        <UInput
          :placeholder="$t('common.search')"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-64"
        />
      </div>
    </div>

    <div class="flex items-center gap-2">
      <!-- Theme toggle -->
      <UButton
        variant="ghost"
        color="gray"
        :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
        @click="toggleColorMode"
      />

      <!-- User menu -->
      <UDropdown :items="userMenuItems" :popper="{ placement: 'bottom-end' }">
        <UButton variant="ghost" color="gray" class="gap-2">
          <UIcon name="i-heroicons-user-circle" class="h-5 w-5" />
          <span class="hidden sm:inline text-sm">{{ user?.display_name }}</span>
        </UButton>
      </UDropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
defineEmits<{ toggleSidebar: [] }>()

const { user, logout } = useAuth()
const router = useRouter()
const colorMode = useColorMode()
const { t } = useI18n()

const isDark = computed(() => colorMode.value === 'dark')

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const userMenuItems = computed(() => [
  [{
    label: t('nav.settings'),
    icon: 'i-heroicons-cog-6-tooth',
    click: () => router.push('/settings')
  }],
  [{
    label: t('auth.logout'),
    icon: 'i-heroicons-arrow-right-on-rectangle',
    click: async () => {
      await logout()
      await router.push('/login')
    }
  }]
])
</script>
