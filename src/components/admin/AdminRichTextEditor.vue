<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  ChevronDown,
  Code2,
  Eraser,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo2,
  Table2,
  Underline,
  Undo2,
  Video,
} from 'lucide-vue-next'
import { Node, mergeAttributes } from '@tiptap/core'
import CharacterCount from '@tiptap/extension-character-count'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import UnderlineExtension from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'

import { uploadCommonFile } from '@/api/common'
import AdminDialogContent from '@/components/admin/AdminDialogContent.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { themePresets } from '@/theme/presets'
import { buildVideoEmbedHtml, prepareRichHtml, resolveRichAssetUrl, sanitizeRichHtml } from '@/utils/rich-html'

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const TEXT_COLORS = [
  { label: '危险红', value: '#dc2626' },
  { label: '橙色', value: '#ea580c' },
  { label: '金色', value: '#ca8a04' },
  { label: '绿色', value: '#16a34a' },
  { label: '蓝色', value: '#2563eb' },
  { label: '紫色', value: '#7c3aed' },
  { label: '粉色', value: '#db2777' },
  { label: '深灰', value: '#0f172a' },
  { label: '石板灰', value: '#475569' },
] as const
const HIGHLIGHT_COLORS = [
  { label: '亮黄', value: '#fef08a' },
  { label: '暖黄', value: '#fde68a' },
  { label: '浅蓝', value: '#bfdbfe' },
  { label: '浅绿', value: '#bbf7d0' },
  { label: '浅粉', value: '#fecdd3' },
  { label: '浅紫', value: '#e9d5ff' },
] as const

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  minHeightClass?: string
  imageMaxSizeMb?: number
  characterLimit?: number
}>(), {
  modelValue: '',
  placeholder: '请输入内容',
  disabled: false,
  minHeightClass: 'min-h-56',
  imageMaxSizeMb: 5,
  characterLimit: 5000,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: '' },
      title: { default: '视频内容' },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-embed-video]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false
          }
          const iframe = element.querySelector('iframe')
          return {
            src: iframe?.getAttribute('src') ?? '',
            title: iframe?.getAttribute('title') ?? '视频内容',
          }
        },
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ class: 'rich-video-embed', 'data-embed-video': 'true' }), ['iframe', mergeAttributes({
      src: HTMLAttributes.src,
      title: HTMLAttributes.title || '视频内容',
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      allowfullscreen: 'true',
      frameborder: '0',
      referrerpolicy: 'strict-origin-when-cross-origin',
    })]]
  },
})

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadingImage = ref(false)
const currentUploadMode = ref<'editor' | 'dialog'>('editor')
const activeTab = ref('edit')
const customTextColor = ref('#2563eb')
const customHighlightColor = ref('#fef08a')
const linkDialogOpen = ref(false)
const imageDialogOpen = ref(false)
const tableDialogOpen = ref(false)
const videoDialogOpen = ref(false)

const linkForm = reactive({
  url: '',
  text: '',
  newTab: true,
})

const imageForm = reactive({
  src: '',
  alt: '',
  title: '',
})

const tableForm = reactive({
  rows: 3,
  cols: 3,
  withHeaderRow: true,
})

const videoForm = reactive({
  url: '',
})

const editor = useEditor({
  content: props.modelValue || '<p></p>',
  editable: !props.disabled,
  extensions: [
    StarterKit,
    UnderlineExtension,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right'],
      defaultAlignment: 'left',
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount.configure({ limit: props.characterLimit }),
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
    VideoEmbed,
  ],
  editorProps: {
    transformPastedHTML: html => sanitizeRichHtml(html),
    attributes: {
      class: 'min-h-full w-full text-sm leading-7 text-foreground outline-none rich-html-content',
      'data-placeholder': props.placeholder,
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

const previewHtml = computed(() => prepareRichHtml(props.modelValue || '<p></p>'))
const characterCount = computed(() => editor.value?.storage.characterCount.characters() ?? 0)
const characterCountLabel = computed(() => props.characterLimit > 0 ? `${characterCount.value} / ${props.characterLimit}` : String(characterCount.value))
const linkButtonLabel = computed(() => editor.value?.isActive('link') ? '编辑链接' : '链接')
const imageButtonLabel = computed(() => uploadingImage.value ? '上传中...' : '图片')
const canOperateTable = computed(() => Boolean(editor.value?.isActive('table')))
const currentTextColor = computed(() => String(editor.value?.getAttributes('textStyle')?.color ?? '').trim().toLowerCase())
const currentHighlightColor = computed(() => String(editor.value?.getAttributes('highlight')?.color ?? '').trim().toLowerCase())
const presetTextColors = computed(() => {
  const seen = new Set<string>()
  const entries = [
    ...TEXT_COLORS,
    ...themePresets.flatMap(item => [
      { label: `${item.name} 主色`, value: item.light.primary },
      { label: `${item.name} 点缀`, value: item.light.accent },
      { label: `${item.name} 暗主色`, value: item.dark.primary },
      { label: `${item.name} 暗点缀`, value: item.dark.accent },
    ]),
  ]

  return entries.filter((item) => {
    const key = item.value.toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
})

const presetHighlightColors = computed(() => {
  const seen = new Set<string>()
  return HIGHLIGHT_COLORS.filter((item) => {
    const key = item.value.toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
})

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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

function getSelectedText() {
  const instance = editor.value
  if (!instance) {
    return ''
  }
  const { from, to, empty } = instance.state.selection
  if (empty) {
    return ''
  }
  return instance.state.doc.textBetween(from, to, ' ').trim()
}

function isValidLinkUrl(value: string) {
  try {
    const url = new URL(value, typeof window === 'undefined' ? 'http://localhost' : window.location.origin)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) || value.startsWith('#')
  }
  catch {
    return false
  }
}

function resolveUploadedUrl(payload: Record<string, any>) {
  const raw = String(payload?.url ?? payload?.fileName ?? payload?.imgUrl ?? '').trim()
  return raw ? resolveRichAssetUrl(raw) : ''
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

function toggleTaskList() {
  editor.value?.chain().focus().toggleTaskList().run()
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

function setTextAlign(alignment: 'left' | 'center' | 'right') {
  editor.value?.chain().focus().setTextAlign(alignment).run()
}

function setColor(value: string) {
  customTextColor.value = value
  editor.value?.chain().focus().setColor(value).run()
}

function applyCustomTextColor() {
  setColor(customTextColor.value)
}

function clearColor() {
  editor.value?.chain().focus().unsetColor().run()
}

function setHighlight(value: string) {
  customHighlightColor.value = value
  editor.value?.chain().focus().toggleHighlight({ color: value }).run()
}

function applyCustomHighlight() {
  setHighlight(customHighlightColor.value)
}

function clearHighlight() {
  editor.value?.chain().focus().unsetHighlight().run()
}

function insertHorizontalRule() {
  editor.value?.chain().focus().setHorizontalRule().run()
}

function openLinkDialog() {
  const instance = editor.value
  if (!instance || props.disabled) {
    return
  }

  const attrs = instance.getAttributes('link')
  linkForm.url = String(attrs.href ?? '')
  linkForm.text = getSelectedText()
  linkForm.newTab = String(attrs.target ?? '_blank') !== '_self'
  linkDialogOpen.value = true
}

function closeLinkDialog() {
  linkDialogOpen.value = false
  linkForm.url = ''
  linkForm.text = ''
  linkForm.newTab = true
}

function removeLink() {
  editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
  closeLinkDialog()
}

function applyLink() {
  const instance = editor.value
  const href = linkForm.url.trim()
  if (!instance || !href) {
    toast.warning('请输入链接地址')
    return
  }
  if (!isValidLinkUrl(href)) {
    toast.warning('链接地址无效，仅支持 http、https、mailto 或 tel')
    return
  }

  const target = linkForm.newTab ? '_blank' : '_self'
  const selectionText = getSelectedText()
  const nextText = linkForm.text.trim() || selectionText || href
  const shouldReplaceText = instance.state.selection.empty || Boolean(linkForm.text.trim())

  if (shouldReplaceText) {
    instance.chain().focus().insertContent(`<a href="${escapeHtml(href)}" target="${target}" rel="noopener noreferrer nofollow">${escapeHtml(nextText)}</a>`).run()
  }
  else {
    instance.chain().focus().extendMarkRange('link').setLink({ href, target, rel: 'noopener noreferrer nofollow' }).run()
  }
  closeLinkDialog()
}

function openImageDialog() {
  if (props.disabled) {
    return
  }
  imageDialogOpen.value = true
}

function closeImageDialog() {
  imageDialogOpen.value = false
  imageForm.src = ''
  imageForm.alt = ''
  imageForm.title = ''
}

function chooseImage(mode: 'editor' | 'dialog' = 'editor') {
  if (props.disabled || uploadingImage.value) {
    return
  }
  currentUploadMode.value = mode
  if (mode === 'dialog') {
    imageDialogOpen.value = true
  }
  fileInputRef.value?.click()
}

async function uploadImage(file: File) {
  if (!ensureImageFile(file)) {
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

    if (currentUploadMode.value === 'dialog') {
      imageForm.src = src
      imageForm.alt = imageForm.alt || file.name
      imageForm.title = imageForm.title || file.name
      toast.success('图片上传成功')
      return
    }

    editor.value?.chain().focus().setImage({ src, alt: file.name, title: file.name }).run()
    toast.success('图片上传成功')
  }
  catch (error) {
    toast.error('图片上传失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    uploadingImage.value = false
    currentUploadMode.value = 'editor'
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

function applyImage() {
  if (!imageForm.src.trim()) {
    toast.warning('请先上传图片或输入图片地址')
    return
  }
  editor.value?.chain().focus().setImage({
    src: resolveRichAssetUrl(imageForm.src.trim()),
    alt: imageForm.alt.trim(),
    title: imageForm.title.trim(),
  }).run()
  closeImageDialog()
}

function openTableDialog() {
  if (props.disabled) {
    return
  }
  tableDialogOpen.value = true
}

function closeTableDialog() {
  tableDialogOpen.value = false
  tableForm.rows = 3
  tableForm.cols = 3
  tableForm.withHeaderRow = true
}

function applyTable() {
  const rows = Math.max(2, Number(tableForm.rows) || 2)
  const cols = Math.max(2, Number(tableForm.cols) || 2)
  editor.value?.chain().focus().insertTable({ rows, cols, withHeaderRow: tableForm.withHeaderRow }).run()
  closeTableDialog()
}

function openVideoDialog() {
  if (props.disabled) {
    return
  }
  videoDialogOpen.value = true
}

function closeVideoDialog() {
  videoDialogOpen.value = false
  videoForm.url = ''
}

function applyVideo() {
  const html = buildVideoEmbedHtml(videoForm.url)
  if (!html) {
    toast.warning('当前仅支持 YouTube、Vimeo 和哔哩哔哩视频链接')
    return
  }
  editor.value?.chain().focus().insertContent(html).run()
  closeVideoDialog()
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

    <Tabs v-model="activeTab" class="space-y-3">
      <div class="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border/60 bg-card/70 p-3 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <TabsList>
              <TabsTrigger value="edit">编辑</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye class="size-4" />
                预览
              </TabsTrigger>
            </TabsList>
            <span class="text-xs text-muted-foreground">{{ characterCountLabel }}</span>
          </div>

          <div class="text-xs text-muted-foreground">
            公告编辑支持图片、表格、任务清单和视频嵌入。
          </div>
        </div>

        <div class="admin-toolbar-surface flex flex-wrap gap-1 rounded-[var(--radius-lg)] p-1.5">
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="isDisabled(() => editor?.can().chain().focus().undo().run() ?? false)" @click="undo">
            <Undo2 class="size-3.5" />
            撤销
          </Button>
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="isDisabled(() => editor?.can().chain().focus().redo().run() ?? false)" @click="redo">
            <Redo2 class="size-3.5" />
            重做
          </Button>

          <div class="admin-divider-fade h-8 w-px" />

          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('bold'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleBold().run() ?? false)" @click="editor?.chain().focus().toggleBold().run()">
            <Bold class="size-3.5" />
            加粗
          </Button>
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('italic'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleItalic().run() ?? false)" @click="editor?.chain().focus().toggleItalic().run()">
            <Italic class="size-3.5" />
            斜体
          </Button>
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('underline'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleUnderline().run() ?? false)" @click="editor?.chain().focus().toggleUnderline().run()">
            <Underline class="size-3.5" />
            下划线
          </Button>

          <Popover>
            <PopoverTrigger as-child>
              <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('highlight'))" :disabled="isDisabled()">
                <Highlighter class="size-3.5" />
                高亮
                <ChevronDown class="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-72 space-y-4">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-medium">预设高亮</p>
                  <button type="button" class="text-xs text-muted-foreground transition hover:text-foreground" @click="clearHighlight">
                    清除高亮
                  </button>
                </div>
                <div class="grid grid-cols-6 gap-2">
                  <button
                    v-for="color in presetHighlightColors"
                    :key="color.value"
                    type="button"
                    class="size-8 rounded-lg border transition hover:scale-[1.03]"
                    :class="currentHighlightColor === color.value.toLowerCase() ? 'border-primary ring-2 ring-ring/30' : 'border-border/70'"
                    :style="{ backgroundColor: color.value }"
                    :title="color.label"
                    @click="setHighlight(color.value)"
                  />
                </div>
              </div>
              <div class="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <p class="text-sm font-medium">自定义高亮</p>
                <div class="flex items-center gap-3">
                  <input v-model="customHighlightColor" type="color" class="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1">
                  <Input v-model="customHighlightColor" class="font-mono" placeholder="#fef08a" />
                </div>
                <Button variant="outline" size="sm" class="w-full" @click="applyCustomHighlight">应用自定义高亮</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger as-child>
              <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(Boolean(currentTextColor))" :disabled="isDisabled()">
                <Palette class="size-3.5" />
                颜色
                <ChevronDown class="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-80 space-y-4">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-medium">预设色板</p>
                  <button type="button" class="text-xs text-muted-foreground transition hover:text-foreground" @click="clearColor">
                    清除颜色
                  </button>
                </div>
                <div class="grid grid-cols-8 gap-2">
                  <button
                    v-for="color in presetTextColors"
                    :key="color.label"
                    type="button"
                    class="size-8 rounded-lg border transition hover:scale-[1.03]"
                    :class="currentTextColor === color.value.toLowerCase() ? 'border-primary ring-2 ring-ring/30' : 'border-border/70'"
                    :style="{ backgroundColor: color.value }"
                    :title="`${color.label} ${color.value}`"
                    @click="setColor(color.value)"
                  />
                </div>
                <p class="text-xs text-muted-foreground">预设色板来自编辑器默认色和主题预设主色/点缀色。</p>
              </div>
              <div class="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <p class="text-sm font-medium">自定义颜色</p>
                <div class="flex items-center gap-3">
                  <input v-model="customTextColor" type="color" class="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1">
                  <Input v-model="customTextColor" class="font-mono" placeholder="#2563eb" />
                </div>
                <Button variant="outline" size="sm" class="w-full" @click="applyCustomTextColor">应用自定义颜色</Button>
              </div>
            </PopoverContent>
          </Popover>

          <div class="admin-divider-fade h-8 w-px" />

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="isDisabled()">
                段落
                <ChevronDown class="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-40">
              <DropdownMenuItem :class="buttonClass(editor?.isActive('paragraph'))" @select.prevent="setParagraph">正文</DropdownMenuItem>
              <DropdownMenuItem :class="buttonClass(editor?.isActive('heading', { level: 1 }))" @select.prevent="toggleHeading(1)">
                <Heading1 class="size-3.5" />
                标题 1
              </DropdownMenuItem>
              <DropdownMenuItem :class="buttonClass(editor?.isActive('heading', { level: 2 }))" @select.prevent="toggleHeading(2)">
                <Heading2 class="size-3.5" />
                标题 2
              </DropdownMenuItem>
              <DropdownMenuItem :class="buttonClass(editor?.isActive('heading', { level: 3 }))" @select.prevent="toggleHeading(3)">
                <Heading3 class="size-3.5" />
                标题 3
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('taskList'))" :disabled="isDisabled(() => editor?.can().chain().focus().toggleTaskList().run() ?? false)" @click="toggleTaskList">
            <CheckSquare class="size-3.5" />
            任务列表
          </Button>

          <div class="admin-divider-fade h-8 w-px" />

          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive({ textAlign: 'left' }))" :disabled="isDisabled()" @click="setTextAlign('left')">
            <AlignLeft class="size-3.5" />
            左对齐
          </Button>
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive({ textAlign: 'center' }))" :disabled="isDisabled()" @click="setTextAlign('center')">
            <AlignCenter class="size-3.5" />
            居中
          </Button>
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive({ textAlign: 'right' }))" :disabled="isDisabled()" @click="setTextAlign('right')">
            <AlignRight class="size-3.5" />
            右对齐
          </Button>
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="isDisabled(() => editor?.can().chain().focus().setHorizontalRule().run() ?? false)" @click="insertHorizontalRule">
            <Minus class="size-3.5" />
            分割线
          </Button>

          <div class="admin-divider-fade h-8 w-px" />

          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(editor?.isActive('link'))" :disabled="isDisabled()" @click="openLinkDialog">
            <Link2 class="size-3.5" />
            {{ linkButtonLabel }}
          </Button>
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="props.disabled || uploadingImage" @click="openImageDialog">
            <ImagePlus class="size-3.5" />
            {{ imageButtonLabel }}
          </Button>
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="props.disabled" @click="openVideoDialog">
            <Video class="size-3.5" />
            视频
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :disabled="props.disabled">
                <Table2 class="size-3.5" />
                表格
                <ChevronDown class="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-48">
              <DropdownMenuItem @select.prevent="openTableDialog">插入表格</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem :disabled="!canOperateTable" @select.prevent="editor?.chain().focus().addColumnBefore().run()">前插列</DropdownMenuItem>
              <DropdownMenuItem :disabled="!canOperateTable" @select.prevent="editor?.chain().focus().addColumnAfter().run()">后插列</DropdownMenuItem>
              <DropdownMenuItem :disabled="!canOperateTable" @select.prevent="editor?.chain().focus().deleteColumn().run()">删除列</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem :disabled="!canOperateTable" @select.prevent="editor?.chain().focus().addRowBefore().run()">前插行</DropdownMenuItem>
              <DropdownMenuItem :disabled="!canOperateTable" @select.prevent="editor?.chain().focus().addRowAfter().run()">后插行</DropdownMenuItem>
              <DropdownMenuItem :disabled="!canOperateTable" @select.prevent="editor?.chain().focus().deleteRow().run()">删除行</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem :disabled="!canOperateTable" @select.prevent="editor?.chain().focus().toggleHeaderRow().run()">切换表头</DropdownMenuItem>
              <DropdownMenuItem :disabled="!canOperateTable" @select.prevent="editor?.chain().focus().deleteTable().run()">删除表格</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2.5" :class="buttonClass(false, true)" :disabled="isDisabled()" @click="clearFormatting">
            <Eraser class="size-3.5" />
            清除格式
          </Button>
        </div>
      </div>

      <TabsContent value="edit">
        <div class="admin-rich-editor rounded-[var(--radius-xl)] border border-border/60 bg-background px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring/20" :class="minHeightClass">
          <EditorContent v-if="editor" :editor="editor" class="surface-scrollbar h-full w-full overflow-y-auto" />
        </div>
      </TabsContent>

      <TabsContent value="preview">
        <div class="rounded-[var(--radius-xl)] border border-border/60 bg-background px-4 py-4 shadow-sm" :class="minHeightClass">
          <div class="rich-html-content h-full text-sm leading-7 text-foreground" v-html="previewHtml" />
        </div>
      </TabsContent>
    </Tabs>
  </div>

  <Dialog v-model:open="linkDialogOpen">
    <AdminDialogContent size="md">
      <DialogHeader>
        <DialogTitle>设置链接</DialogTitle>
        <DialogDescription>支持 http、https、mailto 和 tel 链接。</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4">
        <div class="grid gap-2">
          <span class="text-sm font-medium">链接地址</span>
          <Input v-model="linkForm.url" placeholder="https://example.com" />
        </div>
        <div class="grid gap-2">
          <span class="text-sm font-medium">显示文本</span>
          <Input v-model="linkForm.text" placeholder="留空则使用选中文本或链接地址" />
        </div>
        <label class="flex items-center gap-3 rounded-[var(--radius)] border border-border/60 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
          <Checkbox :checked="linkForm.newTab" @update:checked="(value: boolean | 'indeterminate') => linkForm.newTab = Boolean(value)" />
          新窗口打开
        </label>
      </div>
      <DialogFooter class="gap-2 sm:justify-between">
        <Button variant="outline" @click="closeLinkDialog">取消</Button>
        <div class="flex gap-2">
          <Button variant="outline" :disabled="!editor?.isActive('link')" @click="removeLink">取消链接</Button>
          <Button @click="applyLink">确认</Button>
        </div>
      </DialogFooter>
    </AdminDialogContent>
  </Dialog>

  <Dialog v-model:open="imageDialogOpen">
    <AdminDialogContent size="lg">
      <DialogHeader>
        <DialogTitle>插入图片</DialogTitle>
        <DialogDescription>支持上传图片或粘贴图片地址，并补充辅助描述。</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div class="grid gap-4">
          <div class="grid gap-2">
            <span class="text-sm font-medium">图片地址</span>
            <Input v-model="imageForm.src" placeholder="上传后自动填充，或输入 https://..." />
          </div>
          <div class="grid gap-2 sm:grid-cols-2">
            <div class="grid gap-2">
              <span class="text-sm font-medium">替代文本</span>
              <Input v-model="imageForm.alt" placeholder="图片说明" />
            </div>
            <div class="grid gap-2">
              <span class="text-sm font-medium">标题</span>
              <Input v-model="imageForm.title" placeholder="鼠标悬停标题" />
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button variant="outline" :disabled="uploadingImage" @click="chooseImage('dialog')">
              <ImagePlus class="size-4" />
              {{ uploadingImage ? '上传中...' : '上传图片' }}
            </Button>
            <Button @click="applyImage">插入图片</Button>
          </div>
        </div>
        <div class="overflow-hidden rounded-[var(--radius-xl)] border border-border/60 bg-muted/20 p-3">
          <p class="mb-3 text-sm font-medium">预览</p>
          <div v-if="imageForm.src" class="flex h-full min-h-40 items-center justify-center">
            <img :src="resolveRichAssetUrl(imageForm.src)" :alt="imageForm.alt" class="max-h-56 rounded-[var(--radius-lg)] border border-border/60 object-contain shadow-sm">
          </div>
          <div v-else class="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            上传图片后在这里预览
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="closeImageDialog">取消</Button>
      </DialogFooter>
    </AdminDialogContent>
  </Dialog>

  <Dialog v-model:open="tableDialogOpen">
    <AdminDialogContent size="sm">
      <DialogHeader>
        <DialogTitle>插入表格</DialogTitle>
        <DialogDescription>首版支持基础行列和表头控制。</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-2">
            <span class="text-sm font-medium">行数</span>
            <Input v-model="tableForm.rows" type="number" min="2" max="12" />
          </div>
          <div class="grid gap-2">
            <span class="text-sm font-medium">列数</span>
            <Input v-model="tableForm.cols" type="number" min="2" max="8" />
          </div>
        </div>
        <label class="flex items-center gap-3 rounded-[var(--radius)] border border-border/60 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
          <Checkbox :checked="tableForm.withHeaderRow" @update:checked="(value: boolean | 'indeterminate') => tableForm.withHeaderRow = Boolean(value)" />
          包含表头行
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="closeTableDialog">取消</Button>
        <Button @click="applyTable">插入表格</Button>
      </DialogFooter>
    </AdminDialogContent>
  </Dialog>

  <Dialog v-model:open="videoDialogOpen">
    <AdminDialogContent size="md">
      <DialogHeader>
        <DialogTitle>嵌入视频</DialogTitle>
        <DialogDescription>当前支持 YouTube、Vimeo 和哔哩哔哩视频链接。</DialogDescription>
      </DialogHeader>
      <div class="grid gap-2">
        <span class="text-sm font-medium">视频地址</span>
        <Input v-model="videoForm.url" placeholder="https://www.youtube.com/watch?v=..." />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="closeVideoDialog">取消</Button>
        <Button @click="applyVideo">插入视频</Button>
      </DialogFooter>
    </AdminDialogContent>
  </Dialog>
</template>

<style scoped>
.admin-rich-editor {
  display: flex;
}

.admin-rich-editor :deep(.tiptap) {
  min-height: 100%;
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
