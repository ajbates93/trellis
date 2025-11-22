<script setup lang="ts">
import type { User } from "#auth-utils";

interface BuddyUser extends Partial<User> {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  image?: string;
}

interface Props {
  buddyId?: string;
}

interface Emits {
  (e: "buddy-selected", buddyId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Fetch buddies
const { data: buddyData } = await useFetch("/api/users/my-buddies");

const buddies = computed(() => buddyData.value?.users || []);

const selectedBuddy = computed(() => {
  return buddies.value.find((b: BuddyUser) => b.id === props.buddyId);
});

const route = useRoute();
const router = useRouter();

// Whenever props.buddyId changes, update URL
watch(
  () => props.buddyId,
  (newId) => {
    if (newId && newId !== route.query.buddyId) {
      router.push({
        query: {
          ...route.query,
          buddyId: newId,
        },
      });
    }
  }
);

// Handle buddy selection from dropdown
const handleBuddySelect = (buddyId: string) => {
  emit("buddy-selected", buddyId);
};

// Get avatar for buddy
const getBuddyAvatar = (buddy: BuddyUser) => {
  return buddy.avatarUrl || buddy.image;
};
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-sm text-gray-400">Viewing:</span>
    <USelectMenu
      v-if="buddies.length > 0 && selectedBuddy"
      :model-value="selectedBuddy"
      :options="buddies"
      option-attribute="name"
      searchable
      @update:model-value="(buddy) => handleBuddySelect(buddy.id)"
    >
      <template #label>
        <div class="flex items-center gap-2">
          <UAvatar
            :src="getBuddyAvatar(selectedBuddy)"
            :alt="selectedBuddy.name"
            size="xs"
          />
          <span class="truncate">{{ selectedBuddy.name }}</span>
        </div>
      </template>

      <template #option="{ option: buddy }">
        <div class="flex items-center gap-2">
          <UAvatar
            :src="getBuddyAvatar(buddy)"
            :alt="buddy.name"
            size="xs"
          />
          <div class="flex flex-col">
            <span class="font-medium">{{ buddy.name }}</span>
            <span class="text-xs text-gray-400">{{ buddy.email }}</span>
          </div>
        </div>
      </template>
    </USelectMenu>

    <!-- Show message if no buddies -->
    <div v-else class="text-sm text-gray-400">
      You don't have any buddies assigned yet.
    </div>
  </div>
</template>
