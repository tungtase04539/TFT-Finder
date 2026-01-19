import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/verify'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if user profile exists
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('verified, has_google, has_password, email')
          .eq('id', user.id)
          .single()
        
        // Detect auth method used
        const identities = user.identities || []
        const hasGoogleIdentity = identities.some(i => i.provider === 'google')
        const hasPasswordIdentity = identities.some(i => i.provider === 'email')
        
        // Update profile flags if needed
        const updates: any = {}
        if (hasGoogleIdentity && !profile?.has_google) {
          updates.has_google = true
        }
        if (hasPasswordIdentity && !profile?.has_password) {
          updates.has_password = true
        }
        if (user.email && user.email !== profile?.email) {
          updates.email = user.email
        }
        
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
        }
        
        // If profile exists and verified, go to queue
        if (profile?.verified) {
          return NextResponse.redirect(`${origin}/queue`)
        }
        
        // Create profile if doesn't exist
        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            verified: false,
            has_google: hasGoogleIdentity,
            has_password: hasPasswordIdentity,
            email: user.email,
          })
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
