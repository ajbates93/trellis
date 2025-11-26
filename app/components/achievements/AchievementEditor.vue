<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null | undefined
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Initialize editor with content
const editor = useEditor({
  content: props.modelValue ? props.modelValue : '<p></p>',
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
        'prose prose-sm dark:prose-invert max-w-none min-h-[150px] px-4 py-3 focus:outline-none',
    },
  },
  onUpdate: ({ editor: editorInstance }) => {
    emit('update:modelValue', editorInstance.getHTML())
  },
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    const currentEditor = unref(editor)
    if (currentEditor) {
      const currentValue = currentEditor.getHTML()
      if (newValue !== currentValue && newValue !== null && newValue !== undefined) {
        currentEditor.commands.setContent(newValue)
      }
    }
  }
)

onMounted(() => {
  const currentEditor = unref(editor)
  if (props.modelValue && currentEditor) {
    currentEditor.commands.setContent(props.modelValue)
  }
})

onBeforeUnmount(() => {
  unref(editor)?.destroy()
})
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
            ? 'bg-teal-500 text-white'
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
            ? 'bg-teal-500 text-white'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
        ]"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        I
      </button>

      <!-- Separator -->
      <div class="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

      <!-- Heading 1 -->
      <button
        type="button"
        :disabled="!editor.can().chain().focus().toggleHeading({ level: 1 }).run()"
        :class="[
          'px-2 py-1 rounded text-sm font-bold transition-colors',
          editor.isActive('heading', { level: 1 })
            ? 'bg-teal-500 text-white'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
        ]"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        H1
      </button>

      <!-- Bullet List -->
      <button
        type="button"
        :disabled="!editor.can().chain().focus().toggleBulletList().run()"
        :class="[
          'px-2 py-1 rounded text-sm transition-colors',
          editor.isActive('bulletList')
            ? 'bg-teal-500 text-white'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
        ]"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        •
      </button>

      <!-- Ordered List -->
      <button
        type="button"
        :disabled="!editor.can().chain().focus().toggleOrderedList().run()"
        :class="[
          'px-2 py-1 rounded text-sm transition-colors',
          editor.isActive('orderedList')
            ? 'bg-teal-500 text-white'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
        ]"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        1.
      </button>

      <!-- Code -->
      <button
        type="button"
        :disabled="!editor.can().chain().focus().toggleCode().run()"
        :class="[
          'px-2 py-1 rounded text-sm font-mono transition-colors',
          editor.isActive('code')
            ? 'bg-teal-500 text-white'
            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
        ]"
        @click="editor.chain().focus().toggleCode().run()"
      >
        &lt;&gt;
      </button>

      <!-- Separator -->
      <div class="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

      <!-- Clear -->
      <button
        type="button"
        :class="[
          'px-2 py-1 rounded text-sm transition-colors',
          'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
        ]"
        @click="editor.chain().focus().clearNodes().run()"
      >
        Clear
      </button>
    </div>

    <!-- Editor -->
    <EditorContent :editor="editor" />
  </div>
</template>
