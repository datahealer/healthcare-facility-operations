import 'server-only';

import { redirect } from 'next/navigation';

import { createSafeActionClient } from 'next-safe-action';

import { verifyCaptchaToken } from '@kit/auth/captcha/server';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const baseClient = createSafeActionClient({
  handleServerError: (error) => error.message,
});

/**
 * @name publicActionClient
 * @description Safe action client for public actions that don't require authentication.
 */
export const publicActionClient = baseClient;

/**
 * @name authActionClient
 * @description Safe action client for authenticated actions. Adds user context.
 */
export const authActionClient = baseClient.use(async ({ next }) => {
  const auth = await requireUser(getSupabaseServerClient());

  if (!auth.data) {
    redirect(auth.redirectTo);
  }

  return next({ ctx: { user: auth.data } });
});

/**
 * @name captchaActionClient
 * @description Safe action client for actions that require CAPTCHA and authentication.
 */
export const captchaActionClient = baseClient.use(
  async ({ next, clientInput }) => {
    const input = clientInput as Record<string, unknown>;
    const token =
      typeof input?.captchaToken === 'string' ? input.captchaToken : '';

    await verifyCaptchaToken(token);

    const auth = await requireUser(getSupabaseServerClient());

    if (!auth.data) {
      redirect(auth.redirectTo);
    }

    return next({ ctx: { user: auth.data } });
  },
);
