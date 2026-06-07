<script setup lang="ts">
definePageMeta({ layout: "default" });

type FieldType = "long_text" | "multiple_choice" | "section";

interface Field {
  id: string;
  type: FieldType;
  label: string;
  helpText?: string;
  required: boolean;
  options?: string[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  fields: Field[];
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const templateId = computed(() => route.params.id as string);
const isNew = computed(() => templateId.value === "new");

useHead({ title: isNew.value ? "New Review Template" : "Edit Review Template" });

const name = ref("");
const description = ref("");
const isDefault = ref(false);
const fields = ref<Field[]>([]);
const saving = ref(false);
const loading = ref(true);

const typeOptions = [
  { label: "Long text", value: "long_text" as const },
  { label: "Multiple choice", value: "multiple_choice" as const },
  { label: "Section header", value: "section" as const },
];

const typeLabel = (type: FieldType) =>
  typeOptions.find((t) => t.value === type)?.label ?? type;

const addField = (type: FieldType) => {
  fields.value.push({
    id: crypto.randomUUID(),
    type,
    label: "",
    helpText: "",
    required: false,
    options: type === "multiple_choice" ? [""] : undefined,
  });
};

const removeField = (index: number) => fields.value.splice(index, 1);

const move = (index: number, delta: number) => {
  const target = index + delta;
  if (target < 0 || target >= fields.value.length) return;
  const copy = [...fields.value];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item!);
  fields.value = copy;
};

const addOption = (field: Field) => {
  field.options = [...(field.options ?? []), ""];
};

const removeOption = (field: Field, i: number) => {
  field.options?.splice(i, 1);
};

const setOption = (field: Field, i: number, value: string) => {
  if (!field.options) return;
  field.options[i] = value;
};

const load = async () => {
  loading.value = true;
  try {
    if (isNew.value) {
      fields.value = [];
      return;
    }
    const data = await $api<{ success: boolean; template: Template }>(
      `/admin/review-templates/${templateId.value}`,
    );
    const t = data.template;
    name.value = t.name;
    description.value = t.description ?? "";
    isDefault.value = t.isDefault;
    fields.value = t.fields;
  } catch (e) {
    console.error("Failed to load template:", e);
  } finally {
    loading.value = false;
  }
};

const validate = (): string | null => {
  if (!name.value.trim()) return "Template name is required";
  for (const f of fields.value) {
    if (!f.label.trim()) return "Every field needs a label";
    if (f.type === "multiple_choice") {
      const opts = (f.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (opts.length === 0) return `"${f.label}" needs at least one option`;
    }
  }
  return null;
};

const save = async () => {
  const err = validate();
  if (err) {
    toast.add({ title: err, color: "error", icon: "i-heroicons-x-circle" });
    return;
  }
  saving.value = true;

  const payloadFields = fields.value.map((f) => ({
    id: f.id,
    type: f.type,
    label: f.label.trim(),
    helpText: f.helpText?.trim() || undefined,
    required: f.required,
    options:
      f.type === "multiple_choice"
        ? (f.options ?? []).map((o) => o.trim()).filter(Boolean)
        : undefined,
  }));

  try {
    if (isNew.value) {
      await $api("/admin/review-templates", {
        method: "POST",
        body: {
          name: name.value.trim(),
          description: description.value || null,
          fields: payloadFields,
        },
      });
    } else {
      await $api(`/admin/review-templates/${templateId.value}`, {
        method: "PATCH",
        body: {
          name: name.value.trim(),
          description: description.value || null,
          fields: payloadFields,
        },
      });
    }
    toast.add({
      title: "Template saved",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
    router.push("/admin/review-templates");
  } catch (e) {
    console.error("Failed to save template:", e);
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <UDashboardPanel id="admin-review-template-editor">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2 max-w-3xl">
        <div class="mb-6">
          <UButton variant="link" icon="i-heroicons-arrow-left" to="/admin/review-templates">
            Back to templates
          </UButton>
        </div>

        <div v-if="loading" class="py-12 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>

        <template v-else>
          <div class="space-y-4 mb-8">
            <UFormField label="Template name" required>
              <UInput
                v-model="name"
                placeholder="e.g. Developer"
                :disabled="isDefault"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Description">
              <UInput
                v-model="description"
                placeholder="Optional, shown to admins"
                class="w-full"
              />
            </UFormField>
            <p v-if="isDefault" class="text-sm text-amber-600 dark:text-amber-400">
              This is the default template. You can edit its fields, but it cannot be renamed or
              archived.
            </p>
          </div>

          <h2 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Fields</h2>

          <div class="space-y-4">
            <UCard v-for="(field, index) in fields" :key="field.id">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 space-y-3">
                  <UBadge color="neutral" variant="subtle">
                    {{ typeLabel(field.type) }}
                  </UBadge>

                  <UFormField :label="field.type === 'section' ? 'Heading' : 'Question'">
                    <UInput v-model="field.label" placeholder="Enter label" class="w-full" />
                  </UFormField>

                  <UFormField label="Help text">
                    <UInput
                      v-model="field.helpText"
                      placeholder="Optional guidance"
                      class="w-full"
                    />
                  </UFormField>

                  <template v-if="field.type === 'multiple_choice'">
                    <UFormField label="Options">
                      <div class="space-y-2">
                        <div
                          v-for="(option, oi) in field.options"
                          :key="oi"
                          class="flex items-center gap-2"
                        >
                          <UInput
                            :model-value="option"
                            placeholder="Option"
                            class="flex-1"
                            @update:model-value="setOption(field, oi, String($event))"
                          />
                          <UButton
                            variant="ghost"
                            color="error"
                            icon="i-heroicons-x-mark"
                            @click="removeOption(field, oi)"
                          />
                        </div>
                        <UButton
                          variant="soft"
                          size="xs"
                          icon="i-heroicons-plus"
                          @click="addOption(field)"
                        >
                          Add option
                        </UButton>
                      </div>
                    </UFormField>
                  </template>

                  <UCheckbox
                    v-if="field.type !== 'section'"
                    v-model="field.required"
                    label="Required"
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <UButton
                    variant="ghost"
                    icon="i-heroicons-chevron-up"
                    :disabled="index === 0"
                    @click="move(index, -1)"
                  />
                  <UButton
                    variant="ghost"
                    icon="i-heroicons-chevron-down"
                    :disabled="index === fields.length - 1"
                    @click="move(index, 1)"
                  />
                  <UButton
                    variant="ghost"
                    color="error"
                    icon="i-heroicons-trash"
                    @click="removeField(index)"
                  />
                </div>
              </div>
            </UCard>

            <p v-if="!fields.length" class="text-sm text-gray-500 dark:text-gray-400">
              No fields yet. Add one below.
            </p>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <UButton variant="soft" icon="i-heroicons-plus" @click="addField('long_text')">
              Long text
            </UButton>
            <UButton variant="soft" icon="i-heroicons-plus" @click="addField('multiple_choice')">
              Multiple choice
            </UButton>
            <UButton variant="soft" icon="i-heroicons-plus" @click="addField('section')">
              Section header
            </UButton>
          </div>

          <div class="mt-8 flex justify-end gap-3">
            <UButton variant="ghost" to="/admin/review-templates">Cancel</UButton>
            <UButton color="primary" :loading="saving" @click="save">Save template</UButton>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
