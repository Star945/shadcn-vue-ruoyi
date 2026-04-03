const tokenKey = 'Admin-Token'

export function getToken() {
  if (typeof window === 'undefined') {
    return ''
  }
  return localStorage.getItem(tokenKey) ?? ''
}

export function setToken(token: string) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(tokenKey, token)
}

export function removeToken() {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(tokenKey)
}
