<script setup lang="ts">
interface Buddy {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roleType: string | null;
  preferredName: string | null;
  pronouns: string | null;
  communicationPreferences: string | null;
}

defineProps<{
  buddy: Buddy;
}>();

const getRoleLabel = (roleType: string | null) => {
  if (!roleType) return null;
  const labels: Record<string, string> = {
    dev: "Developer",
    design: "Designer",
    qa: "QA",
  };
  return labels[roleType] || roleType;
};

const getAvatarUrl = (buddy: Buddy) => {
  if (buddy.avatarUrl) return buddy.avatarUrl;
  const name = buddy.preferredName || buddy.name || buddy.email;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`;
};
</script>

<template>
  <NuxtLink :to="`/buddies/${buddy.id}`">
    <UCard
      class="hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary/30 cursor-pointer h-full"
    >
      <div class="space-y-4">
        <!-- Header with Avatar and Name -->
        <div class="flex items-start gap-4">
          <UAvatar
            :src="getAvatarUrl(buddy)"
            :alt="buddy.name"
            size="lg"
            class="flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {{ buddy.preferredName || buddy.name }}
              </h3>
              <span
                v-if="buddy.pronouns"
                class="text-sm text-gray-500 dark:text-gray-400"
              >
                ({{ buddy.pronouns }})
              </span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ buddy.email }}
            </p>
            <UBadge
              v-if="buddy.roleType"
              :label="getRoleLabel(buddy.roleType) || undefined"
              color="primary"
              variant="subtle"
              size="sm"
              class="mt-2"
            />
          </div>
        </div>

        <!-- Communication Preferences -->
        <div v-if="buddy.communicationPreferences" class="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            Communication Preferences
          </p>
          <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {{ buddy.communicationPreferences }}
          </p>
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>
