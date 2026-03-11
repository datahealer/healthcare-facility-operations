import 'server-only';

import { notFound } from 'next/navigation';

import { authActionClient } from '@kit/next/safe-action';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { isSuperAdmin } from './is-super-admin';

/**
 * @name adminActionClient
 * @description Safe action client for admin-only actions.
 * Extends authActionClient with super admin verification.
 */
export const adminActionClient = authActionClient.use(async ({ next, ctx }) => {
  const isAdmin = await isSuperAdmin(getSupabaseServerClient());

  if (!isAdmin) {
    notFound();
  }

  return next({ ctx });
});
