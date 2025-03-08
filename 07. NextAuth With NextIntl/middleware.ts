/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import createIntlMiddleware from 'next-intl/middleware';
import { getToken } from 'next-auth/jwt';

const locales = ['en', 'vi'];

const publicPages = ['/'];
const authPages = ['/auth/login', '/auth/2fa'];
const roleBasedPages = ['/admin'];

const intlMiddleware = createIntlMiddleware({
    locales,
    localePrefix: 'always',
    defaultLocale: 'en',
});

const authMiddleware = withAuth(
    function onSuccess(req) {
        const response = intlMiddleware(req);
        // TODO: Custom Headers
        response.headers.set('x-current-path', req.nextUrl.pathname);
        return response;
    },
    {
        callbacks: {
            authorized: async ({ token }) => {
                return token != null;
            },
        },
        pages: {
            signIn: '/auth/login',
        },
    }
);

export default async function middleware(req: NextRequest) {
    const token = await getToken({ req });
    const isAuthenticated = !!token;

    // TODO: Chặn truy cập page Login/Register khi đã đăng nhập
    const loginOrRegisterPathnameRegex = RegExp(
        `^(/(${locales.join('|')}))?(${authPages.flatMap((p) => (p === '/' ? ['', '/'] : p)).join('|')})/?$`,
        'i'
    );
    // TODO: Page không cần đăng nhập vẫn truy cập được
    const publicPathnameRegex = RegExp(
        `^(/(${locales.join('|')}))?(${publicPages.flatMap((p) => (p === '/' ? ['', '/'] : p)).join('|')})/?$`,
        'i'
    );

    // TODO: Role Base với các path được định nghĩa cứng
    const roleBasedPathnameRegex = RegExp(
        `^(/(${locales.join('|')}))?(${roleBasedPages.flatMap((p) => (p === '/' ? ['', '/'] : p)).join('|')})/?$`,
        'i'
    );

    // TODO: Role Base với các path có /admin/* hoặc /boss/*
    const roleBasePathname = RegExp(`^(/(${locales.join('|')}))?(/(admin|boss)(?:/[^/]+)*)/?$`, 'i');

    const isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);
    const isLoginOrRegisterPage = loginOrRegisterPathnameRegex.test(req.nextUrl.pathname);
    const isRoleBasedPage = roleBasePathname.test(req.nextUrl.pathname);

    if (isRoleBasedPage && !isAuthenticated) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
    } else if (isRoleBasedPage && isAuthenticated && token?.role !== 'ADMIN') {
        const errorMessage = encodeURIComponent('You do not have permission to access this page.');
        return NextResponse.redirect(new URL(`/?error=${errorMessage}`, req.url));
    }

    if (isPublicPage) {
        return intlMiddleware(req);
    }

    if (isLoginOrRegisterPage) {
        if (isAuthenticated) {
            return NextResponse.redirect(new URL('/', req.url));
        }
        return intlMiddleware(req);
    }

    return (authMiddleware as any)(req);
}

export const config = {
    matcher: [
        // match all routes except static files and APIs
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
