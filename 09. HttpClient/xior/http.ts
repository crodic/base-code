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
        const { data } = await xior.get('http://localhost:3000/api/auth/tokens');
        const { accessToken } = data;
        config.headers.Authorization = `Bearer ${accessToken}`;
        return config;
    },
    (error) => Promise.reject(error)
);

let refreshTokenPromise: Promise<void> | null = null;

httpClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as XiorInterceptorRequestConfig & { _retry?: boolean };
        if (error.response?.status === 401 && !originalRequest._retry) {
            console.log('>>> Xior chuẩn bị refresh token');
            originalRequest._retry = true;
            if (!refreshTokenPromise) {
                refreshTokenPromise = refreshTokenApi();
            } else {
                console.log('>>> Xior đang refresh token');
            }
            console.log('>>> Chuẩn bị gọi lại request');
            return refreshTokenPromise.then(() => {
                originalRequest.headers.Authorization = httpClient.defaults.headers.Authorization;
                console.log('>>> Xior gọi lại request', originalRequest);
                return httpClient.request(originalRequest);
            });
        }
        return Promise.reject(error);
    }
);

const refreshTokenApi = async (): Promise<void> => {
    const getToken = await xior.get('http://localhost:3000/api/auth/tokens');
    const { refreshToken, remember } = getToken.data;
    console.log('>>> Xior lấy Refresh Token', refreshToken);

    if (!refreshToken) throw new Error('No refresh token');

    console.log('>>> Xior Client Start Refresh Token');

    refreshTokenPromise = xior
        .post(
            'https://dummyjson.com/auth/refresh',
            {
                refreshToken,
                expiresInMins: remember === 'true' ? 5 : 2,
            },
            { credentials: 'same-origin' }
        )
        .then(async (res) => {
            const { accessToken, refreshToken } = res.data;
            await xior.post('http://localhost:3000/api/auth/tokens', { accessToken, refreshToken });
            httpClient.defaults.headers.Authorization = `Bearer ${accessToken}`;
            console.log('>>> Xior Client Refresh Token Thành công');
        })
        .catch(async () => {
            console.log('>>> Xior Client Refresh Error');
            await xior.delete('http://localhost:3000/api/auth/tokens');
            if (typeof window !== 'undefined') {
                location.href = '/auth/login';
            }
        })
        .finally(() => {
            refreshTokenPromise = null;
        });
};
