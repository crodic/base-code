import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma';
import { admin, openAPI } from 'better-auth/plugins';
import { Resend } from 'resend';

export const auth = betterAuth({
    user: {
        additionalFields: {
            sex: {
                type: 'string',
                defaultValue: 'male',
                required: false,
            },
        },
    },
    database: prismaAdapter(prisma, {
        provider: 'mysql',
    }),
    plugins: [admin(), openAPI()],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        autoSignIn: false,
    },
    emailVerification: {
        enabled: true,
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'Acme <onboarding@resend.dev>',
                to: user.email,
                subject: 'Verify your email',
                html: `Click to verify email: ${url}`,
            });
        },
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
    },
});
