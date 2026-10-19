<template>
  <div v-if="isAuthLoading || !user" class="flex min-h-48 items-center justify-center p-6" role="status" aria-live="polite">
    <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" aria-hidden="true" />
    <span class="sr-only">{{ $t('common.loading') }}</span>
  </div>
  <div v-else class="w-full p-6">
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold">{{ $t('settings.title') }}</h1>
      </div>
    </div>

    <UTabs v-model="activeTab" :items="tabs" variant="link" color="neutral" @update:model-value="activeTabTouched = true">
      <template #general>
        <div v-if="canEditInfrastructure" class="mt-4 space-y-6">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">{{ $t('common.general') }}</h2>
            <p class="mt-2 text-sm text-muted">{{ $t('settings.general.description') }}</p>
          </div>
          <form class="space-y-6" @submit.prevent="saveGeneral">
            <section class="list-container rounded-xl border border-default bg-default p-4 sm:p-6">
              <div class="mb-5 flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                  <UIcon name="i-lucide-settings-2" class="size-5" />
                </div>
                <div>
                  <h3 class="text-base font-semibold">{{ $t('settings.general.basicTitle') }}</h3>
                  <p class="mt-1 text-xs text-muted">{{ $t('settings.general.basicHint') }}</p>
                </div>
              </div>
              <div class="max-w-lg space-y-4">
                <UFormField :label="$t('settings.general.appName')">
                  <UInput v-model="generalForm.app_name" :placeholder="$t('settings.general.appName')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('settings.general.defaultPortStatus')">
                  <USelect v-model="generalForm.default_port_status" :items="portStatusOptions" class="w-full" />
                </UFormField>
              </div>
            </section>

            <section class="list-container rounded-xl border border-default bg-default p-4 sm:p-6">
              <div class="mb-5 flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                  <UIcon name="i-lucide-toggle-left" class="size-5" />
                </div>
                <div>
                  <h3 class="text-base font-semibold">{{ $t('settings.general.featuresTitle') }}</h3>
                  <p class="mt-1 text-xs text-muted">{{ $t('settings.general.featuresHint') }}</p>
                </div>
              </div>
              <div class="max-w-lg space-y-4">
                <UFormField :label="$t('settings.general.patchPanelsEnabled')">
                  <USwitch v-model="generalForm.patch_panels_enabled" />
                  <p class="mt-1 text-xs text-muted">{{ $t('settings.general.patchPanelsEnabledHint') }}</p>
                </UFormField>
                <UFormField :label="$t('settings.general.switchGroupsEnabled')">
                  <USwitch v-model="generalForm.switch_groups_enabled" />
                  <p class="mt-1 text-xs text-muted">{{ $t('settings.general.switchGroupsEnabledHint') }}</p>
                </UFormField>
              </div>
            </section>

            <div class="max-w-lg pt-2">
              <UButton type="submit" :loading="savingGeneral" icon="i-heroicons-check">{{ $t('common.save') }}</UButton>
            </div>
          </form>

        </div>
      </template>

      <template #categories>
        <div v-if="canEditInfrastructure" class="mt-4 space-y-6">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">{{ $t('settings.categories.title') }}</h2>
            <p class="mt-2 max-w-3xl text-sm text-muted">{{ $t('settings.categories.description') }}</p>
          </div>

          <UAlert
            v-if="categorySettingsLoadError"
            color="warning"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="$t('settings.categories.settingsLoadFailed')"
            :description="$t('settings.categories.settingsLoadHint')"
          >
            <template #actions>
              <UButton size="xs" color="neutral" variant="ghost" :loading="loadingCategorySettings" @click="loadCategorySettings">
                {{ $t('common.retry') }}
              </UButton>
            </template>
          </UAlert>

          <section class="list-container rounded-xl border border-default bg-default p-4 sm:p-6">
            <div class="mb-5 flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <UIcon name="i-lucide-tags" class="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 class="text-base font-semibold">{{ $t('settings.categories.builtInTitle') }}</h3>
                <p class="mt-1 text-xs text-muted">{{ $t('settings.categories.builtInHint') }}</p>
              </div>
            </div>
            <div v-if="!settings" class="flex items-center gap-3 py-2 text-sm text-muted" role="status" aria-live="polite">
              <UIcon v-if="loadingCategorySettings" name="i-lucide-loader-circle" class="size-4 animate-spin" aria-hidden="true" />
              <span>{{ loadingCategorySettings ? $t('common.loading') : $t('settings.categories.builtInsUnavailable') }}</span>
            </div>
            <ul v-else class="divide-y divide-default">
              <li v-for="type in BUILTIN_DEVICE_TYPES" :key="type" class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 items-center gap-2">
                  <span class="text-sm font-medium text-highlighted">{{ $t(`networks.allocations.deviceTypes.${type}`) }}</span>
                  <UBadge :color="isBuiltinEnabled(type) ? 'success' : 'neutral'" variant="subtle" size="sm">
                    {{ isBuiltinEnabled(type) ? $t('settings.categories.available') : $t('settings.categories.unavailable') }}
                  </UBadge>
                </div>
                <div class="flex shrink-0 items-center gap-3">
                  <UIcon v-if="deviceTypeMutation === `builtin:${type}`" name="i-lucide-loader-circle" class="size-4 animate-spin text-muted" aria-hidden="true" />
                  <USwitch
                    :model-value="isBuiltinEnabled(type)"
                    :aria-label="$t(isBuiltinEnabled(type) ? 'settings.categories.disableBuiltin' : 'settings.categories.enableBuiltin', { category: $t(`networks.allocations.deviceTypes.${type}`) })"
                    :disabled="!!deviceTypeMutation || !settings"
                    @update:model-value="setBuiltinEnabled(type, $event)"
                  />
                </div>
              </li>
            </ul>
          </section>

          <section class="list-container rounded-xl border border-default bg-default p-4 sm:p-6">
            <div class="mb-5 flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                <UIcon name="i-lucide-tag" class="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 class="text-base font-semibold">{{ $t('settings.categories.customTitle') }}</h3>
                <p class="mt-1 text-xs text-muted">{{ $t('settings.categories.customHint') }}</p>
              </div>
            </div>

            <div v-if="deviceTypesLoadError" class="space-y-2">
              <UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="$t('settings.categories.customLoadFailed')" />
              <UButton size="xs" variant="ghost" color="neutral" :loading="loadingDeviceTypes" @click="retryDeviceTypes">
                {{ $t('common.retry') }}
              </UButton>
            </div>
            <div v-else-if="loadingDeviceTypes" class="flex items-center gap-3 py-2 text-sm text-muted" role="status" aria-live="polite">
              <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" aria-hidden="true" />
              {{ $t('common.loading') }}
            </div>
            <template v-else>
              <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="createDeviceType">
                <UFormField :label="$t('settings.categories.name')" class="min-w-0 flex-1">
                  <UInput v-model="newDeviceTypeName" :aria-label="$t('settings.categories.name')" required class="w-full" />
                </UFormField>
                <UButton
                  type="submit"
                  icon="i-heroicons-plus"
                  :loading="deviceTypeMutation === 'create'"
                  :disabled="!!deviceTypeMutation || !newDeviceTypeName.trim()"
                >
                  {{ $t('settings.categories.add') }}
                </UButton>
              </form>

              <p v-if="customDeviceTypes.length === 0" class="py-3 text-sm text-muted">{{ $t('settings.categories.empty') }}</p>
              <ul v-else class="mt-3 divide-y divide-default">
                <li v-for="type in customDeviceTypes" :key="type.id" class="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <UInput
                        v-if="editingDeviceTypeId === type.id"
                        v-model="editingDeviceTypeName"
                        :aria-label="$t('settings.categories.name')"
                        class="w-full max-w-sm"
                        @keydown.esc.prevent="cancelDeviceTypeEdit"
                      />
                      <span v-else class="break-words text-sm font-medium text-highlighted">{{ type.name }}</span>
                      <UBadge :color="type.active ? 'success' : 'neutral'" variant="subtle" size="sm">
                        {{ type.active ? $t('common.active') : $t('common.inactive') }}
                      </UBadge>
                      <UBadge v-if="type.usage_count !== undefined" color="neutral" variant="subtle" size="sm">
                        {{ $t('settings.categories.usageCount', { count: type.usage_count }) }}
                      </UBadge>
                    </div>
                    <p v-if="type.usage_count === undefined" class="mt-1 text-xs text-warning">{{ $t('settings.categories.usageUnknown') }}</p>
                    <p v-else-if="type.usage_count > 0" class="mt-1 text-xs text-muted">
                      {{ $t(type.active ? 'settings.categories.inUseActive' : 'settings.categories.inUseInactive', { count: type.usage_count }) }}
                    </p>
                    <UAlert
                      v-if="deviceTypeDeleteError?.id === type.id"
                      class="mt-2"
                      color="warning"
                      variant="subtle"
                      icon="i-lucide-circle-alert"
                      :title="$t('settings.categories.deleteConflict', { count: deviceTypeDeleteError.count })"
                      role="alert"
                    />
                  </div>
                  <div class="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <template v-if="editingDeviceTypeId === type.id">
                      <UButton
                        size="xs"
                        :loading="deviceTypeMutation === type.id"
                        :disabled="!!deviceTypeMutation || !editingDeviceTypeName.trim() || editingDeviceTypeName.trim() === type.name"
                        @click="saveDeviceTypeName(type)"
                      >
                        {{ $t('common.save') }}
                      </UButton>
                      <UButton size="xs" variant="ghost" color="neutral" :disabled="!!deviceTypeMutation" @click="cancelDeviceTypeEdit">
                        {{ $t('common.cancel') }}
                      </UButton>
                    </template>
                    <template v-else>
                      <UButton size="xs" variant="ghost" color="neutral" :disabled="!!deviceTypeMutation" @click="editDeviceType(type)">
                        {{ $t('settings.categories.rename') }}
                      </UButton>
                      <UButton
                        size="xs"
                        variant="subtle"
                        :color="type.active ? 'warning' : 'success'"
                        :loading="deviceTypeMutation === type.id"
                        :disabled="!!deviceTypeMutation"
                        @click="toggleDeviceType(type)"
                      >
                        {{ type.active ? $t('settings.categories.deactivate') : $t('settings.categories.activate') }}
                      </UButton>
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="error"
                        :aria-label="$t('settings.categories.deleteNamed', { category: type.name })"
                        :disabled="!!deviceTypeMutation || type.usage_count === undefined || type.usage_count > 0 || deviceTypeDeleteError?.id === type.id"
                        @click="confirmDeleteDeviceType(type)"
                      >
                        {{ $t('common.delete') }}
                      </UButton>
                    </template>
                  </div>
                </li>
              </ul>
            </template>
          </section>
        </div>
      </template>

      <template #account>
        <div class="mt-4 space-y-6">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">{{ $t('settings.account.title') }}</h2>
            <p class="mt-2 text-sm text-muted">{{ $t('settings.account.description') }}</p>
          </div>
          <section class="list-container rounded-xl border border-default bg-default p-4 sm:p-6">
            <div class="mb-5 flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <UIcon name="i-lucide-user-round" class="size-5" />
              </div>
              <div>
                <h3 class="text-base font-semibold">{{ $t('settings.account.profileTitle') }}</h3>
                <p class="mt-1 text-xs text-muted">{{ $t('settings.account.profileHint') }}</p>
              </div>
            </div>
            <form @submit.prevent="saveAccount">
              <div class="max-w-lg space-y-4">
                <UFormField :label="$t('settings.account.displayName')">
                  <UInput v-model="accountForm.display_name" :placeholder="$t('settings.account.displayName')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('settings.account.language')">
                  <USelect v-model="accountForm.language" :items="languageOptions" class="w-full" />
                </UFormField>
                <UFormField :label="$t('settings.account.startSite')">
                  <USelect
                    v-model="accountForm.start_site_id"
                    :items="startSiteOptions"
                    :disabled="loadingStartSites"
                    :aria-label="$t('settings.account.startSite')"
                    class="w-full"
                  />
                  <p v-if="startSiteLoadFailed" class="mt-1 text-xs text-warning" role="status">
                    {{ $t('settings.account.startSiteLoadFailed') }}
                  </p>
                </UFormField>
                <div class="pt-2">
                  <UButton type="submit" :loading="savingProfile" icon="i-heroicons-check">
                    {{ $t('settings.account.saveProfile') }}
                  </UButton>
                </div>
              </div>
            </form>
          </section>

          <div v-if="user?.auth_provider === 'oidc'" class="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4 sm:p-6">
            <div class="flex gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <UIcon name="i-lucide-shield-check" class="size-5" />
              </div>
              <div>
                <h3 class="font-semibold">{{ $t('settings.account.oidcManagedTitle') }}</h3>
                <p class="mt-1 max-w-2xl text-sm text-toned">{{ $t('settings.account.oidcManagedDescription') }}</p>
              </div>
            </div>
          </div>

          <div v-else class="list-container rounded-xl border border-default bg-default p-4 sm:p-6">
            <div class="mb-5 flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <UIcon name="i-lucide-lock-keyhole" class="size-5" />
              </div>
              <div>
                <h3 class="text-base font-semibold">{{ $t('settings.account.changePassword') }}</h3>
                <p class="mt-1 text-xs text-muted">{{ $t('settings.account.passwordHint') }}</p>
              </div>
            </div>
            <UForm :state="passwordForm" :validate="validatePassword" :validate-on="['blur', 'change']" novalidate @submit="handleChangePassword">
              <div class="max-w-lg space-y-4">
                <UFormField :label="$t('settings.account.currentPassword')" name="current_password">
                  <UInput v-model="passwordForm.current_password" type="password" autocomplete="current-password" class="w-full" />
                </UFormField>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <UFormField :label="$t('settings.account.newPassword')" name="new_password">
                    <UInput v-model="passwordForm.new_password" type="password" autocomplete="new-password" class="w-full" />
                  </UFormField>
                  <UFormField :label="$t('settings.account.confirmNewPassword')" name="confirm_password">
                    <UInput v-model="passwordForm.confirm_password" type="password" autocomplete="new-password" class="w-full" />
                  </UFormField>
                </div>
                <div class="pt-2">
                  <UButton type="submit" :loading="savingPassword" icon="i-heroicons-check">
                    {{ $t('settings.account.savePassword') }}
                  </UButton>
                </div>
              </div>
            </UForm>
          </div>
        </div>
      </template>

      <template #authentication>
        <div v-if="canEditInfrastructure" class="mt-4 space-y-6">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0 flex-1">
              <div class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">{{ $t('settings.oidc.tab') }}</h2>
                <UBadge :color="oidcConfig?.enabled ? 'success' : 'neutral'" variant="subtle" size="sm">
                  {{ oidcConfig?.enabled ? $t('settings.oidc.savedEnabled') : $t('settings.oidc.savedDisabled') }}
                </UBadge>
              </div>
              <p class="text-sm text-muted">{{ $t('settings.oidc.description') }}</p>
            </div>
            <div v-if="oidcConfig" class="w-fit self-end rounded-lg border border-default px-3 py-2 text-right md:self-start">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">{{ $t('settings.oidc.savedRevision') }}</p>
              <p class="font-mono text-sm">{{ oidcConfig.config_revision }}</p>
            </div>
          </div>

          <UAlert
            v-if="oidcLoadError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="$t('settings.oidc.loadFailedTitle')"
            :description="$t('settings.oidc.loadFailedDescription')"
            role="alert"
          />

          <template v-if="oidcLoaded">
            <UAlert
              v-if="!oidcConfig?.encryption_key_ready && secretNeedsEncryption"
              color="warning"
              variant="subtle"
              icon="i-lucide-key-round"
              :title="$t('settings.oidc.keyMissingTitle')"
              :description="$t('settings.oidc.keyMissingDescription')"
            />
            <UAlert
              v-else-if="oidcConfig?.client_secret_configured && !oidcConfig.secret_decryptable && !oidcForm.client_secret && !oidcForm.client_secret_clear"
              color="warning"
              variant="subtle"
              icon="i-lucide-key-round"
              :title="$t('settings.oidc.secretUnavailableTitle')"
              :description="$t('settings.oidc.secretUnavailableDescription')"
            />
            <UAlert
              v-else-if="oidcForm.enabled && !oidcReady"
              color="warning"
              variant="subtle"
              icon="i-lucide-circle-help"
              :title="$t('settings.oidc.configurationIncompleteTitle')"
              :description="$t('settings.oidc.configurationIncompleteDescription')"
            />
            <UAlert
              v-if="oidcForm.allow_http_issuer && oidcForm.issuer.startsWith('http://')"
              color="warning"
              variant="subtle"
              icon="i-lucide-triangle-alert"
              :title="$t('settings.oidc.httpWarningTitle')"
              :description="$t('settings.oidc.httpWarningDescription')"
            />

            <div class="grid grid-cols-1 gap-6">
              <div class="space-y-6">
                <section class="rounded-xl border border-default bg-default p-4 sm:p-6">
                  <div class="mb-5 flex items-start gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                      <UIcon name="i-lucide-building-2" class="size-5" />
                    </div>
                    <div>
                      <h3 class="font-semibold">{{ $t('settings.oidc.providerSection') }}</h3>
                      <p class="mt-1 text-xs text-muted">{{ $t('settings.oidc.providerHint') }}</p>
                    </div>
                  </div>

                  <div class="min-w-0 w-full space-y-4">
                    <UFormField :label="$t('settings.oidc.enabledLabel')">
                      <div class="flex items-center gap-3">
                        <USwitch v-model="oidcForm.enabled" />
                        <span class="text-sm text-toned">{{ oidcForm.enabled ? $t('settings.oidc.turnOn') : $t('settings.oidc.turnOff') }}</span>
                      </div>
                    </UFormField>
                    <UFormField :label="$t('settings.oidc.providerName')" :hint="$t('settings.oidc.providerNameHint')">
                      <UInput
                        v-model="oidcForm.provider_name"
                        :placeholder="$t('settings.oidc.providerNamePlaceholder')"
                        maxlength="64"
                        autocomplete="off"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField :label="$t('settings.oidc.issuer')" :hint="$t('settings.oidc.issuerHint')">
                      <UInput v-model="oidcForm.issuer" placeholder="https://id.example.org" autocomplete="url" class="w-full" />
                    </UFormField>
                    <UFormField :label="$t('settings.oidc.clientId')">
                      <UInput v-model="oidcForm.client_id" autocomplete="off" class="w-full" />
                    </UFormField>
                    <UFormField :label="$t('settings.oidc.clientSecret')" :hint="secretHint">
                      <UInput v-model="oidcForm.client_secret" type="password" autocomplete="new-password" :placeholder="secretPlaceholder" class="w-full" />
                    </UFormField>
                    <UCheckbox
                      v-model="oidcForm.client_secret_clear"
                      :disabled="!oidcConfig?.client_secret_configured"
                      :label="$t('settings.oidc.clearSecret')"
                    />
                    <div class="rounded-lg bg-muted px-3 py-3">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <UFormField :label="$t('settings.oidc.callbackUrl')" class="min-w-0 flex-1">
                          <UInput :model-value="oidcConfig?.callback_url || ''" readonly class="w-full font-mono text-xs" />
                        </UFormField>
                        <UButton
                          class="sm:mt-5"
                          color="neutral"
                          variant="outline"
                          icon="i-lucide-copy"
                          :aria-label="$t('settings.oidc.copyCallback')"
                          @click="copyCallbackUrl"
                        >
                          {{ $t('settings.oidc.copyCallback') }}
                        </UButton>
                      </div>
                      <p class="mt-2 text-xs text-muted">{{ $t('settings.oidc.callbackHint') }}</p>
                    </div>
                  </div>
                </section>

                <section class="rounded-xl border border-default bg-default p-4 sm:p-6">
                  <div class="mb-5 flex items-start gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                      <UIcon name="i-lucide-users-round" class="size-5" />
                    </div>
                    <div>
                      <h3 class="font-semibold">{{ $t('settings.oidc.groupsSection') }}</h3>
                      <p class="mt-1 text-xs text-muted">{{ $t('settings.oidc.groupsHint') }}</p>
                    </div>
                  </div>

                  <div class="min-w-0 w-full space-y-5">
                    <UFormField :label="$t('settings.oidc.scopes')" :hint="$t('settings.oidc.scopesHint')">
                      <div class="space-y-2">
                        <div v-for="(scope, index) in oidcForm.scopes" :key="`scope-${index}`" class="flex gap-2">
                          <UInput v-model="oidcForm.scopes[index]" class="min-w-0 flex-1" autocomplete="off" />
                          <UButton color="neutral" variant="ghost" icon="i-lucide-x" :aria-label="$t('settings.oidc.removeScope')" @click="removeScope(index)" />
                        </div>
                        <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-plus" @click="() => { oidcForm.scopes.push('') }">
                          {{ $t('settings.oidc.addScope') }}
                        </UButton>
                      </div>
                    </UFormField>

                    <UFormField :label="$t('settings.oidc.groupsClaim')" :hint="$t('settings.oidc.groupsClaimHint')">
                      <UInput v-model="oidcForm.groups_claim" placeholder="groups" autocomplete="off" class="w-full" />
                    </UFormField>

                    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <div class="mb-2 flex items-center justify-between gap-2">
                          <h4 class="text-sm font-medium">{{ $t('settings.oidc.adminGroups') }}</h4>
                          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-plus" @click="() => { oidcForm.admin_groups.push('') }">{{ $t('common.add') }}</UButton>
                        </div>
                        <div class="space-y-2">
                          <div v-for="(group, index) in oidcForm.admin_groups" :key="`admin-${index}`" class="flex gap-2">
                            <UInput v-model="oidcForm.admin_groups[index]" :placeholder="$t('settings.oidc.groupPlaceholder')" class="min-w-0 flex-1" autocomplete="off" />
                            <UButton color="neutral" variant="ghost" icon="i-lucide-x" :aria-label="$t('settings.oidc.removeGroup')" @click="removeGroup('admin_groups', index)" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <div class="mb-2 flex items-center justify-between gap-2">
                          <h4 class="text-sm font-medium">{{ $t('settings.oidc.viewerGroups') }}</h4>
                          <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-plus" @click="() => { oidcForm.viewer_groups.push('') }">{{ $t('common.add') }}</UButton>
                        </div>
                        <div class="space-y-2">
                          <div v-for="(group, index) in oidcForm.viewer_groups" :key="`viewer-${index}`" class="flex gap-2">
                            <UInput v-model="oidcForm.viewer_groups[index]" :placeholder="$t('settings.oidc.groupPlaceholder')" class="min-w-0 flex-1" autocomplete="off" />
                            <UButton color="neutral" variant="ghost" icon="i-lucide-x" :aria-label="$t('settings.oidc.removeGroup')" @click="removeGroup('viewer_groups', index)" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <UAlert color="neutral" variant="subtle" icon="i-lucide-info" :description="$t('settings.oidc.adminWins')" />

                    <div class="rounded-lg border border-dashed border-accented p-3">
                      <div class="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h4 class="text-sm font-medium">{{ $t('settings.oidc.observedTitle') }}</h4>
                      <p class="mt-1 text-xs text-muted">{{ $t('settings.oidc.observedHint') }}</p>
                        </div>
                        <UBadge v-if="observedSuggestions.length" color="neutral" variant="subtle" size="sm">
                          {{ observedSuggestions.length }}
                        </UBadge>
                      </div>
                      <p v-if="!oidcConfig?.observed_groups.length" class="text-sm text-muted">
                        {{ $t('settings.oidc.observedNone') }}
                      </p>
                      <p v-else-if="!observedSuggestions.length" class="text-sm text-muted">
                        {{ $t('settings.oidc.observedAllAssigned') }}
                      </p>
                      <ul v-else class="space-y-2">
                        <li v-for="group in observedSuggestions" :key="group" class="flex flex-col gap-3 rounded-md bg-muted px-3 py-3 dark:bg-elevated/50 sm:flex-row sm:items-center sm:justify-between">
                          <code class="min-w-0 break-all text-xs sm:flex-1">{{ group }}</code>
                          <div class="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row">
                            <UButton size="sm" class="min-h-11 w-full justify-center whitespace-nowrap sm:w-auto" color="neutral" variant="outline" @click="addObservedGroup('admin_groups', group)">{{ $t('settings.oidc.addAsAdmin') }}</UButton>
                            <UButton size="sm" class="min-h-11 w-full justify-center whitespace-nowrap sm:w-auto" color="neutral" variant="ghost" @click="addObservedGroup('viewer_groups', group)">{{ $t('settings.oidc.addAsViewer') }}</UButton>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <UCheckbox v-model="oidcForm.allow_unmatched_viewer" :label="$t('settings.oidc.allowUnmatchedViewer')" />
                    <p class="-mt-4 pl-7 text-xs text-muted">{{ $t('settings.oidc.unmatchedHint') }}</p>
                  </div>
                </section>
              </div>

              <div class="space-y-6">
                <section class="rounded-xl border border-default bg-default p-4 sm:p-6">
                  <div class="mb-5 flex items-start gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                      <UIcon name="i-lucide-lock-keyhole" class="size-5" />
                    </div>
                    <div>
                      <h3 class="font-semibold">{{ $t('settings.oidc.securitySection') }}</h3>
                      <p class="mt-1 text-xs text-muted">{{ $t('settings.oidc.securityHint') }}</p>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <UCheckbox v-model="oidcForm.allow_http_issuer" :label="$t('settings.oidc.allowHttpIssuer')" />
                    <p class="-mt-3 pl-7 text-xs text-muted">{{ $t('settings.oidc.allowHttpHint') }}</p>
                    <div class="rounded-lg bg-muted p-3 text-xs leading-relaxed text-toned dark:bg-elevated/60">
                      <p class="font-medium text-highlighted">{{ $t('settings.oidc.secretStorageTitle') }}</p>
                      <p class="mt-1">{{ $t('settings.oidc.secretStorageHint') }}</p>
                    </div>
                  </div>
                </section>

                <section class="rounded-xl border border-default bg-default p-4 sm:p-6">
                  <div class="mb-4 flex items-center gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <UIcon name="i-lucide-radio-tower" class="size-5" />
                    </div>
                    <div>
                      <h3 class="font-semibold">{{ $t('settings.oidc.connectionSection') }}</h3>
                      <p class="mt-1 text-xs text-muted">{{ $t('settings.oidc.connectionHint') }}</p>
                    </div>
                  </div>

                  <UAlert
                    v-if="oidcDirty"
                    class="mb-4"
                    color="warning"
                    variant="subtle"
                    icon="i-lucide-save"
                    :description="$t('settings.oidc.saveBeforeCheck')"
                  />
                  <UAlert
                    v-else-if="checkResult"
                    class="mb-4"
                    :color="checkResult.ok ? 'success' : 'error'"
                    variant="subtle"
                    :icon="checkResult.ok ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'"
                    :title="checkResult.ok ? $t('settings.oidc.checkPassed') : $t('settings.oidc.checkFailed')"
                    :description="checkResult.ok ? $t('settings.oidc.checkPassedDescription') : checkErrorMessage"
                  >
                    <template v-if="checkResult.ok" #description>
                      <div class="space-y-2">
                        <p>{{ $t('settings.oidc.checkPassedDescription') }}</p>
                        <p v-if="checkResult.token_endpoint_auth_method" class="text-xs">{{ $t('settings.oidc.authMethod') }}: {{ authMethodLabel(checkResult.token_endpoint_auth_method) }}<span v-if="checkResult.id_token_alg"> · {{ $t('settings.oidc.tokenAlgorithm') }}: {{ checkResult.id_token_alg }}</span></p>
                        <ul v-if="checkResult.endpoints" class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
                          <li v-for="endpoint in endpointItems" :key="endpoint.key" class="flex items-center gap-1.5">
                            <UIcon :name="checkResult.endpoints[endpoint.key] ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" :class="checkResult.endpoints[endpoint.key] ? 'text-emerald-500' : 'text-gray-400'" />
                            {{ endpoint.label }}
                          </li>
                        </ul>
                        <ul v-if="checkResult.warnings?.length" class="space-y-1 border-t border-default/70 pt-2 text-xs">
                          <li v-for="warning in checkResult.warnings" :key="warning" class="flex items-start gap-1.5">
                            <UIcon name="i-lucide-triangle-alert" class="mt-0.5 shrink-0 text-amber-500" />
                            <span>{{ checkWarningLabel(warning) }}</span>
                          </li>
                        </ul>
                      </div>
                    </template>
                  </UAlert>

                  <div class="flex flex-col gap-2 sm:flex-row">
                    <UButton color="neutral" variant="outline" icon="i-lucide-plug-zap" :loading="checkingOidc" :disabled="oidcDirty || !oidcLoaded" @click="checkOidc">
                      {{ $t('settings.oidc.checkConnection') }}
                    </UButton>
                    <UButton icon="i-lucide-check" :loading="savingOidc" :disabled="!oidcDirty" @click="saveOidc">
                      {{ $t('settings.oidc.saveConfiguration') }}
                    </UButton>
                  </div>
                  <p class="mt-3 text-xs text-muted">{{ $t('settings.oidc.checkNoLogin') }}</p>
                </section>
              </div>
            </div>
          </template>
          <div v-else-if="loadingOidc" class="flex items-center gap-3 rounded-xl border border-default bg-default p-6 text-sm text-muted">
            <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
            {{ $t('common.loading') }}
          </div>
        </div>
      </template>
    </UTabs>
    <SharedConfirmDialog
      v-if="canEditInfrastructure"
      v-model="showDeleteDeviceTypeDialog"
      :title="$t('settings.categories.deleteTitle')"
      :message="$t('settings.categories.confirmDelete', { category: deleteDeviceTypeTarget?.name || '' })"
      :confirm-label="$t('common.delete')"
      :loading="deviceTypeMutation === deleteDeviceTypeTarget?.id"
      @confirm="deleteDeviceType"
    />
  </div>
</template>

<script setup lang="ts">
import type { OidcCheckResultDto, OidcConfigDto } from '../../types/oidc'
import type { Site } from '~~/types/site'
import { BUILTIN_DEVICE_TYPES, type BuiltinDeviceType, type CustomDeviceType } from '~~/types/ipAllocation'

const AUTOMATIC_SITE = '_automatic'

const toast = useToast()
const { t, setLocale } = useI18n()
useHead({ title: t('settings.title') })
const { user, authResolved, isAuthLoading, canEditInfrastructure, fetchUser, handleInfrastructureForbidden } = useAuth()
const { settings, fetch: fetchSettings, update: updateSettings } = useSettings()
const { update: updateUser, changePassword: changePasswordApi } = useUsers()
const { getConfig, saveConfig: saveOidcConfig, checkSavedConfig } = useOidc()
const { apiFetch } = useApiFetch()
const {
  items: customDeviceTypes,
  loading: loadingDeviceTypes,
  loadError: deviceTypesLoadError,
  fetch: fetchDeviceTypes,
  create: createCustomDeviceType,
  update: updateCustomDeviceType,
  remove: removeCustomDeviceType
} = useDeviceTypes()

const savingGeneral = ref(false)
const loadingCategorySettings = ref(false)
const categorySettingsLoadError = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)
const loadingOidc = ref(false)
const savingOidc = ref(false)
const checkingOidc = ref(false)
const oidcLoaded = ref(false)
const oidcLoadError = ref(false)
const oidcConfig = ref<OidcConfigDto | null>(null)
const checkResult = ref<OidcCheckResultDto | null>(null)
const oidcBaseline = ref('')
const activeTab = ref<'general' | 'categories' | 'account' | 'authentication'>(canEditInfrastructure.value ? 'general' : 'account')
const activeTabTouched = ref(false)

interface OidcFormState {
  enabled: boolean
  provider_name: string
  issuer: string
  client_id: string
  client_secret: string
  client_secret_clear: boolean
  scopes: string[]
  groups_claim: string
  admin_groups: string[]
  viewer_groups: string[]
  allow_unmatched_viewer: boolean
  allow_http_issuer: boolean
}

const createDefaultOidcForm = (): OidcFormState => ({
  enabled: false,
  provider_name: '',
  issuer: '',
  client_id: '',
  client_secret: '',
  client_secret_clear: false,
  scopes: ['openid', 'profile', 'email'],
  groups_claim: 'groups',
  admin_groups: [],
  viewer_groups: [],
  allow_unmatched_viewer: false,
  allow_http_issuer: false
})

const oidcForm = reactive<OidcFormState>(createDefaultOidcForm())
const observedSuggestions = computed(() => {
  const mappedGroups = new Set(
    [...oidcForm.admin_groups, ...oidcForm.viewer_groups]
      .map(group => group.trim())
      .filter(Boolean)
  )

  return (oidcConfig.value?.observed_groups ?? [])
    .filter(group => !mappedGroups.has(group.trim()))
})
const oidcDirty = computed(() => oidcLoaded.value && serializeOidcForm() !== oidcBaseline.value)
const secretHint = computed(() => oidcConfig.value?.client_secret_configured
  ? t('settings.oidc.secretConfiguredHint')
  : t('settings.oidc.secretEmptyHint'))
const secretPlaceholder = computed(() => oidcConfig.value?.client_secret_configured
  ? t('settings.oidc.secretStoredPlaceholder')
  : t('settings.oidc.secretInputPlaceholder'))
const secretNeedsEncryption = computed(() => Boolean(
  !oidcForm.client_secret_clear
  && (oidcForm.client_secret || oidcConfig.value?.client_secret_configured)
))
const oidcReady = computed(() => Boolean(
  oidcForm.issuer.trim()
  && oidcForm.client_id.trim()
  && (!secretNeedsEncryption.value || oidcConfig.value?.encryption_key_ready)
  && (!oidcConfig.value?.client_secret_configured || oidcConfig.value?.secret_decryptable || oidcForm.client_secret || oidcForm.client_secret_clear)
))
const checkErrorMessage = computed(() => {
  const safeCodes = [
    'oidc_not_configured',
    'oidc_invalid_request',
    'oidc_provider_error',
    'oidc_token_invalid',
    'oidc_unavailable',
    'unsupported_client_auth',
    'not_configured',
    'encryption_key_unavailable',
    'secret_undecryptable',
    'issuer_invalid',
    'issuer_mismatch',
    'endpoint_invalid',
    'redirect_not_allowed',
    'response_too_large',
    'pkce_not_supported',
    'id_token_invalid',
    'unsupported_id_token_alg'
  ]
  const code = checkResult.value?.code
  if (!code || !safeCodes.includes(code)) return t('settings.oidc.checkFailedDescription')
  return t(`settings.oidc.checkErrors.${code}`)
})

const tabs = computed(() => {
  const items = [] as Array<{ label: string, value: 'general' | 'categories' | 'account' | 'authentication', slot: 'general' | 'categories' | 'account' | 'authentication' }>
  if (canEditInfrastructure.value) items.push({ label: t('common.general'), value: 'general', slot: 'general' })
  if (canEditInfrastructure.value) items.push({ label: t('settings.categories.tab'), value: 'categories', slot: 'categories' })
  items.push({ label: t('common.account'), value: 'account', slot: 'account' })
  if (canEditInfrastructure.value) items.push({ label: t('settings.oidc.tab'), value: 'authentication', slot: 'authentication' })
  return items
})

const endpointItems = computed(() => [
  { key: 'authorization', label: t('settings.oidc.authorizationEndpoint') },
  { key: 'token', label: t('settings.oidc.tokenEndpoint') },
  { key: 'jwks', label: t('settings.oidc.jwksEndpoint') },
  { key: 'userinfo', label: t('settings.oidc.userInfoEndpoint') }
] as const)

const portStatusOptions = [
  { label: 'Up', value: 'up' },
  { label: 'Down', value: 'down' },
  { label: 'Disabled', value: 'disabled' }
]

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Deutsch', value: 'de' }
]

const generalForm = reactive({
  app_name: '',
  default_port_status: 'down',
  patch_panels_enabled: false,
  switch_groups_enabled: true
})

const accountForm = reactive({
  display_name: '',
  language: 'en',
  start_site_id: AUTOMATIC_SITE as string
})

const newDeviceTypeName = ref('')
const editingDeviceTypeId = ref<string | null>(null)
const editingDeviceTypeName = ref('')
const deviceTypeMutation = ref<string | null>(null)
const showDeleteDeviceTypeDialog = ref(false)
const deleteDeviceTypeTarget = ref<CustomDeviceType | null>(null)
const deviceTypeDeleteError = ref<{ id: string, count: number } | null>(null)
const disabledBuiltinDeviceTypes = computed(() => settings.value?.disabled_builtin_device_types ?? [])
const deviceTypeEditIsDirty = computed(() => {
  const original = customDeviceTypes.value.find(type => type.id === editingDeviceTypeId.value)?.name
  return original !== undefined && editingDeviceTypeName.value !== original
})
const deviceTypeDraft = computed(() => ({
  createName: newDeviceTypeName.value,
  editId: deviceTypeEditIsDirty.value ? editingDeviceTypeId.value : '',
  editName: deviceTypeEditIsDirty.value ? editingDeviceTypeName.value : ''
}))
const { clearDirty: clearDeviceTypeDraft } = useUnsavedChanges(deviceTypeDraft)

function editDeviceType(type: CustomDeviceType) {
  if (!canEditInfrastructure.value || deviceTypesLoadError.value || deviceTypeMutation.value) return
  editingDeviceTypeId.value = type.id
  editingDeviceTypeName.value = type.name
}

function cancelDeviceTypeEdit() {
  editingDeviceTypeId.value = null
  editingDeviceTypeName.value = ''
}

function isBuiltinEnabled(type: BuiltinDeviceType) {
  return !disabledBuiltinDeviceTypes.value.includes(type)
}

async function loadCategorySettings(updateGeneral = false) {
  if (!canEditInfrastructure.value) return
  const generation = adminGeneration
  loadingCategorySettings.value = true
  try {
    await fetchSettings()
    if (!adminCurrent(generation)) return
    categorySettingsLoadError.value = false
  } catch {
    if (!adminCurrent(generation)) return
    categorySettingsLoadError.value = true
  } finally {
    loadingCategorySettings.value = false
  }
  if (updateGeneral && settings.value && adminCurrent(generation)) {
    generalForm.app_name = settings.value.app_name || 'ezSWM'
    generalForm.default_port_status = settings.value.default_port_status || 'down'
    generalForm.patch_panels_enabled = settings.value.patch_panels_enabled ?? false
    generalForm.switch_groups_enabled = settings.value.switch_groups_enabled ?? true
  }
}

async function setBuiltinEnabled(type: BuiltinDeviceType, enabled: boolean) {
  if (!canEditInfrastructure.value || !settings.value || deviceTypeMutation.value) return
  const generation = adminGeneration
  const disabled = new Set(disabledBuiltinDeviceTypes.value)
  if (enabled) disabled.delete(type)
  else disabled.add(type)
  deviceTypeMutation.value = `builtin:${type}`
  try {
    await updateSettings({ disabled_builtin_device_types: [...disabled] })
    if (!adminCurrent(generation)) return
    toast.add({ title: t('settings.categories.builtinUpdated'), color: 'success' })
  } catch (error) {
    await handleDeviceTypeMutationError(error, generation)
  } finally {
    deviceTypeMutation.value = null
  }
}

async function handleDeviceTypeMutationError(error: unknown, generation: number) {
  if (await handleAdminError(error, generation)) return
  toast.add({ title: t('errors.serverError'), color: 'error' })
}

async function retryDeviceTypes() {
  if (await fetchDeviceTypes()) deviceTypeDeleteError.value = null
}

async function createDeviceType() {
  const name = newDeviceTypeName.value.trim()
  if (!canEditInfrastructure.value || !name || deviceTypesLoadError.value || deviceTypeMutation.value) return
  const generation = adminGeneration
  deviceTypeMutation.value = 'create'
  try {
    await createCustomDeviceType(name)
    if (!adminCurrent(generation)) return
    newDeviceTypeName.value = ''
    clearDeviceTypeDraft()
    toast.add({ title: t('settings.categories.created'), color: 'success' })
  } catch (error) {
    await handleDeviceTypeMutationError(error, generation)
  } finally {
    deviceTypeMutation.value = null
  }
}

async function saveDeviceTypeName(type: CustomDeviceType) {
  const name = editingDeviceTypeName.value.trim()
  if (!canEditInfrastructure.value || !name || name === type.name || deviceTypesLoadError.value || deviceTypeMutation.value) return
  const generation = adminGeneration
  deviceTypeMutation.value = type.id
  try {
    await updateCustomDeviceType(type.id, { name })
    if (!adminCurrent(generation)) return
    cancelDeviceTypeEdit()
    clearDeviceTypeDraft()
    toast.add({ title: t('settings.categories.updated'), color: 'success' })
  } catch (error) {
    await handleDeviceTypeMutationError(error, generation)
  } finally {
    deviceTypeMutation.value = null
  }
}

async function toggleDeviceType(type: CustomDeviceType) {
  if (!canEditInfrastructure.value || deviceTypesLoadError.value || deviceTypeMutation.value) return
  const generation = adminGeneration
  deviceTypeMutation.value = type.id
  try {
    await updateCustomDeviceType(type.id, { active: !type.active })
    if (!adminCurrent(generation)) return
    toast.add({ title: t('settings.categories.updated'), color: 'success' })
  } catch (error) {
    await handleDeviceTypeMutationError(error, generation)
  } finally {
    deviceTypeMutation.value = null
  }
}

function confirmDeleteDeviceType(type: CustomDeviceType) {
  if (!canEditInfrastructure.value || deviceTypesLoadError.value || deviceTypeMutation.value || type.usage_count !== 0) return
  deviceTypeDeleteError.value = null
  deleteDeviceTypeTarget.value = type
  showDeleteDeviceTypeDialog.value = true
}

async function deleteDeviceType() {
  const type = deleteDeviceTypeTarget.value
  if (!canEditInfrastructure.value || !type || deviceTypeMutation.value || type.usage_count !== 0) return
  const generation = adminGeneration
  deviceTypeMutation.value = type.id
  try {
    await removeCustomDeviceType(type.id)
    if (!adminCurrent(generation) || deleteDeviceTypeTarget.value?.id !== type.id) return
    showDeleteDeviceTypeDialog.value = false
    deleteDeviceTypeTarget.value = null
    deviceTypeDeleteError.value = null
    toast.add({ title: t('settings.categories.deleted'), color: 'success' })
  } catch (error) {
    if (await handleAdminError(error, generation)) return
    if (!adminCurrent(generation) || deleteDeviceTypeTarget.value?.id !== type.id) return
    const data = (error as { data?: { code?: string, usage_count?: number } })?.data
    if (data?.code === 'DEVICE_TYPE_IN_USE') {
      deviceTypeDeleteError.value = { id: type.id, count: data.usage_count ?? 1 }
      showDeleteDeviceTypeDialog.value = false
      deleteDeviceTypeTarget.value = null
      await fetchDeviceTypes()
      return
    }
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    deviceTypeMutation.value = null
  }
}

const sites = ref<Site[]>([])
const loadingStartSites = ref(true)
const startSiteLoadFailed = ref(false)
const startSiteLoadComplete = ref(false)
const initialStartSiteSelection = ref<string>(AUTOMATIC_SITE)
const startSiteOptions = computed(() => {
  const options = [
    { label: t('settings.account.startSiteAutomatic'), value: AUTOMATIC_SITE },
    ...sites.value.map(site => ({ label: site.name, value: site.id }))
  ]
  const selected = accountForm.start_site_id
  if (selected !== AUTOMATIC_SITE && !sites.value.some(site => site.id === selected)) {
    options.push({
      label: startSiteLoadComplete.value
        ? t('settings.account.startSiteUnavailable')
        : t('settings.account.startSiteLoading'),
      value: selected
    })
  }
  return options
})

const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

// Admin-only state is invalidated when the role is lost. Async admin completions capture the
// generation at start and ignore their result if it changed or edit permission is gone
// (also covers demote -> promote while a request is in flight).
let adminGeneration = 0
let hasBeenDemoted = false
let accessNoticeShown = false

function adminCurrent(gen: number) {
  return gen === adminGeneration && canEditInfrastructure.value
}

function noticeAccessChanged() {
  if (accessNoticeShown) return
  accessNoticeShown = true
  toast.add({ title: t('permissions.accessChanged'), color: 'warning' })
}

// Returns true when the failure must NOT show the generic error (role lost / stale request).
async function handleAdminError(error: unknown, gen: number): Promise<boolean> {
  const access = await handleInfrastructureForbidden(error)
  if (access === 'demoted') noticeAccessChanged()
  return access === 'demoted' || access === 'already-handled' || !adminCurrent(gen)
}

// Last saved/loaded admin (general + OIDC) field values. While the user cannot edit
// infrastructure, the single dirty tracker compares these saved values (never revoked admin
// edits) together with the live personal account/password fields.
function snapshotInfra() {
  return JSON.parse(JSON.stringify({ general: { ...generalForm }, oidc: { ...oidcForm } })) as { general: typeof generalForm, oidc: OidcFormState }
}
let infraBaseline = snapshotInfra()

const dirtyTracker = computed(() => {
  const infra = canEditInfrastructure.value ? { general: generalForm, oidc: oidcForm } : infraBaseline
  return { ...infra.general, ...accountForm, ...passwordForm, ...infra.oidc }
})
const { clearDirty: clearTrackerDirty } = useUnsavedChanges(dirtyTracker)

function clearDirty() {
  if (canEditInfrastructure.value) infraBaseline = snapshotInfra()
  clearTrackerDirty()
}

function serializeOidcForm() {
  return JSON.stringify({ ...oidcForm })
}

function applyOidcConfig(config: OidcConfigDto) {
  oidcConfig.value = config
  Object.assign(oidcForm, {
    enabled: config.enabled,
    provider_name: config.provider_name || '',
    issuer: config.issuer || '',
    client_id: config.client_id || '',
    // The server never returns the secret. A blank field means keep the saved one.
    client_secret: '',
    client_secret_clear: false,
    scopes: [...config.scopes],
    groups_claim: config.groups_claim,
    admin_groups: [...config.admin_groups],
    viewer_groups: [...config.viewer_groups],
    allow_unmatched_viewer: config.allow_unmatched_viewer,
    allow_http_issuer: config.allow_http_issuer
  })
  oidcBaseline.value = serializeOidcForm()
  oidcLoaded.value = true
  oidcLoadError.value = false
}

async function loadOidcConfig() {
  if (!canEditInfrastructure.value) return
  const gen = adminGeneration
  loadingOidc.value = true
  oidcLoadError.value = false
  try {
    const config = await getConfig()
    if (!adminCurrent(gen)) return
    applyOidcConfig(config)
  } catch (e) {
    if (await handleAdminError(e, gen)) return
    oidcLoadError.value = true
  } finally {
    loadingOidc.value = false
  }
}

async function saveGeneral() {
  if (!canEditInfrastructure.value) return
  const gen = adminGeneration
  savingGeneral.value = true
  try {
    await updateSettings({
      app_name: generalForm.app_name,
      default_port_status: generalForm.default_port_status as 'disabled' | 'up' | 'down',
      patch_panels_enabled: generalForm.patch_panels_enabled,
      switch_groups_enabled: generalForm.switch_groups_enabled
    })
    if (!adminCurrent(gen)) return
    clearDirty()
    toast.add({ title: t('settings.messages.updated'), color: 'success' })
  } catch (e) {
    if (await handleAdminError(e, gen)) return
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    savingGeneral.value = false
  }
}

async function loadStartSites() {
  loadingStartSites.value = true
  startSiteLoadFailed.value = false
  try {
    const response = await apiFetch<{ data?: Site[] } | Site[]>('/api/sites')
    sites.value = (Array.isArray(response) ? response : response?.data) || []
    if (accountForm.start_site_id !== AUTOMATIC_SITE && !sites.value.some(site => site.id === accountForm.start_site_id)) {
      accountForm.start_site_id = AUTOMATIC_SITE
    }
  } catch {
    // Keep the stored ID in the form so saving another profile field cannot clear it.
    startSiteLoadFailed.value = true
  } finally {
    loadingStartSites.value = false
    startSiteLoadComplete.value = true
    initialStartSiteSelection.value = accountForm.start_site_id
  }
}

async function saveAccount() {
  if (!user.value) return
  // Capture what is submitted before any await so later input edits cannot change the comparison.
  const userId = user.value.id
  const displayName = accountForm.display_name
  const language = accountForm.language as 'en' | 'de'
  const submittedStartSite = accountForm.start_site_id
  const startSiteId = submittedStartSite === AUTOMATIC_SITE ? null : submittedStartSite
  const saveStartSite = (startSiteLoadComplete.value && !startSiteLoadFailed.value)
    || submittedStartSite !== initialStartSiteSelection.value
  savingProfile.value = true
  try {
    await updateUser(userId, {
      display_name: displayName,
      language,
      ...(saveStartSite ? { start_site_id: startSiteId } : {})
    })
    await setLocale(language)
    // The auth user is read-only here; refresh it from the server (single-flight GET, not a PUT retry).
    let refreshed = await fetchUser()
    // fetchUser may have joined a refresh that started before the save and returned the old profile.
    // That request has finished by now, so at most one fresh refresh can pick up the saved profile.
    if (refreshed && refreshed.id === userId && (
      refreshed.display_name !== displayName
      || refreshed.language !== language
      || (saveStartSite && refreshed.start_site_id !== startSiteId)
    )) {
      refreshed = await fetchUser()
    }
    // Session ended or the identity changed meanwhile: do not report success for this profile.
    if (!refreshed || refreshed.id !== userId) return
    if (accountForm.start_site_id === submittedStartSite) {
      const refreshedStartSite = refreshed.start_site_id
      accountForm.start_site_id = refreshedStartSite
        && (startSiteLoadFailed.value || !startSiteLoadComplete.value || sites.value.some(site => site.id === refreshedStartSite))
        ? refreshedStartSite
        : AUTOMATIC_SITE
      initialStartSiteSelection.value = accountForm.start_site_id
    }
    clearDirty()
    toast.add({ title: t('settings.messages.profileUpdated'), color: 'success' })
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    savingProfile.value = false
  }
}

function validatePassword(state: typeof passwordForm) {
  const errors: { name: string; message: string }[] = []
  if (!state.current_password) {
    errors.push({ name: 'current_password', message: t('settings.account.validation.currentPasswordRequired') })
  }
  if (!state.new_password || state.new_password.length < 8) {
    errors.push({ name: 'new_password', message: t('settings.account.validation.newPasswordMin') })
  }
  if (state.new_password !== state.confirm_password) {
    errors.push({ name: 'confirm_password', message: t('settings.account.validation.passwordMismatch') })
  }
  return errors
}

async function handleChangePassword() {
  if (!user.value) return
  savingPassword.value = true
  try {
    await changePasswordApi(user.value.id, {
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password
    })
    passwordForm.current_password = ''
    passwordForm.new_password = ''
    passwordForm.confirm_password = ''
    await nextTick()
    clearDirty()
    toast.add({ title: t('settings.messages.passwordChanged'), color: 'success' })
  } catch (e: unknown) {
    const message = e instanceof Error ? (e as Error & { data?: { message?: string } }).data?.message : undefined
    toast.add({ title: message || t('errors.serverError'), color: 'error' })
  } finally {
    savingPassword.value = false
  }
}

function removeScope(index: number) {
  oidcForm.scopes.splice(index, 1)
}

function removeGroup(key: 'admin_groups' | 'viewer_groups', index: number) {
  oidcForm[key].splice(index, 1)
}

function addObservedGroup(target: 'admin_groups' | 'viewer_groups', group: string) {
  if (oidcForm[target].some(value => value.trim() === group)) return
  oidcForm[target].push(group)
}

async function copyCallbackUrl() {
  if (!canEditInfrastructure.value || !oidcConfig.value?.callback_url) return
  try {
    await navigator.clipboard.writeText(oidcConfig.value.callback_url)
    toast.add({ title: t('settings.oidc.callbackCopied'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.oidc.callbackCopyFailed'), color: 'error' })
  }
}

function buildOidcPayload() {
  const payload: Record<string, unknown> = {
    enabled: oidcForm.enabled,
    provider_name: oidcForm.provider_name.trim() || null,
    issuer: oidcForm.issuer.trim() || null,
    client_id: oidcForm.client_id.trim() || null,
    scopes: oidcForm.scopes.map(scope => scope.trim()).filter(Boolean),
    groups_claim: oidcForm.groups_claim.trim(),
    admin_groups: oidcForm.admin_groups.map(group => group.trim()).filter(Boolean),
    viewer_groups: oidcForm.viewer_groups.map(group => group.trim()).filter(Boolean),
    allow_unmatched_viewer: oidcForm.allow_unmatched_viewer,
    allow_http_issuer: oidcForm.allow_http_issuer
  }
  if (oidcForm.client_secret_clear) payload.client_secret_clear = true
  else if (oidcForm.client_secret !== '') payload.client_secret = oidcForm.client_secret
  return payload
}

async function saveOidc() {
  if (!canEditInfrastructure.value || !oidcDirty.value) return
  const gen = adminGeneration
  savingOidc.value = true
  try {
    const config = await saveOidcConfig(buildOidcPayload())
    if (!adminCurrent(gen)) return
    applyOidcConfig(config)
    checkResult.value = null
    clearDirty()
    toast.add({ title: t('settings.oidc.saved'), color: 'success' })
  } catch (e) {
    if (await handleAdminError(e, gen)) return
    // API validation/provider responses may include sensitive request context; keep this generic.
    toast.add({ title: t('settings.oidc.saveFailed'), color: 'error' })
  } finally {
    savingOidc.value = false
  }
}

async function checkOidc() {
  if (!canEditInfrastructure.value || oidcDirty.value || !oidcLoaded.value) return
  const gen = adminGeneration
  checkingOidc.value = true
  checkResult.value = null
  try {
    const result = await checkSavedConfig()
    if (!adminCurrent(gen)) return
    checkResult.value = result
  } catch (e) {
    if (await handleAdminError(e, gen)) return
    checkResult.value = { ok: false }
  } finally {
    checkingOidc.value = false
  }
}

function authMethodLabel(method: 'client_secret_basic' | 'client_secret_post' | 'none') {
  return t(`settings.oidc.authMethods.${method}`)
}

function checkWarningLabel(code: string) {
  const knownWarnings = ['pkce_support_not_advertised', 'insecure_http_issuer']
  if (knownWarnings.includes(code)) return t(`settings.oidc.checkWarnings.${code}`)
  return t('settings.oidc.checkWarnings.generic')
}

watch(() => oidcForm.client_secret_clear, (clear) => {
  if (clear) oidcForm.client_secret = ''
})

watch(() => oidcForm.client_secret, (secret) => {
  if (secret) oidcForm.client_secret_clear = false
})

watch(canEditInfrastructure, (canEdit) => {
  if (canEdit) {
    // false -> true before any demotion is the initial auth resolution (handled by onMounted).
    if (!hasBeenDemoted) return
    // Promotion after a demotion: reload admin data (earlier in-flight results were discarded).
    adminGeneration++
    accessNoticeShown = false
    if (!oidcLoaded.value) void loadOidcConfig()
    return
  }
  // true -> false: the role was lost. Invalidate every in-flight admin request.
  adminGeneration++
  hasBeenDemoted = true
  noticeAccessChanged()

  if (settings.value) {
    generalForm.app_name = settings.value.app_name || 'ezSWM'
    generalForm.default_port_status = settings.value.default_port_status || 'down'
    generalForm.patch_panels_enabled = settings.value.patch_panels_enabled ?? false
    generalForm.switch_groups_enabled = settings.value.switch_groups_enabled ?? true
  }
  // Drop admin OIDC data and secrets without refetching. Personal (account/password) fields and
  // the dirty snapshot are intentionally left untouched so unsaved personal edits stay guarded.
  oidcConfig.value = null
  showDeleteDeviceTypeDialog.value = false
  deleteDeviceTypeTarget.value = null
  Object.assign(oidcForm, createDefaultOidcForm())
  oidcBaseline.value = serializeOidcForm()
  oidcLoaded.value = false
  oidcLoadError.value = false
  loadingOidc.value = false
  checkResult.value = null
  activeTab.value = 'account'
})

onMounted(async () => {
  if (!authResolved.value) await fetchUser()
  if (!user.value) return

  // Role epoch of this initial load. A role loss (watch may not have run yet, so also check the
  // live permission) makes the continuation stale: it must not overwrite or snapshot over
  // personal edits typed meanwhile. A normal initial Viewer is never stale.
  const mountGen = adminGeneration
  const mountAdmin = canEditInfrastructure.value
  const mountStale = () => mountGen !== adminGeneration || (mountAdmin && !canEditInfrastructure.value)

  let assigned: { display_name: string, language: string, start_site_id: string } | null = null
  const assignAccount = () => {
    assigned = {
      display_name: user.value?.display_name || '',
      language: user.value?.language || 'en',
      start_site_id: user.value?.start_site_id ?? AUTOMATIC_SITE
    }
    accountForm.display_name = assigned.display_name
    accountForm.language = assigned.language
    accountForm.start_site_id = assigned.start_site_id
    initialStartSiteSelection.value = assigned.start_site_id
  }
  // When stale, finish the personal initial state only if the user has not touched it
  // (nothing to lose), otherwise leave the form and the dirty snapshot as they are.
  const settleIfUntouched = () => {
    const noPasswords = !passwordForm.current_password && !passwordForm.new_password && !passwordForm.confirm_password
    const untouched = noPasswords && (assigned
      ? accountForm.display_name === assigned.display_name && accountForm.language === assigned.language
        && accountForm.start_site_id === initialStartSiteSelection.value
      : accountForm.display_name === '' && accountForm.language === 'en'
        && accountForm.start_site_id === initialStartSiteSelection.value)
    if (!untouched) return
    if (!assigned) assignAccount()
    clearDirty()
  }

  if (mountAdmin) {
    await loadCategorySettings(true)
    if (mountStale()) return settleIfUntouched()
    await fetchDeviceTypes()
    if (mountStale()) return settleIfUntouched()
  }
  if (user.value) {
    assignAccount()
    await loadStartSites()
  }
  await loadOidcConfig()
  if (mountStale()) return settleIfUntouched()
  if (!activeTabTouched.value) activeTab.value = canEditInfrastructure.value ? 'general' : 'account'
  await nextTick()
  if (mountStale()) return settleIfUntouched()
  clearDirty()
})
</script>
