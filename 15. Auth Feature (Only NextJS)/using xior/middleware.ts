import { NextResponse } from 'next/server';
import type { MiddlewareConfig, NextRequest } from 'next/server';
import { JWTPayload } from 'jose';
import xior from 'xior';
import { decodeToken } from './lib/utils';
import { APIS } from './utils/constants';

const AUTH_ROUTE = ['/auth/login'];
const PRIVATE_ROUTE = ['/client-profile', '/server-profile', '/update-profile'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const refreshToken = request.cookies.get('refreshToken')?.value || '';
    const accessToken = request.cookies.get('accessToken')?.value || '';

    //! Cách 1: Check thủ công headers
    // TODO: Bỏ qua các request thuộc server action
    // TODO: (các request thuộc server action cần kiểm tra cứng token vì NextResponse.redirect() không hoạt động với server action)
    // const isServerAction = request.headers.has('next-action');
    // if (isServerAction) return NextResponse.next();

    console.log('>>> Vào middleware với pathname: ', pathname);

    if (AUTH_ROUTE.includes(pathname) && refreshToken) {
        return NextResponse.redirect(new URL('/client-profile', request.url));
    }

    if (PRIVATE_ROUTE.includes(pathname)) {
        console.log('>>> Private route: ', pathname);
        // TODO: Case 1: Access hết hạn cần refresh thì refresh ngay (Trường hợp đang dùng website mà hết hạn)
        if (refreshToken && !accessToken) {
            console.log('>>> Case 1: Access token hết hạn cần refresh ngay lập tức');
            return await refreshTokenMiddleware(request);
        }

        // TODO: Case 2: Logout khi không có refresh token (Trường hợp lâu ngày không đăng nhập)
        if (!refreshToken) {
            console.log('>>> Case 2: Không có refresh token >>> Đăng xuất');
            const msg = encodeURIComponent('Vui lòng đăng nhập!');
            const response = NextResponse.redirect(new URL(`/auth/login?msg=${msg}`, request.url));
            response.cookies.delete('accessToken');
            return response;
        }

        // TODO: Case 3: Refresh token khi access gần hết hạn (Cần refresh trước khi vào server components)
        if (accessToken && refreshToken) {
            // TODO: decode token token để lấy exp (Nếu server có trả về exp thì skip bước này)
            const payload = decodeToken(accessToken);
            if (payload === null) {
                console.log('>>> Case 3.1: Access token bị lỗi >>> Đăng xuất');
                const msg = encodeURIComponent('Phiên đăng nhập hết hạn!');
                const response = NextResponse.redirect(new URL(`/auth/login?msg=${msg}`, request.url));
                response.cookies.delete('accessToken');
                response.cookies.delete('refreshToken');
                return response;
            }

            const tokenExpiresAt = (payload.exp as number) * 1000;
            const now = Date.now();
            const oneMinuteLater = now + 1 * 60 * 1000;

            // TODO: Kiểm tra token gần hết hạn thì refresh
            if (tokenExpiresAt < oneMinuteLater) {
                console.log('>>> Case 3.2: Access token gần hết hạn >>> Làm mới token');
                return await refreshTokenMiddleware(request);
            }

            console.log('>>> Case 4: Access token còn hiệu lực không cần refresh');
        }
    }

    return NextResponse.next();
}

const refreshTokenMiddleware = async (request: NextRequest) => {
    const refreshToken = request.cookies.get('refreshToken')?.value || '';
    try {
        console.log('>>> Middleware gọi api express refresh token. ');
        const { data } = await xior.post(APIS.EXPRESS_SERVER_TOKEN_URL, {
            token: refreshToken,
        });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;
        console.log('>>> Middleware Refresh token thành công', newAccessToken.slice(-5), newRefreshToken.slice(-5));

        const { exp: expAccessToken } = decodeToken(newAccessToken) as JWTPayload;
        const { exp: expRefreshToken } = decodeToken(newRefreshToken) as JWTPayload;

        if (!expAccessToken || !expRefreshToken) {
            return unauthorizedResponse(request);
        }

        const response = NextResponse.next();
        response.cookies.set('accessToken', newAccessToken, {
            httpOnly: true,
            path: '/',
            expires: new Date(expAccessToken * 1000),
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        response.cookies.set('refreshToken', newRefreshToken, {
            httpOnly: true,
            path: '/',
            expires: new Date(expAccessToken * 1000),
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return response;
    } catch (error) {
        console.log(error);
        return unauthorizedResponse(request);
    }
};

const unauthorizedResponse = (request: NextRequest) => {
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    return response;
};

export const config: MiddlewareConfig = {
    matcher: [
        {
            source: '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
            //! Cách 2: Skip trong config
            missing: [{ type: 'header', key: 'next-action' }],
        },
    ],
};
