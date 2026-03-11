import { cache } from 'react';

import { redirect } from 'next/navigation';

import { createAccountsApi } from '@kit/accounts/api';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createAccountCreationPolicyEvaluator } from '@kit/team-accounts/policies';

import featureFlagsConfig from '~/config/feature-flags.config';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

const shouldLoadAccounts = featureFlagsConfig.enableTeamAccounts;

export type UserWorkspace = Awaited<ReturnType<typeof loadUserWorkspace>>;

/**
 * @name loadUserWorkspace
 * @description
 * Load the user workspace data. It's a cached per-request function that fetches the user workspace data.
 * It can be used across the server components to load the user workspace data.
 */
export const loadUserWorkspace = cache(workspaceLoader);

async function workspaceLoader() {
  const client = getSupabaseServerClient();
  const api = createAccountsApi(client);

  const accountsPromise = shouldLoadAccounts
    ? () => api.loadUserAccounts()
    : () => Promise.resolve([]);

  const workspacePromise = api.getAccountWorkspace();

  const [accounts, workspace, user] = await Promise.all([
    accountsPromise(),
    workspacePromise,
    requireUserInServerComponent(),
  ]);

  // If the user is not found or the workspace is not found, redirect to the home page - this may happen if the JWT is invalid or expired (ex. user deleted?)
  if (!workspace || !user) {
    redirect('/');
  }

  // Check if user can create team accounts (policy check)
  const canCreateTeamAccount = shouldLoadAccounts
    ? await checkCanCreateTeamAccount(user.id)
    : { allowed: false, reason: undefined };

  return {
    accounts,
    workspace,
    user,
    canCreateTeamAccount,
  };
}

/**
 * Check if the user can create a team account based on policies.
 * Preliminary checks run without account name - name validation happens during submission.
 */
async function checkCanCreateTeamAccount(userId: string) {
  const evaluator = createAccountCreationPolicyEvaluator();
  const hasPolicies = await evaluator.hasPoliciesForStage('preliminary');

  if (!hasPolicies) {
    return { allowed: true, reason: undefined };
  }

  const context = {
    timestamp: new Date().toISOString(),
    userId,
    accountName: '',
  };

  const result = await evaluator.canCreateAccount(context, 'preliminary');

  return {
    allowed: result.allowed,
    reason: result.reasons[0],
  };
}
