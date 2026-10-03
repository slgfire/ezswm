<template>
  <div class="w-full p-6">
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold">{{ $t('settings.title') }}</h1>
      </div>
    </div>

    <UTabs :items="tabs" variant="link" color="neutral">
      <template #general>
        <div class="mt-4 space-y-6">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">{{ $t('common.general') }}</h2>
          <form class="space-y-6" @submit.prevent="saveGeneral">
            <section class="list-container rounded-xl border border-gray-200 bg-default p-4 sm:p-6 dark:border-gray-800">
              <div class="mb-5 flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                  <UIcon name="i-lucide-settings-2" class="size-5" />
                </div>
                <div>
                  <h3 class="text-base font-semibold">{{ $t('settings.general.basicTitle') }}</h3>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.general.basicHint') }}</p>
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

            <section class="list-container rounded-xl border border-gray-200 bg-default p-4 sm:p-6 dark:border-gray-800">
              <div class="mb-5 flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                  <UIcon name="i-lucide-toggle-left" class="size-5" />
                </div>
                <div>
                  <h3 class="text-base font-semibold">{{ $t('settings.general.featuresTitle') }}</h3>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.general.featuresHint') }}</p>
                </div>
              </div>
              <div class="max-w-lg space-y-4">
                <UFormField :label="$t('settings.general.patchPanelsEnabled')">
                  <USwitch v-model="generalForm.patch_panels_enabled" />
                  <p class="mt-1 text-xs text-gray-500">{{ $t('settings.general.patchPanelsEnabledHint') }}</p>
                </UFormField>
                <UFormField :label="$t('settings.general.switchGroupsEnabled')">
                  <USwitch v-model="generalForm.switch_groups_enabled" />
                  <p class="mt-1 text-xs text-gray-500">{{ $t('settings.general.switchGroupsEnabledHint') }}</p>
                </UFormField>
              </div>
            </section>

            <div class="max-w-lg pt-2">
              <UButton type="submit" :loading="savingGeneral" icon="i-heroicons-check">{{ $t('common.save') }}</UButton>
            </div>
          </form>
        </div>
      </template>

      <template #account>
        <div class="mt-4 space-y-6">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">{{ $t('settings.account.title') }}</h2>
          <section class="list-container rounded-xl border border-gray-200 bg-default p-4 sm:p-6 dark:border-gray-800">
            <div class="mb-5 flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <UIcon name="i-lucide-user-round" class="size-5" />
              </div>
              <div>
                <h3 class="text-base font-semibold">{{ $t('settings.account.profileTitle') }}</h3>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.account.profileHint') }}</p>
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
                <p class="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">{{ $t('settings.account.oidcManagedDescription') }}</p>
              </div>
            </div>
          </div>

          <div v-else class="list-container rounded-xl border border-gray-200 bg-default p-4 sm:p-6 dark:border-gray-800">
            <div class="mb-5 flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <UIcon name="i-lucide-lock-keyhole" class="size-5" />
              </div>
              <div>
                <h3 class="text-base font-semibold">{{ $t('settings.account.changePassword') }}</h3>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.account.passwordHint') }}</p>
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
        <div class="mt-4 space-y-6">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0 flex-1">
              <div class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">{{ $t('settings.oidc.tab') }}</h2>
                <UBadge :color="oidcConfig?.enabled ? 'success' : 'neutral'" variant="subtle" size="sm">
                  {{ oidcConfig?.enabled ? $t('settings.oidc.savedEnabled') : $t('settings.oidc.savedDisabled') }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.description') }}</p>
            </div>
            <div v-if="oidcConfig" class="w-fit self-end rounded-lg border border-gray-200 px-3 py-2 text-right dark:border-gray-800 md:self-start">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{{ $t('settings.oidc.savedRevision') }}</p>
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
                <section class="rounded-xl border border-gray-200 bg-default p-4 sm:p-6 dark:border-gray-800">
                  <div class="mb-5 flex items-start gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                      <UIcon name="i-lucide-building-2" class="size-5" />
                    </div>
                    <div>
                      <h3 class="font-semibold">{{ $t('settings.oidc.providerSection') }}</h3>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.providerHint') }}</p>
                    </div>
                  </div>

                  <div class="min-w-0 w-full space-y-4">
                    <UFormField :label="$t('settings.oidc.enabledLabel')">
                      <div class="flex items-center gap-3">
                        <USwitch v-model="oidcForm.enabled" />
                        <span class="text-sm text-gray-600 dark:text-gray-300">{{ oidcForm.enabled ? $t('settings.oidc.turnOn') : $t('settings.oidc.turnOff') }}</span>
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
                    <div class="rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-950/60">
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
                      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.callbackHint') }}</p>
                    </div>
                  </div>
                </section>

                <section class="rounded-xl border border-gray-200 bg-default p-4 sm:p-6 dark:border-gray-800">
                  <div class="mb-5 flex items-start gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                      <UIcon name="i-lucide-users-round" class="size-5" />
                    </div>
                    <div>
                      <h3 class="font-semibold">{{ $t('settings.oidc.groupsSection') }}</h3>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.groupsHint') }}</p>
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

                    <UAlert color="info" variant="subtle" icon="i-lucide-info" :description="$t('settings.oidc.adminWins')" />

                    <div class="rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-700">
                      <div class="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h4 class="text-sm font-medium">{{ $t('settings.oidc.observedTitle') }}</h4>
                          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.observedHint') }}</p>
                        </div>
                        <UBadge v-if="observedSuggestions.length" color="neutral" variant="subtle" size="sm">
                          {{ observedSuggestions.length }}
                        </UBadge>
                      </div>
                      <p v-if="!oidcConfig?.observed_groups.length" class="text-sm text-gray-500 dark:text-gray-400">
                        {{ $t('settings.oidc.observedNone') }}
                      </p>
                      <p v-else-if="!observedSuggestions.length" class="text-sm text-gray-500 dark:text-gray-400">
                        {{ $t('settings.oidc.observedAllAssigned') }}
                      </p>
                      <ul v-else class="space-y-2">
                        <li v-for="group in observedSuggestions" :key="group" class="flex flex-col gap-3 rounded-md bg-gray-50 px-3 py-3 dark:bg-gray-950/50 sm:flex-row sm:items-center sm:justify-between">
                          <code class="min-w-0 break-all text-xs sm:flex-1">{{ group }}</code>
                          <div class="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row">
                            <UButton size="sm" class="min-h-11 w-full justify-center whitespace-nowrap sm:w-auto" color="neutral" variant="outline" @click="addObservedGroup('admin_groups', group)">{{ $t('settings.oidc.addAsAdmin') }}</UButton>
                            <UButton size="sm" class="min-h-11 w-full justify-center whitespace-nowrap sm:w-auto" color="neutral" variant="ghost" @click="addObservedGroup('viewer_groups', group)">{{ $t('settings.oidc.addAsViewer') }}</UButton>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <UCheckbox v-model="oidcForm.allow_unmatched_viewer" :label="$t('settings.oidc.allowUnmatchedViewer')" />
                    <p class="-mt-4 pl-7 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.unmatchedHint') }}</p>
                  </div>
                </section>
              </div>

              <div class="space-y-6">
                <section class="rounded-xl border border-gray-200 bg-default p-4 sm:p-6 dark:border-gray-800">
                  <div class="mb-5 flex items-start gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                      <UIcon name="i-lucide-lock-keyhole" class="size-5" />
                    </div>
                    <div>
                      <h3 class="font-semibold">{{ $t('settings.oidc.securitySection') }}</h3>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.securityHint') }}</p>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <UCheckbox v-model="oidcForm.allow_http_issuer" :label="$t('settings.oidc.allowHttpIssuer')" />
                    <p class="-mt-3 pl-7 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.allowHttpHint') }}</p>
                    <div class="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 dark:bg-gray-950/60 dark:text-gray-300">
                      <p class="font-medium text-gray-800 dark:text-gray-100">{{ $t('settings.oidc.secretStorageTitle') }}</p>
                      <p class="mt-1">{{ $t('settings.oidc.secretStorageHint') }}</p>
                    </div>
                  </div>
                </section>

                <section class="rounded-xl border border-gray-200 bg-default p-4 sm:p-6 dark:border-gray-800">
                  <div class="mb-4 flex items-center gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <UIcon name="i-lucide-radio-tower" class="size-5" />
                    </div>
                    <div>
                      <h3 class="font-semibold">{{ $t('settings.oidc.connectionSection') }}</h3>
                      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.connectionHint') }}</p>
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
                        <ul v-if="checkResult.warnings?.length" class="space-y-1 border-t border-gray-200/70 pt-2 text-xs dark:border-gray-700/70">
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
                  <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">{{ $t('settings.oidc.checkNoLogin') }}</p>
                </section>
              </div>
            </div>
          </template>
          <div v-else-if="loadingOidc" class="flex items-center gap-3 rounded-xl border border-gray-200 bg-default p-6 text-sm text-gray-500 dark:border-gray-800">
            <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
            {{ $t('common.loading') }}
          </div>
        </div>
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import type { OidcCheckResultDto, OidcConfigDto } from '../../types/oidc'

const toast = useToast()
const { t, setLocale } = useI18n()
useHead({ title: t('settings.title') })
const { user } = useAuth()
const { settings, fetch: fetchSettings, update: updateSettings } = useSettings()
const { update: updateUser, changePassword: changePasswordApi } = useUsers()
const { getConfig, saveConfig: saveOidcConfig, checkSavedConfig } = useOidc()

const savingGeneral = ref(false)
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
const isAdmin = computed(() => user.value?.role === 'admin')

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
    'id_token_invalid'
  ]
  const code = checkResult.value?.code
  if (!code || !safeCodes.includes(code)) return t('settings.oidc.checkFailedDescription')
  return t(`settings.oidc.checkErrors.${code}`)
})

const tabs = computed(() => {
  const items = [] as Array<{ label: string, slot: 'general' | 'account' | 'authentication' }>
  if (isAdmin.value) items.push({ label: t('common.general'), slot: 'general' })
  items.push({ label: t('common.account'), slot: 'account' })
  if (isAdmin.value) items.push({ label: t('settings.oidc.tab'), slot: 'authentication' })
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
  language: 'en'
})

const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

const dirtyTracker = computed(() => ({ ...generalForm, ...accountForm, ...passwordForm, ...oidcForm }))
const { clearDirty } = useUnsavedChanges(dirtyTracker)

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
  if (!isAdmin.value) return
  loadingOidc.value = true
  oidcLoadError.value = false
  try {
    const config = await getConfig()
    applyOidcConfig(config)
  } catch {
    oidcLoadError.value = true
  } finally {
    loadingOidc.value = false
  }
}

async function saveGeneral() {
  savingGeneral.value = true
  try {
    await updateSettings({
      app_name: generalForm.app_name,
      default_port_status: generalForm.default_port_status as 'disabled' | 'up' | 'down',
      patch_panels_enabled: generalForm.patch_panels_enabled,
      switch_groups_enabled: generalForm.switch_groups_enabled
    })
    clearDirty()
    toast.add({ title: t('settings.messages.updated'), color: 'success' })
  } catch {
    toast.add({ title: t('errors.serverError'), color: 'error' })
  } finally {
    savingGeneral.value = false
  }
}

async function saveAccount() {
  if (!user.value) return
  savingProfile.value = true
  try {
    await updateUser(user.value.id, {
      display_name: accountForm.display_name,
      language: accountForm.language as 'en' | 'de'
    })
    await setLocale(accountForm.language as 'en' | 'de')
    Object.assign(user.value, { display_name: accountForm.display_name, language: accountForm.language })
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
  if (!oidcConfig.value?.callback_url) return
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
  if (!oidcDirty.value) return
  savingOidc.value = true
  try {
    const config = await saveOidcConfig(buildOidcPayload())
    applyOidcConfig(config)
    checkResult.value = null
    clearDirty()
    toast.add({ title: t('settings.oidc.saved'), color: 'success' })
  } catch {
    // API validation/provider responses may include sensitive request context; keep this generic.
    toast.add({ title: t('settings.oidc.saveFailed'), color: 'error' })
  } finally {
    savingOidc.value = false
  }
}

async function checkOidc() {
  if (oidcDirty.value || !oidcLoaded.value) return
  checkingOidc.value = true
  checkResult.value = null
  try {
    checkResult.value = await checkSavedConfig()
  } catch {
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

onMounted(async () => {
  await fetchSettings()
  if (settings.value) {
    generalForm.app_name = settings.value.app_name || 'ezSWM'
    generalForm.default_port_status = settings.value.default_port_status || 'down'
    generalForm.patch_panels_enabled = settings.value.patch_panels_enabled ?? false
    generalForm.switch_groups_enabled = settings.value.switch_groups_enabled ?? true
  }
  if (user.value) {
    accountForm.display_name = user.value.display_name || ''
    accountForm.language = user.value.language || 'en'
  }
  await loadOidcConfig()
  await nextTick()
  clearDirty()
})
</script>
