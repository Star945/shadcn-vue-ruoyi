import { computed } from 'vue'
import { toast } from 'vue-sonner'

import { useSessionStore } from '@/stores/session'
import { permissionKeys } from '@/lib/permission-keys'

const superAdminRole = 'admin'

function toList(input?: string | readonly string[]) {
  if (!input) {
    return []
  }
  if (typeof input === 'string') {
    return input ? [input] : []
  }
  return [...input].filter((item): item is string => Boolean(item))
}

export function useAccess() {
  const session = useSessionStore()

  const isAdmin = computed(() => {
    return session.roles.includes(superAdminRole) || session.permissions.includes(permissionKeys.superAdmin)
  })

  function can(input?: string | readonly string[]) {
    const required = toList(input)
    if (!required.length || isAdmin.value) {
      return true
    }
    return required.some(item => session.permissions.includes(item))
  }

  function canAll(input?: string | readonly string[]) {
    const required = toList(input)
    if (!required.length || isAdmin.value) {
      return true
    }
    return required.every(item => session.permissions.includes(item))
  }

  function hasRole(input?: string | readonly string[]) {
    const required = toList(input)
    if (!required.length || isAdmin.value) {
      return true
    }
    return required.some(item => session.roles.includes(item))
  }

  function hasAnyPrefix(input?: string | readonly string[]) {
    const required = toList(input)
    if (!required.length || isAdmin.value) {
      return true
    }
    return required.some(prefix => session.permissions.some(item => item.startsWith(prefix)))
  }

  function requirePermission(input: string | readonly string[], actionLabel: string) {
    if (can(input)) {
      return true
    }
    toast.error('无权限', {
      description: `您没有${actionLabel}权限。`,
    })
    return false
  }

  return {
    isAdmin,
    can,
    canAll,
    hasRole,
    hasAnyPrefix,
    require: requirePermission,
  }
}



