import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If there is no session and the user is trying to access the dashboard/app
  if (!session && (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/invoices') ||
    req.nextUrl.pathname.startsWith('/exceptions') ||
    req.nextUrl.pathname.startsWith('/erp') ||
    req.nextUrl.pathname.startsWith('/settings')
  )) {
    // Check if it's a demo request
    if (req.nextUrl.searchParams.get('demo') === 'true') {
      return res;
    }

    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/invoices/:path*', '/exceptions/:path*', '/erp/:path*', '/settings/:path*'],
}
