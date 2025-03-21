import { NextRequest, NextResponse } from 'next/server';
import { betterFetch } from '@better-fetch/fetch';
import { Session } from 'better-auth';
import { User } from '@prisma/client';

const adminRoutes = ['/dashboard'];
const authRoutes = ['/auth/sign-in', '/auth/sign-up'];
const privateRoutes = ['/profile'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const { data: session } = await betterFetch<{ session: Session; user: User }>('/api/auth/get-session', {
        baseURL: request.nextUrl.origin,
        headers: {
            cookie: request.headers.get('cookie') || '', // Forward the cookies from the request
        },
    });

    if (authRoutes.includes(pathname) && session) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (privateRoutes.includes(pathname) && !session) {
        return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    if (adminRoutes.includes(pathname)) {
        if (!session) return NextResponse.redirect(new URL('/auth/sign-in', request.url));
        if (session.user.role !== 'admin') {
            const message = encodeURIComponent("You don't have access to this page: ");
            return NextResponse.redirect(new URL(`/?message=${message}&page=${pathname}`, request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};
