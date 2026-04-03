import type { RouteRecordRaw } from 'vue-router'

import { createRouter, createWebHistory } from 'vue-router'

import AdminLayout from '@/layout/AdminLayout.vue'
import { permissionKeys } from '@/lib/permission-keys'
import { canonicalizeBackendRoutePath } from '@/router/backend-route-map'
import { pinia } from '@/stores'
import { useNavigationStore } from '@/stores/navigation'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

function moduleRoute(
  path: string,
  name: string,
  title: string,
  component: () => Promise<unknown>,
  meta: Record<string, unknown> = {},
): RouteRecordRaw {
  return {
    path,
    name,
    component,
    meta: {
      title,
      ...meta,
    },
  }
}

function hasRoutePermission(session: ReturnType<typeof useSessionStore>, input: unknown) {
  const required = Array.isArray(input)
    ? input.map(item => String(item)).filter(Boolean)
    : input
      ? [String(input)]
      : []

  if (!required.length) {
    return true
  }

  if (session.roles.includes('admin') || session.permissions.includes(permissionKeys.superAdmin)) {
    return true
  }

  return required.some(item => session.permissions.includes(item))
}

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('@/views/login.vue'), meta: { title: '登录', public: true, hidden: true } },
  { path: '/register', name: 'Register', component: () => import('@/views/register.vue'), meta: { title: '注册', public: true, hidden: true } },
  { path: '/401', name: 'Forbidden', component: () => import('@/views/error/401.vue'), meta: { title: '无权限', public: true, hidden: true } },
  { path: '/lock', name: 'Lock', component: () => import('@/views/lock.vue'), meta: { title: '锁屏', hidden: true } },
  {
    path: '/',
    component: AdminLayout,
    children: [
      moduleRoute('/redirect/:path(.*)', 'Redirect', '路由跳转', () => import('@/views/redirect/index.vue'), { hidden: true, internal: true }),
      moduleRoute('/index', 'Index', '工作台', () => import('@/views/index.vue')),
      moduleRoute('/user/profile/:activeTab?', 'Profile', '个人中心', () => import('@/views/system/user/profile/index.vue'), { hidden: true, activeMenu: '/user/profile' }),
      moduleRoute('/aiChat', 'AiChat', 'AI对话', () => import('@/views/ai/chat/index.vue')),
      moduleRoute('/system/user', 'SystemUser', '用户管理', () => import('@/views/system/user/index.vue')),
      moduleRoute('/system/role', 'SystemRole', '角色管理', () => import('@/views/system/role/index.vue')),
      moduleRoute('/system/menu', 'SystemMenu', '菜单管理', () => import('@/views/system/menu/index.vue')),
      moduleRoute('/system/dept', 'SystemDept', '部门管理', () => import('@/views/system/dept/index.vue')),
      moduleRoute('/system/post', 'SystemPost', '岗位管理', () => import('@/views/system/post/index.vue')),
      moduleRoute('/system/dict', 'SystemDict', '字典管理', () => import('@/views/system/dict/index.vue')),
      moduleRoute('/system/config', 'SystemConfig', '参数设置', () => import('@/views/system/config/index.vue')),
      moduleRoute('/system/notice', 'SystemNotice', '通知公告', () => import('@/views/system/notice/index.vue')),
      moduleRoute('/system/user-auth/role/:userId(\\d+)', 'AuthRole', '分配角色', () => import('@/views/system/user/authRole.vue'), { hidden: true, activeMenu: '/system/user', permission: permissionKeys.system.user.edit }),
      moduleRoute('/system/role-auth/user/:roleId(\\d+)', 'AuthUser', '分配用户', () => import('@/views/system/role/authUser.vue'), { hidden: true, activeMenu: '/system/role', permission: permissionKeys.system.role.edit }),
      moduleRoute('/system/dict-data/index/:dictId(\\d+)', 'DictData', '字典数据', () => import('@/views/system/dict/data.vue'), { hidden: true, activeMenu: '/system/dict', permission: permissionKeys.system.dict.list }),
      moduleRoute('/monitor/online', 'MonitorOnline', '在线用户', () => import('@/views/monitor/online/index.vue')),
      moduleRoute('/monitor/job', 'MonitorJob', '定时任务', () => import('@/views/monitor/job/index.vue')),
      moduleRoute('/monitor/job-log/index/:jobId(\\d+)', 'MonitorJobLog', '调度日志', () => import('@/views/monitor/job/log.vue'), { hidden: true, activeMenu: '/monitor/job', permission: permissionKeys.monitor.job.list }),
      moduleRoute('/monitor/logininfor', 'MonitorLoginInfor', '登录日志', () => import('@/views/monitor/logininfor/index.vue')),
      moduleRoute('/monitor/operlog', 'MonitorOperlog', '操作日志', () => import('@/views/monitor/operlog/index.vue')),
      moduleRoute('/monitor/server', 'MonitorServer', '服务监控', () => import('@/views/monitor/server/index.vue')),
      moduleRoute('/monitor/cache', 'MonitorCache', '缓存监控', () => import('@/views/monitor/cache/index.vue')),
      moduleRoute('/monitor/cacheList', 'MonitorCacheList', '缓存列表', () => import('@/views/monitor/cache/index.vue')),
      moduleRoute('/monitor/druid', 'MonitorDruid', '数据监控', () => import('@/views/monitor/druid/index.vue')),
      moduleRoute('/tool/build', 'ToolBuild', '表单构建', () => import('@/views/tool/build/index.vue')),
      moduleRoute('/tool/gen', 'ToolGen', '代码生成', () => import('@/views/tool/gen/index.vue')),
      moduleRoute('/tool/gen-edit/index/:tableId(\\d+)', 'ToolGenEdit', '编辑生成配置', () => import('@/views/tool/gen/editTable.vue'), { hidden: true, activeMenu: '/tool/gen', permission: permissionKeys.tool.gen.edit }),
      moduleRoute('/tool/swagger', 'ToolSwagger', '系统接口', () => import('@/views/tool/swagger/index.vue')),
      { path: '/system/log/logininfor', redirect: '/monitor/logininfor', meta: { title: '登录日志', hidden: true, activeMenu: '/monitor/logininfor' } },
      { path: '/system/log/operlog', redirect: '/monitor/operlog', meta: { title: '操作日志', hidden: true, activeMenu: '/monitor/operlog' } },
      { path: '/monitor/cache/list', redirect: '/monitor/cacheList', meta: { title: '缓存列表', hidden: true, activeMenu: '/monitor/cacheList' } },
      { path: '/monitor/cachelist', redirect: '/monitor/cacheList', meta: { title: '缓存列表', hidden: true, activeMenu: '/monitor/cacheList' } },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/error/404.vue'), meta: { title: '页面不存在', public: true, hidden: true } },
]
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const canonicalPath = canonicalizeBackendRoutePath(to.path)
  if (canonicalPath !== to.path) {
    return { path: canonicalPath, query: to.query, hash: to.hash, replace: true }
  }
  const session = useSessionStore(pinia)
  const navigation = useNavigationStore(pinia)

  if (to.meta.public) {
    if (to.path === '/login') {
      if (session.isAuthenticated && session.locked) {
        return '/lock'
      }
      if (session.isAuthenticated && !session.locked) {
        return '/index'
      }
    }
    return true
  }

  if (!session.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (session.locked && to.path !== '/lock') {
    return '/lock'
  }

  if (!session.locked && to.path === '/lock') {
    return '/index'
  }

  if (to.path !== '/lock' && !session.profileLoaded) {
    try {
      await session.fetchProfile()
    }
    catch {
      session.clearSession()
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  if (to.meta.internal) {
    return true
  }

  await navigation.ensureLoaded()

  const activeMenuPath = typeof to.meta.activeMenu === 'string' ? to.meta.activeMenu : ''
  if (!navigation.canAccessRoute(to.path, activeMenuPath)) {
    return '/401'
  }

  if (!hasRoutePermission(session, to.meta.permission)) {
    return '/401'
  }

  const menuTitle = navigation.resolveTitle(String(to.meta.activeMenu ?? to.path))
  if (menuTitle && !to.meta.hidden) {
    to.meta.title = menuTitle
  }

  return true
})

router.afterEach((to) => {
  if (to.meta.internal) {
    return
  }
  useUiStore(pinia).addTag(to)
})

export default router

