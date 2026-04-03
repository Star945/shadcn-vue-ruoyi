import { defineStore } from 'pinia'

import { getInfo, login as loginApi, logout as logoutApi } from '@/api/login'
import { getToken, removeToken, setToken } from '@/utils/auth'

const storageKey = 'ruoyi-shadcn-session'

export interface SessionUser {
  id: string
  name: string
  userName: string
  nickName: string
  role: string
  email: string
  dept: string
  avatar: string
  phonenumber: string
}

interface SessionState {
  token: string
  locked: boolean
  user: SessionUser
  roles: string[]
  permissions: string[]
  profileLoaded: boolean
}

interface LoginPayload {
  username: string
  password: string
  code?: string
  uuid?: string
}

const defaultUser = (): SessionUser => ({
  id: '',
  name: 'Guest',
  userName: '',
  nickName: '',
  role: 'Visitor',
  email: '',
  dept: '--',
  avatar: 'RY',
  phonenumber: '',
})

function buildAvatar(userName?: string, nickName?: string) {
  const source = (nickName || userName || 'RY').trim()
  const compact = source.replace(/\s+/g, '')
  return compact.slice(0, 2).toUpperCase() || 'RY'
}

function joinText(parts: Array<string | undefined>, fallback = '--') {
  const values = parts.map(part => part?.trim()).filter(Boolean) as string[]
  return values.length ? values.join(' / ') : fallback
}

function normalizeUser(user: Record<string, any> | undefined, roles: string[]) {
  const source = user ?? {}
  const userName = String(source.userName ?? '')
  const nickName = String(source.nickName ?? '')
  const deptName = String(source.dept?.deptName ?? source.deptName ?? '')
  const postName = String(source.post?.postName ?? '')
  const roleName = roles.length ? roles.join(', ') : 'Unassigned'

  return {
    id: String(source.userId ?? ''),
    name: nickName || userName || 'Guest',
    userName,
    nickName,
    role: roleName,
    email: String(source.email ?? ''),
    dept: joinText([deptName, postName]),
    avatar: buildAvatar(userName, nickName),
    phonenumber: String(source.phonenumber ?? ''),
  }
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    token: '',
    locked: false,
    user: defaultUser(),
    roles: [],
    permissions: [],
    profileLoaded: false,
  }),
  getters: {
    isAuthenticated: state => Boolean(state.token),
  },
  actions: {
    persist() {
      if (typeof window === 'undefined') {
        return
      }
      localStorage.setItem(storageKey, JSON.stringify({
        locked: this.locked,
        user: this.user,
        roles: this.roles,
        permissions: this.permissions,
      }))
    },
    clearPersistedState() {
      if (typeof window === 'undefined') {
        return
      }
      localStorage.removeItem(storageKey)
    },
    restore() {
      this.token = getToken()
      this.profileLoaded = false

      if (typeof window === 'undefined') {
        return
      }

      const raw = localStorage.getItem(storageKey)
      if (!raw) {
        if (!this.token) {
          this.user = defaultUser()
          this.roles = []
          this.permissions = []
          this.locked = false
        }
        return
      }

      try {
        const parsed = JSON.parse(raw) as Partial<SessionState>
        this.locked = parsed.locked ?? false
        this.user = {
          ...defaultUser(),
          ...(parsed.user ?? {}),
        }
        this.roles = Array.isArray(parsed.roles) ? parsed.roles : []
        this.permissions = Array.isArray(parsed.permissions) ? parsed.permissions : []
      }
      catch {
        this.clearPersistedState()
      }

      if (!this.token) {
        this.clearSession(false)
      }
    },
    async login(payload: LoginPayload) {
      const response = await loginApi(payload.username, payload.password, payload.code, payload.uuid)
      setToken(response.token)
      this.token = response.token
      this.locked = false
      this.profileLoaded = false
      this.persist()
      await this.fetchProfile()
    },
    async fetchProfile() {
      if (!this.token) {
        return null
      }

      const response = await getInfo()
      const roles = Array.isArray(response.roles) ? response.roles : []
      this.roles = roles
      this.permissions = Array.isArray(response.permissions) ? response.permissions : []
      this.user = normalizeUser(response.user, roles)
      this.profileLoaded = true
      this.persist()
      return response
    },
    lock() {
      this.locked = true
      this.persist()
    },
    unlock() {
      this.locked = false
      this.persist()
    },
    clearSession(clearToken = true) {
      if (clearToken) {
        removeToken()
      }
      this.token = ''
      this.locked = false
      this.user = defaultUser()
      this.roles = []
      this.permissions = []
      this.profileLoaded = false
      this.clearPersistedState()
    },
    async logout() {
      try {
        if (this.token) {
          await logoutApi()
        }
      }
      catch {
      }
      finally {
        this.clearSession()
      }
    },
  },
})
