function normalizeBaseApi(baseApi: string) {
  return baseApi.endsWith('/') ? baseApi.slice(0, -1) : baseApi
}

export function getDruidFrameSrc(baseApi = String(import.meta.env.VITE_APP_BASE_API ?? '')) {
  return `${normalizeBaseApi(baseApi)}/druid/login.html`
}
