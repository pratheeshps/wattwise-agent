import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import nodemailer from 'nodemailer';
import { prisma } from './prisma.js';
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32)
  throw Error('BETTER_AUTH_SECRET must be at least 32 characters.');
async function sendVerificationEmail({ user, url }) {
  if (!process.env.SMTP_URL || !process.env.SMTP_FROM)
    throw Error('Configure SMTP_URL and SMTP_FROM.');
  const mail = nodemailer.createTransport(process.env.SMTP_URL);
  await mail.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: 'Verify your Wattwise email',
    text: `Verify your Wattwise account: ${url}`,
    html: `<p>Welcome to Wattwise.</p><p><a href="${url}">Verify your email</a> to activate your account.</p>`,
  });
}
export const auth = betterAuth({
  appName: 'Wattwise',
  secret,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  emailVerification: {
    sendVerificationEmail,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: 'database',
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 3 },
      '/forget-password': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },
      '/change-password': { window: 60, max: 5 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 60,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean),
});
