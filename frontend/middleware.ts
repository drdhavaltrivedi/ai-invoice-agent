import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If there is no session and the user is trying to access protected paths
  const protectedPaths = ['/dashboard', '/invoices', '/exceptions', '/erp', '/settings']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (!session && isProtectedPath) {
    // Check if it's a demo request (via param or cookie)
    const isDemoParam = request.nextUrl.searchParams.get("demo") === "true";
    const isDemoCookie = request.cookies.get("invoice_demo_mode")?.value === "true";

    if (isDemoParam || isDemoCookie) {
      return supabaseResponse;
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/invoices/:path*', '/exceptions/:path*', '/erp/:path*', '/settings/:path*'],
}
