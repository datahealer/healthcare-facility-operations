'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { authActionClient } from '@kit/next/safe-action';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { LeaveTeamAccountSchema } from '../../schema/leave-team-account.schema';
import { createLeaveTeamAccountService } from '../services/leave-team-account.service';

export const leaveTeamAccountAction = authActionClient
  .schema(LeaveTeamAccountSchema)
  .action(async ({ parsedInput: params, ctx: { user } }) => {
    const service = createLeaveTeamAccountService(
      getSupabaseServerAdminClient(),
    );

    await service.leaveTeamAccount({
      accountId: params.accountId,
      userId: user.id,
    });

    revalidatePath('/home/[account]', 'layout');

    redirect('/home');
  });
