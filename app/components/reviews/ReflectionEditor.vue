<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null;
  label: string;
  icon?: string;
  placeholder?: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

// Initialize editor with content
const editor = useEditor({
  content: props.modelValue || "",
  editable: !props.readonly,
  extensions: [
    TiptapStarterKit,
    TiptapTaskList,
    TiptapTaskItem.configure({
      nested: true,
    }),
  ],
  editorProps: {
    attributes: {
      class:
        "prose prose-sm dark:prose-invert max-w-none min-h-[120px] px-4 py-3 focus:outline-none",
    },
  },
  onUpdate: ({ editor }) => {
    emit("update:modelValue", editor.getHTML());
  },
});

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    const currentValue = unref(editor)?.getHTML();
    if (newValue !== currentValue && newValue !== null) {
      unref(editor)?.commands.setContent(newValue);
    }
  }
);

// Watch for readonly changes
watch(
  () => props.readonly,
  (newValue) => {
    unref(editor)?.setEditable(!newValue);
  }
);

onMounted(() => {
  if (props.modelValue && unref(editor)) {
    unref(editor)?.commands.setContent(props.modelValue);
  }
});

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});
</script>

<template>
  <div class="space-y-2">
    <!-- Label -->
    <div class="flex items-start gap-3 mb-3">
      <div class="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
        <UIcon v-if="icon" :name="icon" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <div class="pt-1">
        <label class="text-base font-semibold text-gray-900 dark:text-white block">
          {{ label }}
        </label>
        <p v-if="placeholder" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {{ placeholder }}
        </p>
      </div>
    </div>

    <!-- Editor Container -->
    <div 
      class="border rounded-lg overflow-hidden transition-colors"
      :class="[
        readonly 
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50' 
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus-within:border-primary-500 dark:focus-within:border-primary-400'
      ]"
    >
      <!-- Toolbar (only show when editable) -->
      <div
        v-if="editor && !readonly"
        class="flex flex-wrap gap-1 p-2 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
      >
        <!-- Bold -->
        <button
          type="button"
          :disabled="!editor.can().chain().focus().toggleBold().run()"
          :class="[
            'px-2 py-1 rounded text-sm font-semibold transition-colors',
            editor.isActive('bold')
              ? 'bg-primary text-white'
              : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
          @click="editor.chain().focus().toggleBold().run()"
        >
          B
        </button>

        <!-- Italic -->
        <button
          type="button"
          :disabled="!editor.can().chain().focus().toggleItalic().run()"
          :class="[
            'px-2 py-1 rounded text-sm italic transition-colors',
            editor.isActive('italic')
              ? 'bg-primary text-white'
              : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          I
        </button>

        <!-- Divider -->
        <div class="w-px bg-gray-300 dark:bg-gray-600 mx-1"/>

        <!-- Bullet List -->
        <button
          type="button"
          :class="[
            'px-2 py-1 rounded text-sm transition-colors flex items-center gap-1',
            editor.isActive('bulletList')
              ? 'bg-primary text-white'
              : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <UIcon name="i-heroicons-list-bullet" class="w-4 h-4" />
        </button>

        <!-- Task List -->
        <button
          type="button"
          :class="[
            'px-2 py-1 rounded text-sm transition-colors flex items-center gap-1',
            editor.isActive('taskList')
              ? 'bg-primary text-white'
              : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
          ]"
          @click="editor.chain().focus().toggleTaskList().run()"
        >
          <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
        </button>
      </div>

      <!-- Editor Content -->
      <TiptapEditorContent :editor="editor" />
      
      <!-- Empty state placeholder -->
      <div 
        v-if="readonly && !modelValue" 
        class="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 italic"
      >
        No content yet
      </div>
    </div>
  </div>
</template>

<style>
/* Task list styling */
.ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
}

.ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: start;
  gap: 0.5rem;
}

.ProseMirror ul[data-type="taskList"] li > label {
  flex: 0 0 auto;
  margin-top: 0.125rem;
  user-select: none;
}

.ProseMirror ul[data-type="taskList"] li > div {
  flex: 1 1 auto;
}

.ProseMirror ul[data-type="taskList"] li > div > p {
  margin: 0;
}

.ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
  cursor: pointer;
  width: 1rem;
  height: 1rem;
}

/* Regular bullet/numbered lists */
.ProseMirror ul:not([data-type="taskList"]) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.ProseMirror ul:not([data-type="taskList"]) li,
.ProseMirror ol li {
  margin: 0.25rem 0;
  padding-left: 0.25rem;
}

/* General prose styling */
.ProseMirror {
  outline: none;
}

.ProseMirror p {
  margin: 0.5rem 0;
}

.ProseMirror p:first-child {
  margin-top: 0;
}

.ProseMirror p:last-child {
  margin-bottom: 0;
}
</style>
