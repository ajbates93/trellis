<script setup lang="ts">
import type { User } from "~/types";

interface Props {
  modelValue?: string;
  placeholder?: string;
}

interface Emits {
  (e: "update:modelValue", userId: string): void;
  (e: "user-selected", user: User): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Select a user...",
  modelValue: undefined,
});
const emit = defineEmits<Emits>();

// Fetch all users
const { data: userData } = await useFetch("/api/users");

const users = computed(() => userData.value?.users || []);

const selectedUser = computed(() => {
  return users.value.find((u: User) => u.id === props.modelValue);
});

// Handle user selection from dropdown
const handleUserSelect = (user: User) => {
  emit("update:modelValue", user.id);
  emit("user-selected", user);
};

// Get avatar for user
const getUserAvatar = (user: User): string | undefined => {
  return user.avatarUrl || user.image || undefined;
};
</script>

<template>
  <ClientOnly>
    <USelectMenu
      v-if="users.length > 0"
      :model-value="selectedUser"
      :items="users"
      label-key="name"
      searchable
      :placeholder="placeholder"
      class="w-full"
      @update:model-value="(user) => handleUserSelect(user)"
    >
      <template #leading="{ modelValue: selectedValue, ui }">
        <UAvatar
          v-if="selectedValue"
          :src="getUserAvatar(selectedValue)"
          :alt="selectedValue.name"
          :size="ui.leadingAvatarSize()"
          :class="ui.leadingAvatar()"
        />
      </template>

      <template #item="{ item: user }">
        <div class="flex items-center gap-2">
          <UAvatar :src="getUserAvatar(user)" :alt="user.name" size="xs" />
          <div class="flex flex-col">
            <span class="font-medium">{{ user.name }}</span>
            <span class="text-xs text-gray-400">{{ user.email }}</span>
          </div>
        </div>
      </template>

      <template #empty>
        <p class="text-sm text-gray-400 px-2 py-1.5">No users found.</p>
      </template>
    </USelectMenu>

    <!-- Show message if no users -->
    <div v-else class="text-sm text-gray-400">No users available.</div>
  </ClientOnly>
</template>
