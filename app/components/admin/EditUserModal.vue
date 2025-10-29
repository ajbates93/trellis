<template>
  <UModal
    v-model:open="isOpen"
    title="Edit User"
    description="Update user role, buddy assignment, and other settings"
    :ui="{ width: 'sm:max-w-md' }"
  >
    <template #body>
      <form @submit.prevent="onSubmit" class="space-y-4">
        <!-- User Info (Read-only) -->
        <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UAvatar
            :src="localUser.avatarUrl || localUser.image"
            :alt="localUser.name"
            size="sm"
          />
          <div>
            <div class="font-medium text-gray-900 dark:text-white">
              {{ localUser.name }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ localUser.email }}
            </div>
          </div>
        </div>

        <!-- Admin Role -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Admin Role <span class="text-red-500">*</span>
          </label>
          <USelectMenu
            v-model="localUser.role"
            :options="roleOptions"
            placeholder="Select role"
            class="w-full"
          />
        </div>

        <!-- Job Role -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Job Role
          </label>
          <USelectMenu
            v-model="localUser.roleType"
            :options="roleTypeOptions"
            placeholder="Select job role"
            class="w-full"
          />
        </div>

        <!-- Buddy Assignment -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Buddy
          </label>
          <USelectMenu
            v-model="localUser.buddyId"
            :options="buddyOptions"
            placeholder="Select buddy"
            value-attribute="value"
            option-attribute="label"
            class="w-full"
          >
            <template #leading>
              <UIcon name="i-heroicons-user-group" class="text-gray-400" />
            </template>
          </USelectMenu>
        </div>

        <!-- Next Review Date -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Next Review Date
          </label>
          <UInput
            v-model="localUser.nextReviewDate"
            type="date"
            icon="i-heroicons-calendar"
            class="w-full"
          />
        </div>

        <!-- Error Message -->
        <UAlert
          v-if="errorMessage"
          color="red"
          variant="subtle"
          :title="errorMessage"
          icon="i-heroicons-exclamation-triangle"
        />
      </form>
    </template>

    <template #footer>
      <UButton
        color="gray"
        variant="ghost"
        @click="close"
        :disabled="saving"
      >
        Cancel
      </UButton>
      <UButton
        color="primary"
        :loading="saving"
        @click="onSubmit"
      >
        Save Changes
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  user: any;
  allUsers: any[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  success: [];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit("update:modelValue", value);
    if (!value) {
      // Modal closed, reset form
      setTimeout(() => {
        errorMessage.value = "";
      }, 300);
    }
  },
});

const errorMessage = ref("");

const saving = ref(false);
const localUser = ref({
  id: "",
  name: "",
  email: "",
  role: "user",
  roleType: null as string | null,
  buddyId: null as string | null,
  nextReviewDate: null as string | null,
  avatarUrl: null as string | null,
  image: null as string | null,
});

// Watch for user prop changes
watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      localUser.value = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || "user",
        roleType: newUser.roleType,
        buddyId: newUser.buddyId,
        nextReviewDate: newUser.nextReviewDate
          ? new Date(newUser.nextReviewDate).toISOString().split("T")[0]
          : null,
        avatarUrl: newUser.avatarUrl,
        image: newUser.image,
      };
    }
  },
  { immediate: true }
);

const roleOptions = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const roleTypeOptions = [
  { value: null, label: "None" },
  { value: "dev", label: "Developer" },
  { value: "design", label: "Designer" },
  { value: "qa", label: "QA" },
  { value: "growth", label: "Growth" },
];

const buddyOptions = computed(() => {
  return [
    { value: null, label: "No buddy" },
    ...props.allUsers
      .filter((u) => u.id !== localUser.value.id)
      .map((u) => ({
        value: u.id,
        label: u.name,
      })),
  ];
});

const close = () => {
  isOpen.value = false;
};

const onSubmit = async () => {
  errorMessage.value = "";
  saving.value = true;
  try {
    // Extract value property if object, otherwise use as-is
    const roleValue = typeof localUser.value.role === 'object' && localUser.value.role !== null
      ? (localUser.value.role as any).value
      : localUser.value.role;

    const roleTypeValue = typeof localUser.value.roleType === 'object' && localUser.value.roleType !== null
      ? (localUser.value.roleType as any).value
      : localUser.value.roleType;

    const buddyIdValue = typeof localUser.value.buddyId === 'object' && localUser.value.buddyId !== null
      ? (localUser.value.buddyId as any).value
      : localUser.value.buddyId;

    await $fetch(`/api/admin/users/${localUser.value.id}`, {
      method: "PATCH",
      body: {
        role: roleValue,
        roleType: roleTypeValue,
        buddyId: buddyIdValue,
        nextReviewDate: localUser.value.nextReviewDate,
      },
    });

    emit("success");
    close();
  } catch (error: any) {
    console.error("Failed to update user:", error);
    errorMessage.value = error.data?.message || "Failed to update user";
  } finally {
    saving.value = false;
  }
};
</script>
