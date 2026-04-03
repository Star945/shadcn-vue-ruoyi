import type { ThemeMode } from '@/theme/presets'

import { defaultThemePresetId, themePresets } from '@/theme/presets'

export interface ThemeCustomPalette {
  primary: string
  accent: string
  sidebarPrimary: string
  radius: number
}

export interface ThemeApplication {
  mode: ThemeMode
  presetId?: string
  useCustomTheme?: boolean
  customTheme?: ThemeCustomPalette
}

function normalizeHex(value: string, fallback: string) {
  const input = value.trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input)) {
    return fallback
  }
  if (input.length === 4) {
    const [, r, g, b] = input
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return input.toLowerCase()
}

function toRgb(hex: string) {
  const normalized = normalizeHex(hex, '#0f766e').slice(1)
  const value = Number.parseInt(normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function toRgba(hex: string, alpha: number) {
  const { r, g, b } = toRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function pickForeground(hex: string) {
  const { r, g, b } = toRgb(hex)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 158 ? '#0f172a' : '#f8fafc'
}

export function getThemePreset(presetId?: string) {
  return themePresets.find(item => item.id === presetId) ?? themePresets.find(item => item.id === defaultThemePresetId) ?? themePresets[0]
}

export function createThemeCustomPalette(presetId?: string) {
  const preset = getThemePreset(presetId)
  return {
    primary: preset.light.primary,
    accent: preset.light.accent,
    sidebarPrimary: preset.light.sidebarPrimary,
    radius: preset.radius,
  }
}

export function applyTheme(root: HTMLElement, application: ThemeApplication) {
  const preset = getThemePreset(application.presetId)
  const palette = application.mode === 'dark' ? preset.dark : preset.light
  const customTheme = application.useCustomTheme && application.customTheme
    ? {
        primary: normalizeHex(application.customTheme.primary, palette.primary),
        accent: normalizeHex(application.customTheme.accent, palette.accent),
        sidebarPrimary: normalizeHex(application.customTheme.sidebarPrimary, palette.sidebarPrimary),
        radius: Number.isFinite(application.customTheme.radius) ? application.customTheme.radius : preset.radius,
      }
    : {
        primary: palette.primary,
        accent: palette.accent,
        sidebarPrimary: palette.sidebarPrimary,
        radius: preset.radius,
      }

  root.classList.toggle('dark', application.mode === 'dark')
  root.style.colorScheme = application.mode
  root.style.setProperty('--radius', `${customTheme.radius}px`)
  root.style.setProperty('--theme-primary', customTheme.primary)
  root.style.setProperty('--theme-primary-foreground', pickForeground(customTheme.primary))
  root.style.setProperty('--theme-accent', customTheme.accent)
  root.style.setProperty('--theme-accent-foreground', pickForeground(customTheme.accent))
  root.style.setProperty('--theme-sidebar-primary', customTheme.sidebarPrimary)
  root.style.setProperty('--theme-sidebar-primary-foreground', pickForeground(customTheme.sidebarPrimary))
  root.style.setProperty('--surface-glow-primary', toRgba(customTheme.primary, application.mode === 'dark' ? 0.16 : 0.13))
  root.style.setProperty('--surface-glow-secondary', toRgba(customTheme.accent, application.mode === 'dark' ? 0.12 : 0.1))
}

