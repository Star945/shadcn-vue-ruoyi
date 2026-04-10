import type { ThemeMode, ThemePalette } from '@/theme/presets'

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

export interface ResolvedThemeVisuals {
  primary: string
  accent: string
  sidebarPrimary: string
  radius: number
  primaryForeground: string
  accentForeground: string
  sidebarPrimaryForeground: string
  glowPrimary: string
  glowSecondary: string
  chartLineStart: string
  chartLineEnd: string
  chartAreaStart: string
  chartAreaEnd: string
  chartAxis: string
  chartGrid: string
  chartTooltipBackground: string
  chartTooltipBorder: string
  chartTooltipText: string
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

function mixHex(from: string, to: string, ratio: number) {
  const start = toRgb(from)
  const end = toRgb(to)
  const weight = Math.min(1, Math.max(0, ratio))
  const mix = {
    r: Math.round(start.r + (end.r - start.r) * weight),
    g: Math.round(start.g + (end.g - start.g) * weight),
    b: Math.round(start.b + (end.b - start.b) * weight),
  }
  return `#${[mix.r, mix.g, mix.b].map(value => value.toString(16).padStart(2, '0')).join('')}`
}

function pickForeground(hex: string) {
  const { r, g, b } = toRgb(hex)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 158 ? '#0f172a' : '#f8fafc'
}

function resolvePalette(palette: ThemePalette, customTheme?: ThemeCustomPalette) {
  return {
    primary: normalizeHex(customTheme?.primary ?? palette.primary, palette.primary),
    accent: normalizeHex(customTheme?.accent ?? palette.accent, palette.accent),
    sidebarPrimary: normalizeHex(customTheme?.sidebarPrimary ?? palette.sidebarPrimary, palette.sidebarPrimary),
    radius: Number.isFinite(customTheme?.radius) ? Number(customTheme?.radius) : undefined,
  }
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

export function resolveThemeVisuals(application: ThemeApplication): ResolvedThemeVisuals {
  const preset = getThemePreset(application.presetId)
  const palette = application.mode === 'dark' ? preset.dark : preset.light
  const selected = application.useCustomTheme && application.customTheme
    ? resolvePalette(palette, application.customTheme)
    : resolvePalette(palette)

  const primaryForeground = pickForeground(selected.primary)
  const accentForeground = pickForeground(selected.accent)
  const sidebarPrimaryForeground = pickForeground(selected.sidebarPrimary)
  const glowPrimary = toRgba(selected.primary, application.mode === 'dark' ? 0.18 : 0.14)
  const glowSecondary = toRgba(selected.accent, application.mode === 'dark' ? 0.15 : 0.12)

  return {
    primary: selected.primary,
    accent: selected.accent,
    sidebarPrimary: selected.sidebarPrimary,
    radius: selected.radius ?? preset.radius,
    primaryForeground,
    accentForeground,
    sidebarPrimaryForeground,
    glowPrimary,
    glowSecondary,
    chartLineStart: selected.primary,
    chartLineEnd: mixHex(selected.accent, selected.primary, 0.32),
    chartAreaStart: toRgba(selected.primary, application.mode === 'dark' ? 0.34 : 0.24),
    chartAreaEnd: toRgba(selected.accent, 0),
    chartAxis: application.mode === 'dark' ? 'rgba(226, 232, 240, 0.56)' : 'rgba(71, 85, 105, 0.82)',
    chartGrid: application.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    chartTooltipBackground: application.mode === 'dark'
      ? mixHex(selected.sidebarPrimary, '#020617', 0.18)
      : mixHex('#ffffff', selected.primary, 0.06),
    chartTooltipBorder: application.mode === 'dark'
      ? toRgba(selected.primary, 0.28)
      : toRgba(selected.primary, 0.18),
    chartTooltipText: application.mode === 'dark' ? '#f8fafc' : '#0f172a',
  }
}

export function applyTheme(root: HTMLElement, application: ThemeApplication) {
  const visuals = resolveThemeVisuals(application)

  root.classList.toggle('dark', application.mode === 'dark')
  root.style.colorScheme = application.mode
  root.style.setProperty('--radius', `${visuals.radius}px`)
  root.style.setProperty('--theme-primary', visuals.primary)
  root.style.setProperty('--theme-primary-foreground', visuals.primaryForeground)
  root.style.setProperty('--theme-accent', visuals.accent)
  root.style.setProperty('--theme-accent-foreground', visuals.accentForeground)
  root.style.setProperty('--theme-sidebar-primary', visuals.sidebarPrimary)
  root.style.setProperty('--theme-sidebar-primary-foreground', visuals.sidebarPrimaryForeground)
  root.style.setProperty('--surface-glow-primary', visuals.glowPrimary)
  root.style.setProperty('--surface-glow-secondary', visuals.glowSecondary)
  root.style.setProperty('--theme-chart-primary', visuals.chartLineStart)
  root.style.setProperty('--theme-chart-accent', visuals.chartLineEnd)
  root.style.setProperty('--theme-chart-grid', visuals.chartGrid)
  root.style.setProperty('--theme-chart-axis', visuals.chartAxis)
}
