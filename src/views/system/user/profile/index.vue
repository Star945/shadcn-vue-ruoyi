<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'

import { getUserProfile, updateUserProfile, updateUserPwd } from '@/api/system/user'
import AdminAvatarCropDialog from '@/components/admin/AdminAvatarCropDialog.vue'
import AdminFormField from '@/components/admin/AdminFormField.vue'
import AdminSectionCard from '@/components/admin/AdminSectionCard.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const session = useSessionStore()

const loading = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)
const activeTab = ref(route.params.activeTab === 'password' || route.query.tab === 'password' ? 'password' : 'profile')
const avatarUrl = ref('')
const avatarCropOpen = ref(false)
const roleGroup = ref('--')
const postGroup = ref('--')
const profile = ref<Record<string, any>>({})

const profileForm = reactive({
  nickName: '',
  phonenumber: '',
  email: '',
  sex: '0',
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const securityHints = computed(() => {
  const hints: string[] = []
  if (profile.value.isDefaultModifyPwd) {
    hints.push('当前仍在使用默认密码，建议尽快修改。')
  }
  if (profile.value.isPasswordExpired) {
    hints.push('当前密码已过期，请立即更新密码。')
  }
  return hints
})

const deptLabel = computed(() => {
  const deptName = String(profile.value.dept?.deptName ?? '')
  return [deptName, postGroup.value].filter(Boolean).join(' / ') || '--'
})

const avatarFallback = computed(() => {
  const source = String(profile.value.nickName || profile.value.userName || session.user.name || 'RY').trim()
  return source.slice(0, 2).toUpperCase() || 'RY'
})

const summaryItems = computed(() => ([
  { label: '登录账号', value: profile.value.userName || '--' },
  { label: '手机号码', value: profile.value.phonenumber || '--' },
  { label: '邮箱地址', value: profile.value.email || '--' },
  { label: '所属部门', value: deptLabel.value },
  { label: '所属角色', value: roleGroup.value || '--' },
  { label: '创建时间', value: profile.value.createTime || '--' },
]))

function resolveAvatarUrl(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return ''
  }
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw
  }
  const base = String(import.meta.env.VITE_APP_BASE_API ?? '')
  if (!base) {
    return raw
  }
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`
}

async function loadProfile() {
  loading.value = true
  try {
    const response = await getUserProfile()
    profile.value = {
      ...(response.data ?? {}),
      isDefaultModifyPwd: response.isDefaultModifyPwd ?? false,
      isPasswordExpired: response.isPasswordExpired ?? false,
    }
    roleGroup.value = String(response.roleGroup ?? '--') || '--'
    postGroup.value = String(response.postGroup ?? '--') || '--'
    avatarUrl.value = resolveAvatarUrl(response.data?.avatar)
    profileForm.nickName = String(response.data?.nickName ?? '')
    profileForm.phonenumber = String(response.data?.phonenumber ?? '')
    profileForm.email = String(response.data?.email ?? '')
    profileForm.sex = String(response.data?.sex ?? '0')
  }
  catch (error) {
    toast.error('个人资料加载失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    loading.value = false
  }
}

function validateProfileForm() {
  if (!profileForm.nickName.trim()) {
    toast.warning('请输入用户昵称')
    return false
  }
  if (profileForm.phonenumber && !/^1[3-9]\d{9}$/.test(profileForm.phonenumber)) {
    toast.warning('请输入正确的手机号码')
    return false
  }
  if (profileForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
    toast.warning('请输入正确的邮箱地址')
    return false
  }
  return true
}

async function submitProfile() {
  if (!validateProfileForm()) {
    return
  }

  savingProfile.value = true
  try {
    await updateUserProfile({ ...profileForm })
    toast.success('个人资料修改成功')
    await Promise.all([loadProfile(), session.fetchProfile()])
  }
  catch (error) {
    toast.error('个人资料修改失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    savingProfile.value = false
  }
}

function validatePasswordForm() {
  if (!passwordForm.oldPassword.trim()) {
    toast.warning('请输入旧密码')
    return false
  }
  if (passwordForm.newPassword.length < 6 || passwordForm.newPassword.length > 20) {
    toast.warning('新密码长度必须在 6 到 20 位之间')
    return false
  }
  if (!/^[^<>"'|\\]+$/.test(passwordForm.newPassword)) {
    toast.warning('新密码不能包含非法字符 < > " \' | \\')
    return false
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.warning('两次输入的新密码不一致')
    return false
  }
  return true
}

async function submitPassword() {
  if (!validatePasswordForm()) {
    return
  }

  savingPassword.value = true
  try {
    await updateUserPwd(passwordForm.oldPassword, passwordForm.newPassword)
    toast.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  }
  catch (error) {
    toast.error('密码修改失败', { description: error instanceof Error ? error.message : '请稍后重试。' })
  }
  finally {
    savingPassword.value = false
  }
}

async function handleAvatarSuccess(payload: { imageUrl: string }) {
  if (payload.imageUrl) {
    avatarUrl.value = payload.imageUrl
  }
  await Promise.all([loadProfile(), session.fetchProfile()])
}

onMounted(loadProfile)
</script>

<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">系统管理 / 个人中心</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">个人中心</h1>
    </div>

    <div class="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <AdminSectionCard title="个人信息">
        <template #headerExtra>
          <Button variant="outline" size="sm" @click="loadProfile">刷新资料</Button>
        </template>
        <div v-if="loading" class="text-sm text-muted-foreground">正在加载个人信息...</div>
        <div v-else class="space-y-5">
          <div class="flex flex-col items-center gap-4 text-center">
            <button type="button" class="group relative" @click="avatarCropOpen = true">
              <Avatar class="size-28 rounded-3xl border border-border/60 bg-muted/20 transition group-hover:shadow-lg">
                <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="profile.nickName || profile.userName || '用户头像'" />
                <AvatarFallback class="rounded-3xl text-2xl font-semibold">{{ avatarFallback }}</AvatarFallback>
              </Avatar>
              <span class="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                修改头像
              </span>
            </button>
            <div>
              <p class="text-lg font-semibold">{{ profile.nickName || profile.userName || session.user.name }}</p>
              <p class="mt-1 text-sm text-muted-foreground">{{ roleGroup }}</p>
            </div>
            <div class="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
              <Button variant="outline" class="w-full sm:w-auto" @click="avatarCropOpen = true">修改头像</Button>
            </div>
          </div>

          <div class="grid gap-3">
            <div v-for="item in summaryItems" :key="item.label" class="flex flex-col items-start gap-1 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span class="text-sm text-muted-foreground">{{ item.label }}</span>
              <span class="break-all text-sm font-medium sm:text-right">{{ item.value }}</span>
            </div>
          </div>

          <div v-if="securityHints.length" class="flex flex-wrap gap-2">
            <Badge v-for="hint in securityHints" :key="hint" variant="destructive">{{ hint }}</Badge>
          </div>
        </div>
      </AdminSectionCard>

      <Tabs v-model:model-value="activeTab" class="space-y-4">
        <div class="-mx-1 overflow-x-auto surface-scrollbar pb-1">
          <TabsList class="flex w-max min-w-full justify-start bg-muted/50 p-1 [&_[data-slot=tabs-trigger]]:shrink-0 [&_[data-slot=tabs-trigger]]:flex-none sm:w-fit">
            <TabsTrigger value="profile">基础资料</TabsTrigger>
            <TabsTrigger value="password">修改密码</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" class="mt-0">
          <AdminSectionCard title="基础资料">
            <template #headerExtra>
              <Button size="sm" :disabled="savingProfile" @click="submitProfile">{{ savingProfile ? '保存中...' : '保存资料' }}</Button>
              <Button variant="outline" size="sm" @click="loadProfile">重置</Button>
            </template>
            <div v-if="loading" class="text-sm text-muted-foreground">正在加载资料表单...</div>
            <div v-else class="grid gap-4 md:grid-cols-2">
              <AdminFormField label="用户昵称">
                <Input v-model="profileForm.nickName" placeholder="请输入用户昵称" />
              </AdminFormField>
              <AdminFormField label="手机号码">
                <Input v-model="profileForm.phonenumber" placeholder="请输入手机号码" />
              </AdminFormField>
              <AdminFormField label="邮箱地址">
                <Input v-model="profileForm.email" placeholder="请输入邮箱地址" />
              </AdminFormField>
              <AdminFormField label="性别">
                <Select v-model="profileForm.sex">
                  <SelectTrigger><SelectValue placeholder="请选择性别" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">男</SelectItem>
                    <SelectItem value="1">女</SelectItem>
                    <SelectItem value="2">未知</SelectItem>
                  </SelectContent>
                </Select>
              </AdminFormField>
            </div>
          </AdminSectionCard>
        </TabsContent>

        <TabsContent value="password" class="mt-0">
          <AdminSectionCard title="修改密码">
            <template #headerExtra>
              <Button size="sm" :disabled="savingPassword" @click="submitPassword">{{ savingPassword ? '提交中...' : '更新密码' }}</Button>
              <Button variant="outline" size="sm" @click="activeTab = 'profile'">返回资料</Button>
            </template>
            <div class="grid gap-4 md:grid-cols-2">
              <AdminFormField label="旧密码">
                <Input v-model="passwordForm.oldPassword" type="password" placeholder="请输入旧密码" />
              </AdminFormField>
              <div class="hidden md:block" />
              <AdminFormField label="新密码">
                <Input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" />
              </AdminFormField>
              <AdminFormField label="确认密码">
                <Input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
              </AdminFormField>
            </div>
          </AdminSectionCard>
        </TabsContent>
      </Tabs>
    </div>

    <AdminAvatarCropDialog v-model="avatarCropOpen" :image-url="avatarUrl" @success="handleAvatarSuccess" />
  </div>
</template>
