<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

// Initialize editor with content
const editor = useEditor({
  content: props.modelValue || "",
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
        "prose prose-sm dark:prose-invert max-w-none min-h-[200px] px-4 py-3 focus:outline-none",
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

onMounted(() => {
  if (props.modelValue && unref(editor)) {
    unref(editor).commands.setContent(props.modelValue);
  }
});

onBeforeUnmount(() => {
  unref(editor)?.destroy();
});
</script>

<template>
  <div class="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
    <!-- Toolbar -->
    <div
      v-if="editor"
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
        <UIcon name="i-heroicons-list-bullet" />
        <span class="text-xs">List</span>
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
        <UIcon name="i-heroicons-check-circle" />
        <span class="text-xs">Tasks</span>
      </button>
    </div>

    <!-- Editor Content -->
    <TiptapEditorContent :editor="editor" />
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
