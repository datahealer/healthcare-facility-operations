import { getTranslations } from 'next-intl/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createTeamAccountsApi } from '@kit/team-accounts/api';
import { TeamAccountSettingsContainer } from '@kit/team-accounts/components';

import featuresFlagConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

export const generateMetadata = async () => {
  const t = await getTranslations('teams');
  const title = t('settings.pageTitle');

  return {
    title,
  };
};

interface TeamAccountSettingsPageProps {
  params: Promise<{ account: string }>;
}

const paths = {
  teamAccountSettings: pathsConfig.app.accountSettings,
};

async function TeamAccountSettingsPage(props: TeamAccountSettingsPageProps) {
  const api = createTeamAccountsApi(getSupabaseServerClient());
  const slug = (await props.params).account;
  const data = await api.getTeamAccount(slug);

  const account = {
    id: data.id,
    name: data.name,
    pictureUrl: data.picture_url,
    slug: data.slug as string,
    primaryOwnerUserId: data.primary_owner_user_id,
  };

  const features = {
    enableTeamDeletion: featuresFlagConfig.enableTeamDeletion,
  };

  return (
    <div className={'flex max-w-2xl flex-1 flex-col'}>
      <TeamAccountSettingsContainer
        account={account}
        paths={paths}
        features={features}
      />
    </div>
  );
}

export default TeamAccountSettingsPage;
