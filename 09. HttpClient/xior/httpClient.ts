/* eslint-disable @typescript-eslint/no-explicit-any */
import xior, { XiorInterceptorRequestConfig } from 'xior';

export const httpClient = xior.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
});

httpClient.interceptors.request.use(
    async (config) => {
        const { data } = await xior.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/tokens`);
        const { accessToken } = data;
        config.headers.Authorization = `Bearer ${accessToken}`;
        return config;
    },
    (error) => Promise.reject(error)
);

let refreshTokenPromise: Promise<string> | null = null;

httpClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as XiorInterceptorRequestConfig & { _retry: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            console.log('>>> Client Xior chuẩn bị refresh token');

            // Nếu refreshTokenPromise đã tồn tại, chờ nó hoàn thành rồi lấy accessToken mới
            if (!refreshTokenPromise) {
                refreshTokenPromise = refreshTokenApi();
            }

            return refreshTokenPromise.then((newAccessToken) => {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return httpClient.request(originalRequest);
            });
        }

        return Promise.reject(error);
    }
);

const refreshTokenApi = async (): Promise<string> => {
    try {
        const getToken = await xior.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/tokens`);
        const { refreshToken } = getToken.data;

        console.log('>>> Client Xior get refresh token', refreshToken);

        if (!refreshToken) throw new Error('No refresh token');

        console.log(
            '>>> Client Xior gọi api express refresh token: ',
            `${process.env.NEXT_PUBLIC_API_URL}/refresh-token`
        );

        const res = await xior.post(
            `${process.env.NEXT_PUBLIC_API_URL}/refresh-token`,
            { refreshToken },
            { credentials: 'same-origin' }
        );

        const { accessToken, refreshToken: newRefreshToken } = res.data;
        await xior.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/tokens`, {
            accessToken,
            refreshToken: newRefreshToken,
        });

        httpClient.defaults.headers.Authorization = `Bearer ${accessToken}`;
        console.log('>>> Client Xior refresh token thành công');

        return accessToken;
    } catch (err) {
        console.log('>>> Client Xior Refresh Error');
        await xior.delete(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/tokens`);
        if (typeof window !== 'undefined') {
            // location.href = '/auth/login';
        }
        throw err;
    } finally {
        refreshTokenPromise = null;
    }
};
