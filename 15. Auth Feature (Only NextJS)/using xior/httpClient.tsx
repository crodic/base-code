import xior, { XiorInterceptorRequestConfig } from 'xior';
import chalk from 'chalk';
import { APIS } from '@/utils/constants';

export const httpClient = xior.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL!,
    headers: {
        'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
});

httpClient.interceptors.request.use(
    async (config) => {
        const { data } = await xior.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/tokens`);
        console.log(chalk.bgBlue('>>> httpClient interceptor request lấy token từ cookies set vào headers'));
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

            console.log(
                chalk.bgRed(
                    '>>> httpClient interceptor response chuẩn bị refresh token với mã lỗi:',
                    error.response.status
                )
            );

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
        const getToken = await xior.get<{ accessToken: string | undefined; refreshToken: string | undefined }>(
            APIS.NEXT_SERVER_TOKEN_URL
        );
        const { refreshToken } = getToken.data;

        if (!refreshToken) throw new Error('No refresh token');

        console.log(
            chalk.bgGreen('>>> httpClient interceptor response lấy refresh token hiện tại', refreshToken.slice(-5))
        );

        console.log(chalk.bgGreen('>>> httpClient interceptor response gọi api express để refresh token'));

        const res = await xior.post(
            APIS.EXPRESS_SERVER_TOKEN_URL,
            { token: refreshToken },
            { credentials: 'same-origin' }
        );

        console.log(chalk.bgGreen('>>> httpClient interceptor response gọi api express refresh token thành công'));

        const { accessToken, refreshToken: newRefreshToken } = res.data;
        await xior.post(APIS.NEXT_SERVER_TOKEN_URL, {
            accessToken,
            refreshToken: newRefreshToken,
        });

        console.log(
            chalk.bgGreen('>>> httpClient interceptor response gọi api next server để update token thành công')
        );

        httpClient.defaults.headers.Authorization = `Bearer ${accessToken}`;

        console.log(chalk.bgGreen('>>> httpClient interceptor response refresh token hoàn tất'));

        return accessToken;
    } catch (err) {
        console.log(chalk.bgRed('>>> httpClient interceptor response refresh token bị lỗi'));
        await xior.delete(APIS.NEXT_SERVER_TOKEN_URL);
        if (typeof window !== 'undefined') {
            location.href = '/auth/login';
        }
        throw err;
    } finally {
        refreshTokenPromise = null;
    }
};
