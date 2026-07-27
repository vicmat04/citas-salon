const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/
const ENCODED_PATH_SYNTAX = /%(?:2e|2f|5c)/i
const DOUBLE_ENCODED_PATH_SYNTAX = /%25(?:2e|2f|5c)/i

export function sanitizeTenantNext(rawNext: string | null, slug: string): string {
  const fallback = `/s/${slug}/dashboard`

  if (!rawNext || rawNext.trim() !== rawNext || !rawNext.startsWith('/')) return fallback
  if (rawNext.startsWith('//') || rawNext.includes('\\') || CONTROL_CHARACTER.test(rawNext)) {
    return fallback
  }

  const withoutFragment = rawNext.split('#', 1)[0]
  const queryStart = withoutFragment.indexOf('?')
  const rawPathname = queryStart === -1 ? withoutFragment : withoutFragment.slice(0, queryStart)

  if (
    rawPathname.includes('//') ||
    ENCODED_PATH_SYNTAX.test(rawPathname) ||
    DOUBLE_ENCODED_PATH_SYNTAX.test(rawPathname)
  ) {
    return fallback
  }

  let decodedPathname: string
  try {
    decodedPathname = decodeURIComponent(rawPathname)
  } catch {
    return fallback
  }

  if (
    CONTROL_CHARACTER.test(decodedPathname) ||
    decodedPathname.includes('\\') ||
    ENCODED_PATH_SYNTAX.test(decodedPathname)
  ) {
    return fallback
  }

  const segments = decodedPathname.split('/')
  if (segments.some((segment) => segment === '.' || segment === '..')) return fallback
  if (segments[0] !== '' || segments[1] !== 's' || segments[2] !== slug || !segments[3]) {
    return fallback
  }

  const loginPath = `/s/${slug}/login`
  if (decodedPathname === loginPath || decodedPathname === `${loginPath}/`) return fallback

  try {
    const normalized = new URL(withoutFragment, 'https://tenant.local')
    if (normalized.origin !== 'https://tenant.local') return fallback
    return `${normalized.pathname}${normalized.search}`
  } catch {
    return fallback
  }
}
