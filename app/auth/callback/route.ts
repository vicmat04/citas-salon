import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Sync user with Prisma if it doesn't exist
      const existingUser = await prisma.user.findUnique({
        where: { supabaseUid: data.user.id }
      })

      if (!existingUser) {
        // By default, a user created via email callback who is not admin
        // will be marked as salon_owner.
        // The admin is seeded directly.
        await prisma.user.create({
          data: {
            supabaseUid: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
            role: 'salon_owner'
          }
        })
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalhost = process.env.NODE_ENV === 'development'

      if (isLocalhost) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Invalid_Auth_Code`)
}
