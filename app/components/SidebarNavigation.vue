<script setup lang="ts">
interface NavItem {
  label: string;
  icon?: string;
  to?: string;
  active?: boolean;
  badge?: string;
  children?: NavItem[];
  requiresAdmin?: boolean;
}

interface Props {
  dashboardLink: NavItem;
  personalLinks: NavItem[];
  buddyLinks: NavItem[];
  settingsAndAdminLinks: NavItem[];
  hasBuddies: boolean;
  collapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
});

// Track which parent items are expanded
const expandedItems = ref<Set<string>>(new Set());

const toggleExpanded = (label: string) => {
  if (expandedItems.value.has(label)) {
    expandedItems.value.delete(label);
  } else {
    expandedItems.value.add(label);
  }
};

const isExpanded = (label: string) => {
  return expandedItems.value.has(label);
};

// Helper to check if item or any of its children are active
const isItemOrChildActive = (item: NavItem): boolean => {
  if (item.active) return true;
  if (item.children) {
    return item.children.some((child) => child.active);
  }
  return false;
};
</script>

<template>
  <nav class="flex flex-col h-full w-full">
    <!-- Dashboard Link (top level) -->
    <div class="space-y-1 mb-2">
      <NuxtLink
        :to="dashboardLink.to || '#'"
        class="flex items-center gap-3 px-4 py-1.5 rounded-lg transition-colors duration-200"
        :class="[
          dashboardLink.active
            ? 'bg-primary/10 text-primary-600 dark:text-primary-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        ]"
        :title="collapsed ? dashboardLink.label : undefined"
      >
        <UIcon
          v-if="dashboardLink.icon"
          :name="dashboardLink.icon"
          class="w-5 h-5 flex-shrink-0"
        />
        <span v-if="!collapsed" class="flex-1 text-sm font-medium">
          {{ dashboardLink.label }}
        </span>
      </NuxtLink>
    </div>

    <!-- Personal Section -->
    <div class="space-y-1">
      <!-- Section Header (only show if user has buddies) -->
      <div
        v-if="hasBuddies"
        class="px-4 py-2 mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      >
        <span v-if="!collapsed">Personal</span>
      </div>

      <!-- Personal Links -->
      <div class="space-y-1">
        <template v-for="item in personalLinks" :key="item.label">
          <!-- Items with children (collapsible) -->

          <!-- Items without children (direct links) -->
          <NuxtLink
            :to="item.to || '#'"
            class="flex items-center gap-3 px-4 py-1.5 rounded-lg transition-colors duration-200"
            :class="[
              item.active
                ? 'bg-primary/10 text-primary-600 dark:text-primary-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            ]"
            :title="collapsed ? item.label : undefined"
          >
            <UIcon
              v-if="item.icon"
              :name="item.icon"
              class="w-5 h-5 flex-shrink-0"
            />
            <span v-if="!collapsed" class="flex-1 text-sm font-medium">
              {{ item.label }}
            </span>
            <UBadge
              v-if="item.badge && !collapsed"
              :label="item.badge"
              size="xs"
              color="primary"
            />
          </NuxtLink>
        </template>
      </div>
    </div>

    <!-- Buddy Section (only show if user has buddies) -->
    <div v-if="hasBuddies" class="space-y-1 mt-6">
      <!-- Section Header -->
      <div
        class="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      >
        <span v-if="!collapsed">Buddy</span>
      </div>

      <!-- Buddy Links -->
      <div class="space-y-1">
        <NuxtLink
          v-for="item in buddyLinks"
          :key="item.label"
          :to="item.to || '#'"
          class="flex items-center gap-3 px-4 py-1.5 rounded-lg transition-colors duration-200"
          :class="[
            item.active
              ? 'bg-primary/10 text-primary-600 dark:text-primary-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          ]"
          :title="collapsed ? item.label : undefined"
        >
          <UIcon
            v-if="item.icon"
            :name="item.icon"
            class="w-5 h-5 flex-shrink-0"
          />
          <span v-if="!collapsed" class="flex-1 text-sm font-medium">
            {{ item.label }}
          </span>
          <UBadge
            v-if="item.badge && !collapsed"
            :label="item.badge"
            size="xs"
            color="primary"
          />
        </NuxtLink>
      </div>
    </div>

    <!-- Spacer to push settings to bottom -->
    <div class="flex-1" />

    <!-- Settings and Admin Section -->
    <div class="space-y-1 border-t border-gray-200 dark:border-gray-800 pt-4">
      <div class="space-y-1">
        <template v-for="item in settingsAndAdminLinks" :key="item.label">
          <!-- Items with children (collapsible) -->
          <div v-if="item.children && item.children.length > 0">
            <!-- Parent item -->
            <button
              class="w-full flex items-center gap-3 px-4 py-1.5 rounded-lg transition-colors duration-200"
              :class="[
                isItemOrChildActive(item)
                  ? 'bg-primary/10 text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              ]"
              :title="collapsed ? item.label : undefined"
              @click="toggleExpanded(item.label)"
            >
              <UIcon
                v-if="item.icon"
                :name="item.icon"
                class="w-5 h-5 flex-shrink-0"
              />
              <span
                v-if="!collapsed"
                class="flex-1 text-left text-sm font-medium"
              >
                {{ item.label }}
              </span>
              <UIcon
                v-if="!collapsed && item.children"
                :name="
                  isExpanded(item.label)
                    ? 'i-heroicons-chevron-down'
                    : 'i-heroicons-chevron-right'
                "
                class="w-4 h-4 flex-shrink-0"
              />
            </button>

            <!-- Children (shown when expanded) -->
            <transition
              enter-active-class="transition-all duration-200"
              leave-active-class="transition-all duration-200"
              enter-from-class="max-h-0 opacity-0"
              enter-to-class="max-h-96 opacity-100"
              leave-from-class="max-h-96 opacity-100"
              leave-to-class="max-h-0 opacity-0"
            >
              <div
                v-if="isExpanded(item.label)"
                class="space-y-1 overflow-hidden"
              >
                <NuxtLink
                  v-for="child in item.children"
                  :key="child.label"
                  :to="child.to || '#'"
                  class="flex items-center gap-3 px-4 py-1 rounded-lg text-sm transition-colors duration-200 ml-4"
                  :class="[
                    child.active
                      ? 'bg-primary/10 text-primary-600 dark:text-primary-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                  ]"
                  :title="collapsed ? child.label : undefined"
                >
                  <span class="flex-1">{{ child.label }}</span>
                </NuxtLink>
              </div>
            </transition>
          </div>

          <!-- Items without children (direct links) -->
          <NuxtLink
            v-else
            :to="item.to || '#'"
            class="flex items-center gap-3 px-4 py-1.5 rounded-lg transition-colors duration-200"
            :class="[
              item.active
                ? 'bg-primary/10 text-primary-600 dark:text-primary-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            ]"
            :title="collapsed ? item.label : undefined"
          >
            <UIcon
              v-if="item.icon"
              :name="item.icon"
              class="w-5 h-5 flex-shrink-0"
            />
            <span v-if="!collapsed" class="flex-1 text-sm font-medium">
              {{ item.label }}
            </span>
          </NuxtLink>
        </template>
      </div>
    </div>
  </nav>
</template>
