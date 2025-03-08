import { RefreshTokenResponse, UserLogin } from '@/types/auth';
import { jwtDecode } from 'jwt-decode';
import { NextAuthOptions, User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';

const loginUser = async ({ username, password }: { username: string; password: string }) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, expiresInMins: 1 }),
        credentials: 'include',
    });

    const user: UserLogin | { message: string } = await res.json();

    if (!res.ok) throw new Error((user as { message: string }).message as string);

    return user as UserLogin;
};

export const authOptions: NextAuthOptions = {
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60,
    },
    providers: [
        Credentials({
            name: 'Animazing',
            credentials: {
                username: { label: 'Username', type: 'text', placeholder: 'Enter you username' },
                password: { label: 'Password', type: 'password', placeholder: 'Enter your password' },
            },
            authorize: async (credentials) => {
                const { username, password } = credentials as {
                    username: string | undefined;
                    password: string | undefined;
                };
                if (!username || !password) {
                    throw new Error('Email or Password is required');
                }

                const res = await loginUser({ username, password });

                const user: User = {
                    id: res.id,
                    username: res.username,
                    name: res.firstName + ' ' + res.lastName,
                    email: res.email,
                    image: res.image,
                    accessToken: res.accessToken,
                    refreshToken: res.refreshToken,
                    role: 'USER',
                };

                return user;
            },
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
            profile(profile) {
                //TODO: Call backend api get or create user
                return {
                    ...profile,
                    role: 'USER',
                };
            },
        }),
    ],
    callbacks: {
        jwt: async ({ user, token, trigger, session, account }) => {
            if (trigger === 'update') {
                return {
                    ...token,
                    ...session,
                };
            }

            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.role = user.role;
                token.provider = account?.provider as string;
                return token;
            } else if (Date.now() < (jwtDecode(token.accessToken).exp as number) * 1000) {
                return token;
            } else {
                if (!token.refreshToken) {
                    console.log('>>> refresh token is missing <<<');
                    throw new Error('Missing Token');
                }

                try {
                    const res = await fetch('https://dummyjson.com/auth/refresh', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            refreshToken: token.refreshToken,
                            expiresInMins: 1, // optional, defaults to 60
                        }),
                    });
                    if (!res.ok) {
                        throw new Error('Session expired. Please login again.');
                    }
                    const payload: RefreshTokenResponse = await res.json();
                    return {
                        ...token,
                        accessToken: payload.accessToken,
                        refreshToken: payload.refreshToken,
                    };
                } catch (error) {
                    token.error = (error as Error).message || 'Session expired. Please login again.';
                    return token;
                }
            }
        },
        session: async (params) => {
            const { token, session } = params;

            session.user.id = token.id as number;
            session.user.accessToken = token.accessToken;
            session.user.refreshToken = token.refreshToken;
            session.user.role = token.role;
            session.user.error = token.error;

            return Promise.resolve(session);
        },
        signIn: async (params) => {
            const { account } = params;
            if (account?.provider !== 'credentials') return true;
            return true;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/auth/login',
    },
};
