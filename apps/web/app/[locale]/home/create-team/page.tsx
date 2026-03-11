import { redirect } from 'next/navigation';

import { createAccountsApi } from '@kit/accounts/api';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { AppLogo } from '~/components/app-logo';
import featuresFlagConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { CreateFirstTeamForm } from './_components/create-first-team-form';

async function CreateTeamPage() {
  const data = await loadData();

  if (data.redirectTo) {
    redirect(data.redirectTo);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-y-8">
      <AppLogo />

      <CreateFirstTeamForm />
    </div>
  );
}

export default CreateTeamPage;

async function loadData() {
  await requireUserInServerComponent();

  if (!featuresFlagConfig.enableTeamsOnly) {
    return { redirectTo: pathsConfig.app.home };
  }

  const client = getSupabaseServerClient();
  const api = createAccountsApi(client);
  const accounts = await api.loadUserAccounts();

  if (accounts.length > 0 && accounts[0]?.value) {
    return {
      redirectTo: pathsConfig.app.accountHome.replace(
        '[account]',
        accounts[0].value,
      ),
    };
  }

  return { redirectTo: null };
}
