import type { RouteRecordRaw } from 'vue-router'

import { createRouter, createWebHistory } from 'vue-router'

import AdminLayout from '@/layout/AdminLayout.vue'
import { pinia } from '@/stores'
import { useNavigationStore } from '@/stores/navigation'
import { usePermissionStore } from '@/stores/permission'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

export const constantRoutes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('@/views/login.vue'), meta: { title: '登录', public: true, hidden: true } },
  { path: '/register', name: 'Register', component: () => import('@/views/register.vue'), meta: { title: '注册', public: true, hidden: true } },
  { path: '/401', name: 'Forbidden', component: () => import('@/views/error/401.vue'), meta: { title: '无权限', public: true, hidden: true } },
  { path: '/lock', name: 'Lock', component: () => import('@/views/lock.vue'), meta: { title: '锁屏', hidden: true } },
  {
    path: '/',
    name: 'AdminLayout',
    component: AdminLayout,
    redirect: '/index',
    children: [
      {
        path: '/redirect/:path(.*)',
        name: 'Redirect',
        component: () => import('@/views/redirect/index.vue'),
        meta: { title: '路由跳转', hidden: true, internal: true },
      },
      {
        path: '/index',
        name: 'Index',
        component: () => import('@/views/index.vue'),
        meta: { title: '工作台' },
      },
      {
        path: '/user/profile/:activeTab?',
        name: 'Profile',
        component: () => import('@/views/system/user/profile/index.vue'),
        meta: { title: '个人中心', hidden: true, activeMenu: '/user/profile' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: constantRoutes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const session = useSessionStore(pinia)
  const permission = usePermissionStore(pinia)
  const navigation = useNavigationStore(pinia)

  if (to.meta.public) {
    if (to.path === '/login') {
      if (session.isAuthenticated && session.locked) return '/lock'
      if (session.isAuthenticated && !session.locked) return '/index'
    }
    return true
  }

  if (!session.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (session.locked && to.path !== '/lock') return '/lock'
  if (!session.locked && to.path === '/lock') return '/index'

  if (to.path !== '/lock' && !session.profileLoaded) {
    try {
      await session.fetchProfile()
    }
    catch {
      session.clearSession()
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  if (to.meta.internal) return true

  if (!permission.routesGenerated) {
    await permission.generateRoutes(router)
    await navigation.ensureLoaded()
    return { ...to, replace: true }
  }

  const menuTitle = navigation.resolveTitle(String(to.meta.activeMenu ?? to.path))
  if (menuTitle && !to.meta.hidden) {
    to.meta.title = menuTitle
  }

  return true
})

router.afterEach((to) => {
  if (to.meta.internal) return
  useUiStore(pinia).addTag(to)
})

export default router
