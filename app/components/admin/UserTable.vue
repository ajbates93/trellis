<template>
  <div>
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin text-4xl text-gray-400"
      />
    </div>

    <div
      v-else-if="error"
      class="flex items-center justify-center py-12 text-red-500"
    >
      <p>Failed to load users</p>
    </div>

    <div v-else>
      <UTable
        :data="users"
        :columns="columns"
        :loading="loading"
        :empty-state="{ icon: 'i-heroicons-users', label: 'No users found' }"
      >
        <!-- Avatar + Name -->
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <UAvatar
              :src="row.original.avatarUrl || row.original.image"
              :alt="row.original.name"
              size="sm"
            />
            <div>
              <div class="font-medium text-gray-900 dark:text-white">
                {{ row.original.name }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ row.original.email }}
              </div>
            </div>
          </div>
        </template>

        <!-- Role Badge -->
        <template #role-cell="{ row }">
          <UBadge
            :color="row.original.role === 'admin' ? 'primary' : 'neutral'"
            variant="subtle"
            class="capitalize"
          >
            {{ row.original.role }}
          </UBadge>
        </template>

        <!-- Role Type -->
        <template #roleType-cell="{ row }">
          <span
            v-if="row.original.roleType"
            class="text-sm text-gray-700 dark:text-gray-300 capitalize"
          >
            {{ row.original.roleType }}
          </span>
          <span v-else class="text-sm text-gray-400 dark:text-gray-500">—</span>
        </template>

        <!-- Buddy -->
        <template #buddyName-cell="{ row }">
          <span
            v-if="row.original.buddyName"
            class="text-sm text-gray-700 dark:text-gray-300"
          >
            {{ row.original.buddyName }}
          </span>
          <span v-else class="text-sm text-gray-400 dark:text-gray-500"
            >No buddy</span
          >
        </template>

        <!-- Status Badge -->
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'active' ? 'success' : 'warning'"
            variant="subtle"
            class="capitalize"
          >
            {{ row.original.status }}
          </UBadge>
        </template>

        <!-- Actions -->
        <template #actions-cell="{ row }">
          <UDropdown :items="getActionItems(row.original)" :popper="{ placement: 'bottom-end' }">
            <UButton
              icon="i-heroicons-ellipsis-vertical"
              size="sm"
              color="neutral"
              variant="ghost"
              class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            />
          </UDropdown>
        </template>
      </UTable>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  users: any[];
  loading: boolean;
  error: boolean;
}>();

const emit = defineEmits<{
  edit: [user: any];
  impersonate: [user: any];
}>();

const { user: currentUser } = useAuth();

const columns = [
  { id: "name", accessorKey: "name", header: "User" },
  { id: "role", accessorKey: "role", header: "Role" },
  { id: "roleType", accessorKey: "roleType", header: "Job Role" },
  { id: "buddyName", accessorKey: "buddyName", header: "Buddy" },
  { id: "status", accessorKey: "status", header: "Status" },
  { id: "actions", header: "" },
];

const getActionItems = (user: any) => {
  const items = [
    {
      label: "Edit",
      icon: "i-heroicons-pencil-square",
      click: () => emit("edit", user),
    },
  ];

  // Only show impersonate option if it's not the current user
  if (user.id !== currentUser.value?.id) {
    items.push({
      label: "Impersonate",
      icon: "i-heroicons-user-circle",
      click: () => emit("impersonate", user),
    });
  }

  return [items];
};
</script>
