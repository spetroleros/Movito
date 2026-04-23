import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Rutas públicas
  if (pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // Verificar si hay sesión via cookie de Supabase
  const hasSession = request.cookies.getAll().some(c => 
    c.name.includes('supabase') || c.name.includes('sb-')
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
