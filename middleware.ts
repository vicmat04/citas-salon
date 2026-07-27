import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function redirectWithCookies(url: URL, source: NextResponse) {
  const response = NextResponse.redirect(url)
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  return response
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { pathname, search } = request.nextUrl

  const isAdminLogin = pathname === '/admin/login'
  const tenantMatch = pathname.match(/^\/s\/([^/]+)(?:\/(.*))?$/)
  const tenantSlug = tenantMatch?.[1]
  const tenantRemainder = tenantMatch?.[2]
  const isPublicTenantRoute = tenantRemainder === 'login' || tenantRemainder === 'inactive'

  if (isAdminLogin || isPublicTenantRoute || user) return supabaseResponse

  if (pathname === '/my-salons') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', '/my-salons')
    return redirectWithCookies(url, supabaseResponse)
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    return redirectWithCookies(url, supabaseResponse)
  }

  if (tenantSlug) {
    const url = request.nextUrl.clone()
    url.pathname = `/s/${tenantSlug}/login`
    url.search = ''
    url.searchParams.set('next', `${pathname}${search}`)
    return redirectWithCookies(url, supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/s/:path*', '/my-salons'],
}
