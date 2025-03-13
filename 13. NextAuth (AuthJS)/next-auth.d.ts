/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        user: {
            id: number;
            accessToken: string;
            refreshToken: string;
            role: 'USER' | 'ADMIN';
            error?: string;
        };
    }
    interface User {
        id: number;
        username: string;
        accessToken: string;
        refreshToken: string;
        role: 'USER' | 'ADMIN';
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        accessToken: string;
        refreshToken: string;
        id?: string | number;
        role: 'USER' | 'ADMIN';
        provider: string;
        error?: string;
    }
}
