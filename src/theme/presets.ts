export type ThemeMode = 'light' | 'dark'

export interface ThemePalette {
  primary: string
  accent: string
  sidebarPrimary: string
  glowPrimary: string
  glowSecondary: string
}

export interface ThemePreset {
  id: string
  name: string
  description: string
  radius: number
  light: ThemePalette
  dark: ThemePalette
}

export const themePresets: ThemePreset[] = [
  {
    id: 'graphite-ocean',
    name: '石墨海湾',
    description: '冷静的石墨底色，适合中后台长期使用。',
    radius: 18,
    light: {
      primary: '#0f766e',
      accent: '#ea580c',
      sidebarPrimary: '#0f172a',
      glowPrimary: 'rgba(15, 118, 110, 0.16)',
      glowSecondary: 'rgba(234, 88, 12, 0.12)',
    },
    dark: {
      primary: '#2dd4bf',
      accent: '#fb923c',
      sidebarPrimary: '#0f766e',
      glowPrimary: 'rgba(45, 212, 191, 0.16)',
      glowSecondary: 'rgba(251, 146, 60, 0.12)',
    },
  },
  {
    id: 'forest-ink',
    name: '森墨',
    description: '更稳的绿调，适合偏平台型后台。',
    radius: 20,
    light: {
      primary: '#166534',
      accent: '#b45309',
      sidebarPrimary: '#10261b',
      glowPrimary: 'rgba(22, 101, 52, 0.15)',
      glowSecondary: 'rgba(180, 83, 9, 0.12)',
    },
    dark: {
      primary: '#4ade80',
      accent: '#fbbf24',
      sidebarPrimary: '#14532d',
      glowPrimary: 'rgba(74, 222, 128, 0.14)',
      glowSecondary: 'rgba(251, 191, 36, 0.12)',
    },
  },
  {
    id: 'cobalt-sun',
    name: '钴蓝曜金',
    description: '偏产品化的科技蓝，识别度更高。',
    radius: 16,
    light: {
      primary: '#2563eb',
      accent: '#d97706',
      sidebarPrimary: '#172554',
      glowPrimary: 'rgba(37, 99, 235, 0.16)',
      glowSecondary: 'rgba(217, 119, 6, 0.12)',
    },
    dark: {
      primary: '#60a5fa',
      accent: '#fbbf24',
      sidebarPrimary: '#1d4ed8',
      glowPrimary: 'rgba(96, 165, 250, 0.15)',
      glowSecondary: 'rgba(251, 191, 36, 0.12)',
    },
  },
  {
    id: 'rose-clay',
    name: '陶土玫影',
    description: '暖色更明显，适合运营和内容类后台。',
    radius: 22,
    light: {
      primary: '#be123c',
      accent: '#c2410c',
      sidebarPrimary: '#4c0519',
      glowPrimary: 'rgba(190, 18, 60, 0.14)',
      glowSecondary: 'rgba(194, 65, 12, 0.12)',
    },
    dark: {
      primary: '#fb7185',
      accent: '#fb923c',
      sidebarPrimary: '#9f1239',
      glowPrimary: 'rgba(251, 113, 133, 0.14)',
      glowSecondary: 'rgba(251, 146, 60, 0.12)',
    },
  },
  {
    id: 'amethyst-glow',
    name: '紫金华录',
    description: '充满奢华感与神秘感的紫金配色。',
    radius: 24,
    light: {
      primary: '#6d28d9',
      accent: '#d97706',
      sidebarPrimary: '#2e1065',
      glowPrimary: 'rgba(109, 40, 217, 0.15)',
      glowSecondary: 'rgba(217, 119, 6, 0.12)',
    },
    dark: {
      primary: '#a78bfa',
      accent: '#fbbf24',
      sidebarPrimary: '#5b21b6',
      glowPrimary: 'rgba(167, 139, 250, 0.15)',
      glowSecondary: 'rgba(251, 191, 36, 0.12)',
    },
  },
  {
    id: 'midnight-aurora',
    name: '极夜蓝光',
    description: '深沉优雅的靛蓝星光，充满未来科技感。',
    radius: 18,
    light: {
      primary: '#4338ca',
      accent: '#0d9488',
      sidebarPrimary: '#1e1b4b',
      glowPrimary: 'rgba(67, 56, 202, 0.15)',
      glowSecondary: 'rgba(13, 148, 136, 0.12)',
    },
    dark: {
      primary: '#818cf8',
      accent: '#2dd4bf',
      sidebarPrimary: '#3730a3',
      glowPrimary: 'rgba(129, 140, 248, 0.15)',
      glowSecondary: 'rgba(45, 212, 191, 0.12)',
    },
  },
  {
    id: 'amber-dusk',
    name: '琥珀落霞',
    description: '温暖活力的琥珀色系，如夕阳般耀眼。',
    radius: 20,
    light: {
      primary: '#b45309',
      accent: '#be123c',
      sidebarPrimary: '#451a03',
      glowPrimary: 'rgba(180, 83, 9, 0.15)',
      glowSecondary: 'rgba(190, 18, 60, 0.12)',
    },
    dark: {
      primary: '#fbbf24',
      accent: '#fb7185',
      sidebarPrimary: '#92400e',
      glowPrimary: 'rgba(251, 191, 36, 0.15)',
      glowSecondary: 'rgba(251, 113, 133, 0.12)',
    },
  },
]

export const defaultThemePresetId = themePresets[0].id

