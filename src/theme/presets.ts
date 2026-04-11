export type ThemeMode = 'light' | 'dark'

export interface ThemePalette {
  primary: string
  accent: string
  sidebarPrimary: string
  primaryForeground?: string
  accentForeground?: string
  sidebarPrimaryForeground?: string
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
    description: '明亮湖蓝与嫩柠绿的组合，整体更轻快，也更年轻。',
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
    name: '黑莓慕斯',
    description: '参照莓紫键盘的深莓紫、奶油键帽和粉光高亮，适合更有品牌感的控制台界面。',
    radius: 22,
    light: {
      primary: '#6b56d9',
      accent: '#ff7aa8',
      sidebarPrimary: '#2b215a',
      glowPrimary: 'rgba(107, 86, 217, 0.18)',
      glowSecondary: 'rgba(255, 122, 168, 0.14)',
    },
    dark: {
      primary: '#8c7cff',
      accent: '#ff9dc0',
      sidebarPrimary: '#3a2b78',
      glowPrimary: 'rgba(140, 124, 255, 0.2)',
      glowSecondary: 'rgba(255, 157, 192, 0.15)',
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
    name: '抹茶红豆',
    description: '参照抹茶绿键盘的奶绿机身与红豆点缀，适合层次柔和但需要明确重点的后台。',
    radius: 24,
    light: {
      primary: '#73c78d',
      accent: '#8d2335',
      sidebarPrimary: '#204536',
      glowPrimary: 'rgba(115, 199, 141, 0.18)',
      glowSecondary: 'rgba(141, 35, 53, 0.14)',
    },
    dark: {
      primary: '#97dbac',
      accent: '#c14a5d',
      sidebarPrimary: '#285341',
      glowPrimary: 'rgba(151, 219, 172, 0.19)',
      glowSecondary: 'rgba(193, 74, 93, 0.14)',
    },
  },
  {
    id: 'sea-salt-lemon',
    name: '柠檬海盐',
    description: '参照海盐柠檬甜点的冰蓝外层、柠檬奶心和清亮黄点缀，适合更轻盈的数据界面。',
    radius: 22,
    light: {
      primary: '#4fbfdf',
      accent: '#f0d74b',
      sidebarPrimary: '#20556b',
      primaryForeground: '#f8fafc',
      accentForeground: '#0f172a',
      sidebarPrimaryForeground: '#f8fafc',
      glowPrimary: 'rgba(79, 191, 223, 0.18)',
      glowSecondary: 'rgba(240, 215, 75, 0.15)',
    },
    dark: {
      primary: '#72d8f2',
      accent: '#f7e56f',
      sidebarPrimary: '#173f50',
      primaryForeground: '#f8fafc',
      accentForeground: '#0f172a',
      sidebarPrimaryForeground: '#f8fafc',
      glowPrimary: 'rgba(114, 216, 242, 0.19)',
      glowSecondary: 'rgba(247, 229, 111, 0.16)',
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
