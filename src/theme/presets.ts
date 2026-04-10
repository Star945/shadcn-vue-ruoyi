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
    id: 'coral-party',
    name: '珊瑚派对',
    description: '热烈的珊瑚橙搭配莓果紫，适合更有存在感的控制台。',
    radius: 20,
    light: {
      primary: '#f05941',
      accent: '#7c3aed',
      sidebarPrimary: '#24144f',
      glowPrimary: 'rgba(240, 89, 65, 0.18)',
      glowSecondary: 'rgba(124, 58, 237, 0.14)',
    },
    dark: {
      primary: '#fb7a5c',
      accent: '#c084fc',
      sidebarPrimary: '#3b1d76',
      glowPrimary: 'rgba(251, 122, 92, 0.18)',
      glowSecondary: 'rgba(192, 132, 252, 0.15)',
    },
  },
  {
    id: 'lagoon-pop',
    name: '海湾汽水',
    description: '明亮湖蓝与柠檬绿的组合，整体更轻快、更年轻。',
    radius: 18,
    light: {
      primary: '#00a6a6',
      accent: '#84cc16',
      sidebarPrimary: '#0f2f3a',
      glowPrimary: 'rgba(0, 166, 166, 0.18)',
      glowSecondary: 'rgba(132, 204, 22, 0.13)',
    },
    dark: {
      primary: '#2dd4bf',
      accent: '#bef264',
      sidebarPrimary: '#124a5b',
      glowPrimary: 'rgba(45, 212, 191, 0.18)',
      glowSecondary: 'rgba(190, 242, 100, 0.14)',
    },
  },
  {
    id: 'berry-bubble',
    name: '莓果气泡',
    description: '偏活泼的粉莓色，适合运营、内容和活动类后台。',
    radius: 22,
    light: {
      primary: '#e11d74',
      accent: '#fb923c',
      sidebarPrimary: '#471236',
      glowPrimary: 'rgba(225, 29, 116, 0.16)',
      glowSecondary: 'rgba(251, 146, 60, 0.13)',
    },
    dark: {
      primary: '#fb7185',
      accent: '#fdba74',
      sidebarPrimary: '#6b214e',
      glowPrimary: 'rgba(251, 113, 133, 0.18)',
      glowSecondary: 'rgba(253, 186, 116, 0.14)',
    },
  },
  {
    id: 'electric-mango',
    name: '电光芒果',
    description: '高饱和黄橙撞上电蓝，风格更大胆也更醒目。',
    radius: 18,
    light: {
      primary: '#f59e0b',
      accent: '#2563eb',
      sidebarPrimary: '#1e2856',
      glowPrimary: 'rgba(245, 158, 11, 0.18)',
      glowSecondary: 'rgba(37, 99, 235, 0.14)',
    },
    dark: {
      primary: '#fbbf24',
      accent: '#60a5fa',
      sidebarPrimary: '#243579',
      glowPrimary: 'rgba(251, 191, 36, 0.18)',
      glowSecondary: 'rgba(96, 165, 250, 0.15)',
    },
  },
  {
    id: 'mint-jam',
    name: '薄荷果酱',
    description: '清爽薄荷配酸樱桃红，明快但不会太轻浮。',
    radius: 24,
    light: {
      primary: '#10b981',
      accent: '#ef4444',
      sidebarPrimary: '#113c33',
      glowPrimary: 'rgba(16, 185, 129, 0.17)',
      glowSecondary: 'rgba(239, 68, 68, 0.13)',
    },
    dark: {
      primary: '#34d399',
      accent: '#fb7185',
      sidebarPrimary: '#165247',
      glowPrimary: 'rgba(52, 211, 153, 0.18)',
      glowSecondary: 'rgba(251, 113, 133, 0.14)',
    },
  },
  {
    id: 'violet-splash',
    name: '紫苏苏打',
    description: '紫罗兰和青柠的跳色组合，更像产品化品牌后台。',
    radius: 20,
    light: {
      primary: '#7c3aed',
      accent: '#14b8a6',
      sidebarPrimary: '#2f175f',
      glowPrimary: 'rgba(124, 58, 237, 0.18)',
      glowSecondary: 'rgba(20, 184, 166, 0.13)',
    },
    dark: {
      primary: '#a78bfa',
      accent: '#5eead4',
      sidebarPrimary: '#4c1d95',
      glowPrimary: 'rgba(167, 139, 250, 0.18)',
      glowSecondary: 'rgba(94, 234, 212, 0.14)',
    },
  },
]

export const defaultThemePresetId = themePresets[0].id
