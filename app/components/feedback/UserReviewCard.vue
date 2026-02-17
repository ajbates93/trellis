<script setup lang="ts">
defineProps<{
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    avatarUrl?: string | null;
    roleType?: string | null;
  };
  isReviewedThisWeek: boolean;
  lastReviewedText: string;
  isSelected: boolean;
  roleColor?: string;
}>();

defineEmits<{
  select: [];
}>();

const getRoleLabel = (roleType: string | null | undefined) => {
  if (!roleType) return null;
  const labels: Record<string, string> = {
    dev: "Developer",
    design: "Designer",
    qa: "QA",
    growth: "Growth",
    management: "Management",
  };
  return labels[roleType] || roleType;
};
</script>

<template>
  <button
    class="relative text-left w-full rounded-xl border transition-all duration-200 group overflow-hidden cursor-pointer"
    :class="[
      isSelected
        ? 'ring ring-primary-500 border-primary-500/50 dark:border-primary-500/50 bg-primary-500/5 dark:bg-primary-500/10 shadow-lg shadow-primary-500/10'
        : 'border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800/70 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/5 dark:hover:shadow-black/20 hover:-translate-y-0.5',
    ]"
    @click="$emit('select')"
  >
    <!-- Top accent bar -->
    <div
      class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary-500 to-teal-500 opacity-0 transition-opacity duration-200"
      :class="[isSelected ? 'opacity-100' : 'group-hover:opacity-60']"
    />

    <div class="p-4">

      <div class="flex items-center gap-3">
        <div class="relative flex-shrink-0">
          <UAvatar
            :src="user.image || user.avatarUrl || undefined"
            :alt="user.name"
            size="lg"
          />
        </div>

        <div class="min-w-0 flex-1">
          <p
            class="font-semibold text-gray-900 dark:text-white truncate text-sm"
          >
            {{ user.name }}
          </p>
          <p
            v-if="user.roleType"
            class="text-xs mt-0.5"
            :class="roleColor || 'text-gray-500'"
          >
            {{ getRoleLabel(user.roleType) }}
          </p>
          <p
            v-if="lastReviewedText"
            class="text-[11px] mt-1 text-gray-400 dark:text-gray-500"
          >
            {{ lastReviewedText }}
          </p>
        </div>

        <!-- Arrow on hover -->
        <UIcon
          name="i-heroicons-chevron-right"
          class="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0"
        />
      </div>
    </div>
  </button>
</template>
