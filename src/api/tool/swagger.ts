function normalizeBaseApi(baseApi: string) {
  return baseApi.endsWith('/') ? baseApi.slice(0, -1) : baseApi
}

export function getSwaggerFrameSrc(baseApi = String(import.meta.env.VITE_APP_BASE_API ?? '')) {
  return `${normalizeBaseApi(baseApi)}/docs`
}