<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  Bold,
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-vue-next'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import UnderlineExtension from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'

import { uploadCommonFile } from '@/api/common'
import { Button } from '@/components/ui/button'

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  minHeightClass?: string
  imageMaxSizeMb?: number
}>(), {
  modelValue: '',
  placeholder: '请输入内容',
  disabled: false,
  minHeightClass: 'min-h-56',
  imageMaxSizeMb: 5,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)

const editor = useEditor({
  content: props.modelValue || '<p></p>',
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      horizontalRule: false,
    }),
    UnderlineExtension,
    Image.configure({
      HTMLAttributes: {
        class: 'rounded-[var(--radius-lg)] border border-border/60 shadow-sm',
      },
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: {
        class: 'text-primary underline underline-offset-2',
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
  ],
  editorProps: {
    attributes: {
      class: 'min-h-full w-full text-sm leading-7 text-foreground outline-none',
      'data-placeholder': props.placeholder,
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

const linkButtonLabel = computed(() => editor.value?.isActive('link') ? '取消链接' : '链接')
const imageButtonLabel = computed(() => uploadingImage.value ? '上传中...' : '图片')

watch(() => props.modelValue, (value) => {
  const instance = editor.value
  if (!instance) {
    return
  }

  const nextValue = value?.trim() ? value : '<p></p>'
  if (instance.getHTML() !== nextValue) {
    instance.commands.setContent(nextValue, { emitUpdate: false })
  }
})

watch(() => props.disabled, (value) => {
  editor.value?.setEditable(!value)
}, { immediate: true })

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function isDisabled(command?: () => boolean) {
  if (props.disabled || !editor.value) {
    return true
  }
  return command ? !command() : false
}

function buttonClass(active = false, danger = false) {
  if (danger) {
    return 'text-destructive hover:text-destructive/80'
  }
  return active ? 'bg-accent text-accent-foreground' : ''
}

function resolveUploadedUrl(payload: Record<string, any>) {
  const raw = String(payload?.url ?? payload?.fileName ?? payload?.imgUrl ?? '').trim()
  if (!raw) {
    return ''
  }
  if (/^(https?:|data:|blob:)/i.test(raw)) {
    return raw
  }
  const base = String(import.meta.env.VITE_APP_BASE_API ?? '').trim()
  if (!base) {
    return raw
  }
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`
}
function ensureImageFile(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) {
    toast.warning('请选择 JPG、PNG、GIF、WEBP 或 SVG 图片')
    return false
  }
  if (props.imageMaxSizeMb > 0 && file.size / 1024 / 1024 > props.imageMaxSizeMb) {
    toast.warning(`图片大小不能超过 ${props.imageMaxSizeMb} MB`)
    return false
  }
  return true
}

function toggleBold() {
  editor.value?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  editor.value?.chain().focus().toggleItalic().run()
}

function toggleUnderline() {
  editor.value?.chain().focus().toggleUnderline().run()
}

function setParagraph() {
  editor.value?.chain().focus().setParagraph().run()
}

function toggleHeading(level: 1 | 2 | 3) {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

function toggleBlockquote() {
  editor.value?.chain().focus().toggleBlockquote().run()
}

function toggleCodeBlock() {
  editor.value?.chain().focus().toggleCodeBlock().run()
}

function toggleBulletList() {
  editor.value?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList() {
  editor.value?.chain().focus().toggleOrderedList().run()
}

function undo() {
  editor.value?.chain().focus().undo().run()
}

function redo() {
  editor.value?.chain().focus().redo().run()
}

function clearFormatting() {
  editor.value?.chain().focus().clearNodes().unsetAllMarks().run()
}

function toggleLink() {
  const instance = editor.value
  if (!instance || props.disabled) {
    return
  }

  if (instance.isActive('link')) {
    instance.chain().focus().unsetLink().run()
    return
  }

  const url = window.prompt('请输入链接地址', 'https://')?.trim()
  if (!url) {
    return
  }

  instance.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function chooseImage() {
  if (props.disabled || uploadingImage.value) {
    return
  }
  fileInputRef.value?.click()
}

async function uploadImage(file: File) {
  if (!ensureImageFile(file) || !editor.value) {
    return
  }

  uploadingImage.value = true
  try {
    const formData = new FormData()
    formData.append('file', file, file.name)
    const response = await uploadCommonFile(formData) as Record<string, any>
    const src = resolveUploadedUrl(response)
    if (!src) {
      throw new Error('上传成功，但未返回图片地址')
    }
    editor.value.chain().focus().setImage({ src, alt: file.name }).run()
    toast.success('图片上传成功')
  }
  catch (error) {
    toast.error('图片上传失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    uploadingImage.value = false
  }
}

async function handleImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await uploadImage(file)
  }
  input.value = ''
}
</script>
<template>
  <div class="space-y-3">
    <input
      ref="fileInputRef"
      class="hidden"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
      @change="handleImageChange"
    >

    <div class="flex flex-wrap gap-1 rounded-[var(--radius-lg)] border border-border/60 bg-muted/15 p-1.5">
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="isDisabled(() => editor?.can().chain().focus().undo().run() ?? false)" @click="undo">
        <Undo2 class="size-3.5" />
        撤销
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="isDisabled(() => editor?.can().chain().focus().redo().run() ?? false)" @click="redo">
        <Redo2 class="size-3.5" />
        重做
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('bold'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleBold().run() ?? false)" @click="toggleBold">
        <Bold class="size-3.5" />
        加粗
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('italic'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleItalic().run() ?? false)" @click="toggleItalic">
        <Italic class="size-3.5" />
        斜体
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('underline'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleUnderline().run() ?? false)" @click="toggleUnderline">
        <Underline class="size-3.5" />
        下划线
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('paragraph'))" :disabled="isDisabled(() => editor?.can().chain().focus().setParagraph().run() ?? false)" @click="setParagraph">
        正文
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('heading', { level: 1 }))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleHeading({ level: 1 }).run() ?? false)" @click="toggleHeading(1)">
        <Heading1 class="size-3.5" />
        标题 1
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('heading', { level: 2 }))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleHeading({ level: 2 }).run() ?? false)" @click="toggleHeading(2)">
        <Heading2 class="size-3.5" />
        标题 2
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('heading', { level: 3 }))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleHeading({ level: 3 }).run() ?? false)" @click="toggleHeading(3)">
        <Heading3 class="size-3.5" />
        标题 3
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('blockquote'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleBlockquote().run() ?? false)" @click="toggleBlockquote">
        <Quote class="size-3.5" />
        引用
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('codeBlock'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleCodeBlock().run() ?? false)" @click="toggleCodeBlock">
        <Code2 class="size-3.5" />
        代码块
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('bulletList'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleBulletList().run() ?? false)" @click="toggleBulletList">
        <List class="size-3.5" />
        无序列表
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('orderedList'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleOrderedList().run() ?? false)" @click="toggleOrderedList">
        <ListOrdered class="size-3.5" />
        有序列表
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('link'))" :disabled="isDisabled(() => editor?.can().chain().focus().extendMarkRange('link').run() ?? false)" @click="toggleLink">
        <Link2 class="size-3.5" />
        {{ linkButtonLabel }}
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="props.disabled || uploadingImage" @click="chooseImage">
        <ImagePlus class="size-3.5" />
        {{ imageButtonLabel }}
      </Button>
      <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(false, true)" :disabled="isDisabled()" @click="clearFormatting">
        <Eraser class="size-3.5" />
        清除格式
      </Button>
    </div>

    <div class="admin-rich-editor rounded-[var(--radius-xl)] border border-border/60 bg-background px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring/20" :class="minHeightClass">
      <EditorContent v-if="editor" :editor="editor" class="surface-scrollbar h-full w-full overflow-y-auto" />
    </div>
  </div>
</template>
<style scoped>
.admin-rich-editor {
  display: flex;
}

.admin-rich-editor :deep(.tiptap) {
  min-height: 100%;
}

.admin-rich-editor :deep(.tiptap p),
.admin-rich-editor :deep(.tiptap h1),
.admin-rich-editor :deep(.tiptap h2),
.admin-rich-editor :deep(.tiptap h3),
.admin-rich-editor :deep(.tiptap blockquote),
.admin-rich-editor :deep(.tiptap pre) {
  margin: 0 0 0.75rem;
}

.admin-rich-editor :deep(.tiptap h1) {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
}

.admin-rich-editor :deep(.tiptap h2) {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.35;
}

.admin-rich-editor :deep(.tiptap h3) {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
}

.admin-rich-editor :deep(.tiptap p:last-child),
.admin-rich-editor :deep(.tiptap h1:last-child),
.admin-rich-editor :deep(.tiptap h2:last-child),
.admin-rich-editor :deep(.tiptap h3:last-child),
.admin-rich-editor :deep(.tiptap blockquote:last-child),
.admin-rich-editor :deep(.tiptap pre:last-child) {
  margin-bottom: 0;
}

.admin-rich-editor :deep(.tiptap ul),
.admin-rich-editor :deep(.tiptap ol) {
  margin: 0.75rem 0;
  padding-left: 1.25rem;
}

.admin-rich-editor :deep(.tiptap li > p) {
  margin: 0;
}

.admin-rich-editor :deep(.tiptap blockquote) {
  border-left: 3px solid hsl(var(--primary) / 0.35);
  color: hsl(var(--muted-foreground));
  padding-left: 1rem;
}

.admin-rich-editor :deep(.tiptap pre) {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  background: hsl(var(--muted) / 0.45);
  border: 1px solid hsl(var(--border));
  padding: 0.875rem 1rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.875rem;
  line-height: 1.7;
}

.admin-rich-editor :deep(.tiptap code) {
  border-radius: calc(var(--radius) - 2px);
  background: hsl(var(--muted) / 0.55);
  padding: 0.15rem 0.35rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.875em;
}

.admin-rich-editor :deep(.tiptap pre code) {
  background: transparent;
  padding: 0;
}

.admin-rich-editor :deep(.tiptap img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0.75rem 0;
}

.admin-rich-editor :deep(.tiptap .ProseMirror-selectednode) {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.admin-rich-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: hsl(var(--muted-foreground));
  float: left;
  height: 0;
  pointer-events: none;
}
</style>