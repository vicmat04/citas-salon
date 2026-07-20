'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function loginWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nextUrl = formData.get('next') as string || '/login'

  const headersList = await headers()
  const referer = headersList.get('referer') || '/login'

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const url = new URL(referer)
    url.searchParams.set('error', error.message)
    return redirect(url.toString())
  }

  return redirect(nextUrl)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/')
}
