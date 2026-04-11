import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { ThemeCustomPalette, ThemeApplication } from '@/theme'
import type { ThemeMode } from '@/theme/presets'

import { defineStore } from 'pinia'

import { applyTheme, createThemeCustomPalette } from '@/theme'
import { defaultThemePresetId } from '@/theme/presets'

const storageKey = 'ruoyi-shadcn-ui'

export interface VisitedTag {
  title: string
  path: string
}

export interface LayoutSettings {
  topNav: boolean
  tagsView: boolean
  tagsIcon: boolean
  fixedHeader: boolean
  showLogo: boolean
  dynamicTitle: boolean
  footer: boolean
}

interface UiState {
  theme: ThemeMode
  themePresetId: string
  useCustomTheme: boolean
  useThemeLinkedForegrounds: boolean
  customTheme: ThemeCustomPalette
  layout: LayoutSettings
  themeSheetOpen: boolean
  commandOpen: boolean
  visitedTags: VisitedTag[]
}

const defaultTags = (): VisitedTag[] => ([
  { title: '工作台', path: '/index' },
])

const defaultLayoutSettings = (): LayoutSettings => ({
  topNav: false,
  tagsView: true,
  tagsIcon: false,
  fixedHeader: true,
  showLogo: true,
  dynamicTitle: true,
  footer: true,
})

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    theme: 'light',
    themePresetId: defaultThemePresetId,
    useCustomTheme: false,
    useThemeLinkedForegrounds: false,
    customTheme: createThemeCustomPalette(defaultThemePresetId),
    layout: defaultLayoutSettings(),
    themeSheetOpen: false,
    commandOpen: false,
    visitedTags: defaultTags(),
  }),
  getters: {
    themeApplication(state): ThemeApplication {
      return {
        mode: state.theme,
        presetId: state.themePresetId,
        useCustomTheme: state.useCustomTheme,
        useThemeLinkedForegrounds: state.useThemeLinkedForegrounds,
        customTheme: state.customTheme,
      }
    },
  },
  actions: {
    persist() {
      if (typeof window === 'undefined') {
        return
      }
      localStorage.setItem(storageKey, JSON.stringify({
        theme: this.theme,
        themePresetId: this.themePresetId,
        useCustomTheme: this.useCustomTheme,
        useThemeLinkedForegrounds: this.useThemeLinkedForegrounds,
        customTheme: this.customTheme,
        layout: this.layout,
        visitedTags: this.visitedTags,
      }))
    },
    restore() {
      if (typeof window === 'undefined') {
        return
      }
      const raw = localStorage.getItem(storageKey)
      if (!raw) {
        this.applyTheme()
        return
      }
      try {
        const parsed = JSON.parse(raw) as Partial<UiState>
        this.theme = parsed.theme === 'dark' ? 'dark' : 'light'
        this.themePresetId = typeof parsed.themePresetId === 'string' ? parsed.themePresetId : defaultThemePresetId
        this.useCustomTheme = Boolean(parsed.useCustomTheme)
        this.useThemeLinkedForegrounds = Boolean(parsed.useThemeLinkedForegrounds)
        this.customTheme = {
          ...createThemeCustomPalette(this.themePresetId),
          ...(parsed.customTheme ?? {}),
        }
        this.layout = {
          ...defaultLayoutSettings(),
          ...(parsed.layout ?? {}),
        }
        this.visitedTags = parsed.visitedTags?.length ? parsed.visitedTags : defaultTags()
      }
      catch {
        localStorage.removeItem(storageKey)
      }
      this.applyTheme()
    },
    applyTheme() {
      if (typeof document === 'undefined') {
        return
      }
      applyTheme(document.documentElement, this.themeApplication)
    },
    setTheme(mode: ThemeMode) {
      this.theme = mode
      this.applyTheme()
      this.persist()
    },
    toggleTheme() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark')
    },
    setThemeSheetOpen(value: boolean) {
      this.themeSheetOpen = value
    },
    setLayoutSetting<K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) {
      this.layout = {
        ...this.layout,
        [key]: value,
      }
      this.persist()
    },
    setThemePreset(presetId: string) {
      this.themePresetId = presetId
      if (!this.useCustomTheme) {
        this.customTheme = createThemeCustomPalette(presetId)
      }
      this.applyTheme()
      this.persist()
    },
    setUseCustomTheme(value: boolean) {
      this.useCustomTheme = value
      if (!value) {
        this.customTheme = createThemeCustomPalette(this.themePresetId)
      }
      this.applyTheme()
      this.persist()
    },
    setUseThemeLinkedForegrounds(value: boolean) {
      this.useThemeLinkedForegrounds = value
      this.applyTheme()
      this.persist()
    },
    updateCustomTheme(patch: Partial<ThemeCustomPalette>) {
      this.customTheme = {
        ...this.customTheme,
        ...patch,
      }
      this.useCustomTheme = true
      this.applyTheme()
      this.persist()
    },
    resetThemeConfig() {
      this.themePresetId = defaultThemePresetId
      this.useCustomTheme = false
      this.useThemeLinkedForegrounds = false
      this.customTheme = createThemeCustomPalette(defaultThemePresetId)
      this.layout = defaultLayoutSettings()
      this.applyTheme()
      this.persist()
    },
    setCommandOpen(value: boolean) {
      this.commandOpen = value
    },
    addTag(route: RouteLocationNormalizedLoaded) {
      if (route.meta.hidden || route.meta.public) {
        return
      }
      const path = route.path
      const title = String(route.meta.title ?? route.name ?? path)
      const existing = this.visitedTags.find(tag => tag.path === path)
      if (existing) {
        existing.title = title
        this.persist()
        return
      }
      this.visitedTags.push({ title, path })
      this.persist()
    },
    removeTag(path: string) {
      if (path === '/index') {
        return
      }
      this.visitedTags = this.visitedTags.filter(tag => tag.path !== path)
      if (!this.visitedTags.length) {
        this.visitedTags = defaultTags()
      }
      this.persist()
    },
    closeLeftTags(path: string) {
      const targetIndex = this.visitedTags.findIndex(tag => tag.path === path)
      if (targetIndex <= 0) {
        return
      }
      this.visitedTags = this.visitedTags.filter((tag, index) => tag.path === '/index' || index >= targetIndex)
      this.persist()
    },
    closeRightTags(path: string) {
      const targetIndex = this.visitedTags.findIndex(tag => tag.path === path)
      if (targetIndex < 0 || targetIndex >= this.visitedTags.length - 1) {
        return
      }
      this.visitedTags = this.visitedTags.filter((tag, index) => tag.path === '/index' || index <= targetIndex)
      this.persist()
    },
    closeOtherTags(path: string) {
      const keep = new Set(['/index', path])
      this.visitedTags = this.visitedTags.filter(tag => keep.has(tag.path))
      if (!this.visitedTags.length) {
        this.visitedTags = defaultTags()
      }
      this.persist()
    },
    closeAllTags() {
      this.visitedTags = defaultTags()
      this.persist()
    },
    resetTags() {
      this.visitedTags = defaultTags()
      this.persist()
    },
  },
})
