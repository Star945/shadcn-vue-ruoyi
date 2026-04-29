const allowedTags = new Set([
  'A',
  'BLOCKQUOTE',
  'BR',
  'CODE',
  'DIV',
  'EM',
  'H1',
  'H2',
  'H3',
  'HR',
  'IFRAME',
  'IMG',
  'LI',
  'MARK',
  'OL',
  'P',
  'PRE',
  'SPAN',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
  'INPUT',
  'LABEL',
])

const globalAttrs = new Set(['class'])
const tagAttrs: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
  IMG: new Set(['src', 'alt', 'title']),
  SPAN: new Set(['style']),
  P: new Set(['style']),
  H1: new Set(['style']),
  H2: new Set(['style']),
  H3: new Set(['style']),
  DIV: new Set(['data-embed-video']),
  IFRAME: new Set(['src', 'title', 'allow', 'allowfullscreen', 'frameborder', 'referrerpolicy']),
  TABLE: new Set(['data-table-root']),
  INPUT: new Set(['type', 'checked', 'disabled']),
  LABEL: new Set(['data-task-item']),
}

const allowedClasses = new Set([
  'has-text-align-left',
  'has-text-align-center',
  'has-text-align-right',
  'rich-video-embed',
  'rich-task-item',
  'rich-task-checkbox',
  'rich-table-wrap',
])

const allowedTextColors = new Set([
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#0f172a',
  '#475569',
])

const allowedHighlightColors = new Set([
  '#fef08a',
  '#fde68a',
  '#bfdbfe',
  '#bbf7d0',
  '#fecdd3',
  '#e9d5ff',
])

const allowedVideoHosts = new Set([
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
  'www.bilibili.com',
  'player.bilibili.com',
])

const allowedImageProtocols = new Set(['http:', 'https:', 'data:', 'blob:'])
const allowedLinkProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function resolveRichAssetUrl(value: string) {
  const raw = value.trim()
  if (!raw || /^(https?:|data:|blob:|mailto:|tel:|#)/i.test(raw)) {
    return raw
  }
  const base = String(import.meta.env.VITE_APP_BASE_API ?? '').trim()
  if (!base) {
    return raw
  }
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`
}

function normalizeUrl(value: string, base = typeof window === 'undefined' ? 'http://localhost' : window.location.origin) {
  try {
    return new URL(value, base)
  }
  catch {
    return null
  }
}

function isAllowedProtocol(value: string, protocols: Set<string>) {
  const normalized = normalizeUrl(value)
  if (!normalized) {
    return false
  }
  if (value.startsWith('#')) {
    return true
  }
  return protocols.has(normalized.protocol)
}

function normalizeIframeUrl(raw: string) {
  const url = normalizeUrl(raw)
  if (!url || !allowedVideoHosts.has(url.hostname)) {
    return ''
  }

  if (url.hostname === 'youtu.be') {
    const videoId = url.pathname.replace(/^\//, '')
    return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
  }

  if (url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com') {
    if (url.pathname === '/watch') {
      const videoId = url.searchParams.get('v')
      return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
    }
    if (url.pathname.startsWith('/embed/')) {
      return url.toString()
    }
  }

  if (url.hostname === 'vimeo.com') {
    const videoId = url.pathname.replace(/^\//, '')
    return videoId ? `https://player.vimeo.com/video/${videoId}` : ''
  }

  if (url.hostname === 'player.vimeo.com' || url.hostname === 'player.bilibili.com') {
    return url.toString()
  }

  if (url.hostname === 'www.bilibili.com' && url.pathname.startsWith('/video/')) {
    const videoId = url.pathname.split('/').filter(Boolean).at(-1)
    return videoId ? `https://player.bilibili.com/player.html?bvid=${videoId}` : ''
  }

  return url.toString()
}

function sanitizeStyle(value: string) {
  const rules = value.split(';').map(rule => rule.trim()).filter(Boolean)
  const safeRules: string[] = []

  for (const rule of rules) {
    const [rawProp, rawValue] = rule.split(':')
    if (!rawProp || !rawValue) {
      continue
    }
    const prop = rawProp.trim().toLowerCase()
    const currentValue = rawValue.trim().toLowerCase()

    if (prop === 'text-align' && ['left', 'center', 'right'].includes(currentValue)) {
      safeRules.push(`text-align:${currentValue}`)
      continue
    }

    if (prop === 'color') {
      const hex = currentValue.replace(/\s+/g, '')
      if (allowedTextColors.has(hex)) {
        safeRules.push(`color:${hex}`)
      }
      continue
    }

    if (prop === 'background-color') {
      const hex = currentValue.replace(/\s+/g, '')
      if (allowedHighlightColors.has(hex)) {
        safeRules.push(`background-color:${hex}`)
      }
    }
  }

  return safeRules.join(';')
}

function sanitizeClassNames(value: string) {
  return value
    .split(/\s+/)
    .map(item => item.trim())
    .filter(item => allowedClasses.has(item))
    .join(' ')
}

function cleanNode(node: Node, documentRef: Document) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(true)
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return documentRef.createTextNode('')
  }

  const element = node as HTMLElement
  const tagName = element.tagName.toUpperCase()
  if (!allowedTags.has(tagName)) {
    const fragment = documentRef.createDocumentFragment()
    Array.from(element.childNodes).forEach((child) => {
      const cleaned = cleanNode(child, documentRef)
      if (cleaned) fragment.appendChild(cleaned)
    })
    return fragment
  }

  const next = documentRef.createElement(tagName.toLowerCase())
  const allowed = new Set([...(tagAttrs[tagName] ?? []), ...globalAttrs])

  Array.from(element.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase()
    if (name.startsWith('on')) {
      return
    }
    if (!allowed.has(attribute.name) && !allowed.has(name)) {
      return
    }

    if (name === 'class') {
      const className = sanitizeClassNames(attribute.value)
      if (className) {
        next.setAttribute('class', className)
      }
      return
    }

    if (name === 'style') {
      const style = sanitizeStyle(attribute.value)
      if (style) {
        next.setAttribute('style', style)
      }
      return
    }

    if (tagName === 'A' && name === 'href') {
      const href = resolveRichAssetUrl(attribute.value)
      if (!isAllowedProtocol(href, allowedLinkProtocols)) {
        return
      }
      next.setAttribute('href', href)
      return
    }

    if (tagName === 'IMG' && name === 'src') {
      const src = resolveRichAssetUrl(attribute.value)
      if (!isAllowedProtocol(src, allowedImageProtocols)) {
        return
      }
      next.setAttribute('src', src)
      return
    }

    if (tagName === 'IFRAME' && name === 'src') {
      const src = normalizeIframeUrl(attribute.value)
      if (!src) {
        return
      }
      next.setAttribute('src', src)
      return
    }

    if (tagName === 'A' && name === 'target') {
      if (['_blank', '_self'].includes(attribute.value)) {
        next.setAttribute('target', attribute.value)
      }
      return
    }

    if (tagName === 'A' && name === 'rel') {
      next.setAttribute('rel', 'noopener noreferrer nofollow')
      return
    }

    if (tagName === 'IFRAME' && ['allow', 'title', 'referrerpolicy'].includes(name)) {
      next.setAttribute(name, attribute.value)
      return
    }

    if (tagName === 'IFRAME' && (name === 'allowfullscreen' || name === 'frameborder')) {
      next.setAttribute(name, attribute.value || 'true')
      return
    }

    if (tagName === 'INPUT' && name === 'type') {
      if (attribute.value === 'checkbox') {
        next.setAttribute('type', 'checkbox')
      }
      return
    }

    if (tagName === 'INPUT' && (name === 'checked' || name === 'disabled')) {
      next.setAttribute(name, name)
      return
    }

    if (['alt', 'title', 'data-embed-video', 'data-task-item', 'data-table-root'].includes(name)) {
      next.setAttribute(name, attribute.value)
    }
  })

  if (tagName === 'A' && next.getAttribute('href')) {
    if (!next.getAttribute('rel')) {
      next.setAttribute('rel', 'noopener noreferrer nofollow')
    }
    if (!next.getAttribute('target')) {
      next.setAttribute('target', '_blank')
    }
  }

  if (tagName === 'IFRAME' && !next.getAttribute('allow')) {
    next.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
  }
  if (tagName === 'IFRAME' && !next.getAttribute('referrerpolicy')) {
    next.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  }
  if (tagName === 'IFRAME' && !next.getAttribute('allowfullscreen')) {
    next.setAttribute('allowfullscreen', 'true')
  }

  Array.from(element.childNodes).forEach((child) => {
    const cleaned = cleanNode(child, documentRef)
    if (cleaned) {
      next.appendChild(cleaned)
    }
  })

  return next
}

export function sanitizeRichHtml(html: string) {
  if (!html.trim()) {
    return '<p></p>'
  }

  if (typeof window === 'undefined') {
    return html
  }

  const parser = new DOMParser()
  const documentRef = parser.parseFromString(html, 'text/html')
  const cleanedDocument = document.implementation.createHTMLDocument('sanitized-rich-html')
  const fragment = cleanedDocument.createDocumentFragment()

  Array.from(documentRef.body.childNodes).forEach((node) => {
    const cleaned = cleanNode(node, cleanedDocument)
    if (cleaned) {
      fragment.appendChild(cleaned)
    }
  })

  const container = cleanedDocument.createElement('div')
  container.appendChild(fragment)
  return container.innerHTML || '<p></p>'
}

export function prepareRichHtml(html: string) {
  return sanitizeRichHtml(html)
}

export function buildVideoEmbedHtml(rawUrl: string) {
  const src = normalizeIframeUrl(rawUrl.trim())
  if (!src) {
    return ''
  }

  return `<div class="rich-video-embed" data-embed-video="true"><iframe src="${src}" title="视频内容" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="true" frameborder="0" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
}
