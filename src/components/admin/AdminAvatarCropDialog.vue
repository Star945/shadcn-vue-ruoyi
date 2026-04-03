<script setup lang="ts">
import 'vue-cropper/dist/index.css'

import { computed, nextTick, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { ImageUp, Minus, Plus, RotateCcw, RotateCw } from 'lucide-vue-next'
import { VueCropper } from 'vue-cropper'

import { uploadAvatar } from '@/api/system/user'
import AdminDialogContent from '@/components/admin/AdminDialogContent.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AvatarUploadSuccessPayload {
  imageUrl: string
  raw: Record<string, any>
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  imageUrl?: string
  title?: string
  sizeLimitMb?: number
}>(), {
  imageUrl: '',
  title: '修改头像',
  sizeLimitMb: 5,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', payload: AvatarUploadSuccessPayload): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const cropper = ref<any>(null)
const cropperVisible = ref(false)
const preparing = ref(false)
const submitting = ref(false)

const cropState = reactive({
  image: '',
  filename: 'avatar.png',
  outputType: 'png',
  autoCrop: true,
  autoCropWidth: 200,
  autoCropHeight: 200,
  fixedBox: true,
  previews: {} as Record<string, any>,
})

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const previewUrl = computed(() => String(cropState.previews?.url ?? cropState.image ?? ''))
const previewStyle = computed(() => cropState.previews?.img ?? {})

function resolveAvatarUrl(value: unknown) {
  const raw = String(value ?? '').trim()
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

function resetState(useInitialImage = true) {
  cropperVisible.value = false
  preparing.value = false
  cropState.previews = {}
  cropState.image = useInitialImage ? props.imageUrl || '' : ''
  cropState.filename = 'avatar.png'
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function prepareCropper() {
  cropperVisible.value = false
  preparing.value = true
  await nextTick()
  requestAnimationFrame(() => {
    cropperVisible.value = true
    preparing.value = false
  })
}

watch(() => props.modelValue, async (value) => {
  if (value) {
    resetState(true)
    await prepareCropper()
    return
  }
  resetState(true)
})

watch(() => props.imageUrl, (value) => {
  if (!props.modelValue) {
    cropState.image = value || ''
  }
})

function chooseImage() {
  if (submitting.value) {
    return
  }
  fileInput.value?.click()
}

function ensureImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    toast.warning('请选择图片文件')
    return false
  }
  if (props.sizeLimitMb > 0 && file.size / 1024 / 1024 > props.sizeLimitMb) {
    toast.warning(`图片大小不能超过 ${props.sizeLimitMb} MB`)
    return false
  }
  return true
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  if (!ensureImageFile(file)) {
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = async () => {
    cropState.image = String(reader.result ?? '')
    cropState.filename = file.name || 'avatar.png'
    cropState.previews = {}
    await prepareCropper()
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function handleRealtime(data: Record<string, any>) {
  cropState.previews = data
}

function rotateLeft() {
  cropper.value?.rotateLeft()
}

function rotateRight() {
  cropper.value?.rotateRight()
}

function changeScale(num: number) {
  cropper.value?.changeScale(num)
}

function getCropBlob() {
  return new Promise<Blob>((resolve, reject) => {
    const instance = cropper.value
    if (!instance) {
      reject(new Error('裁剪器尚未准备好'))
      return
    }
    instance.getCropBlob((data: Blob | null) => {
      if (!data) {
        reject(new Error('未获取到裁剪结果'))
        return
      }
      resolve(data)
    })
  })
}

async function submitCrop() {
  if (!cropState.image) {
    toast.warning('请先选择头像图片')
    return
  }

  submitting.value = true
  try {
    const blob = await getCropBlob()
    const formData = new FormData()
    formData.append('avatarfile', blob, cropState.filename || 'avatar.png')
    const response = await uploadAvatar(formData) as Record<string, any>
    const nextUrl = resolveAvatarUrl(response?.imgUrl ?? response?.url ?? '')
    emit('success', { imageUrl: nextUrl, raw: response })
    toast.success('头像上传成功')
    open.value = false
  }
  catch (error) {
    toast.error('头像上传失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <AdminDialogContent size="4xl" scroll="viewport" centered>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>选择图片后可裁剪、缩放和旋转。</DialogDescription>
      </DialogHeader>

      <input ref="fileInput" class="hidden" type="file" accept="image/*" @change="handleFileChange" />

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div class="space-y-4">
          <div class="avatar-crop-stage rounded-[var(--radius-xl)] border border-border/60 p-3">
            <div v-if="preparing || !cropperVisible" class="flex h-full items-center justify-center text-sm text-muted-foreground">
              正在准备裁剪区域...
            </div>
            <VueCropper
              v-else
              ref="cropper"
              :img="cropState.image"
              :info="true"
              :auto-crop="cropState.autoCrop"
              :auto-crop-width="cropState.autoCropWidth"
              :auto-crop-height="cropState.autoCropHeight"
              :fixed-box="cropState.fixedBox"
              :output-type="cropState.outputType"
              @real-time="handleRealtime"
            />
          </div>

          <div class="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" @click="chooseImage">
              <ImageUp class="size-4" />
              选择
            </Button>
            <Button variant="outline" size="sm" @click="changeScale(1)">
              <Plus class="size-4" />
              放大
            </Button>
            <Button variant="outline" size="sm" @click="changeScale(-1)">
              <Minus class="size-4" />
              缩小
            </Button>
            <Button variant="outline" size="sm" @click="rotateLeft">
              <RotateCcw class="size-4" />
              左转
            </Button>
            <Button variant="outline" size="sm" @click="rotateRight">
              <RotateCw class="size-4" />
              右转
            </Button>
          </div>
        </div>

        <div class="space-y-4">
          <div class="rounded-[var(--radius-xl)] border border-border/60 bg-muted/15 p-5">
            <p class="text-sm font-medium">头像预览</p>
            <div class="mt-5 flex justify-center">
              <div class="avatar-crop-preview rounded-full border border-border/60 bg-background shadow-sm">
                <img v-if="previewUrl" :src="previewUrl" :style="previewStyle" alt="头像预览" />
                <div v-else class="flex h-full items-center justify-center text-xs text-muted-foreground">请选择图片</div>
              </div>
            </div>
          </div>

          <div class="rounded-[var(--radius-xl)] border border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
            <p>支持 JPG、PNG、GIF、WEBP 等图片格式。</p>
            <p class="mt-2">建议选择清晰的方形图片，预览效果更稳定。</p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">取消</Button>
        <Button :disabled="submitting || preparing || !cropState.image" @click="submitCrop">{{ submitting ? '提交中...' : '提交' }}</Button>
      </DialogFooter>
    </AdminDialogContent>
  </Dialog>
</template>

<style scoped>
.avatar-crop-stage {
  height: min(52vh, 420px);
  background-color: #f5f5f5;
  background-image:
    linear-gradient(45deg, rgba(0, 0, 0, 0.06) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(0, 0, 0, 0.06) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.06) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.06) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
}

.avatar-crop-stage :deep(.vue-cropper) {
  height: 100%;
  background: transparent;
}

.avatar-crop-stage :deep(.cropper-box),
.avatar-crop-stage :deep(.cropper-face) {
  border-radius: calc(var(--radius-lg) + 2px);
}

.avatar-crop-preview {
  position: relative;
  width: 200px;
  height: 200px;
  overflow: hidden;
}

.avatar-crop-preview img {
  display: block;
  max-width: none;
}

@media (max-width: 640px) {
  .avatar-crop-stage {
    height: 320px;
  }

  .avatar-crop-preview {
    width: 160px;
    height: 160px;
  }
}
</style>
