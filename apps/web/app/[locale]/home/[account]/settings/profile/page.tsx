import { getTranslations } from 'next-intl/server';

import { PersonalAccountSettingsContainer } from '@kit/accounts/personal-account-settings';

import authConfig from '~/config/auth.config';
import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

const showEmailOption =
  authConfig.providers.password ||
  authConfig.providers.magicLink ||
  authConfig.providers.otp;

const features = {
  showLinkEmailOption: showEmailOption,
  enablePasswordUpdate: authConfig.providers.password,
  enableAccountDeletion: featureFlagsConfig.enableAccountDeletion,
  enableAccountLinking: authConfig.enableIdentityLinking,
};

const providers = authConfig.providers.oAuth;

export const generateMetadata = async () => {
  const t = await getTranslations('account');
  const title = t('settingsTab');

  return {
    title,
  };
};

interface TeamProfileSettingsPageProps {
  params: Promise<{ account: string }>;
}

async function TeamProfileSettingsPage({
  params,
}: TeamProfileSettingsPageProps) {
  const [user, { account }] = await Promise.all([
    requireUserInServerComponent(),
    params,
  ]);

  const profilePath = pathsConfig.app.accountProfileSettings.replace(
    '[account]',
    account,
  );

  const paths = {
    callback: pathsConfig.auth.callback + `?next=${profilePath}`,
  };

  return (
    <div className={'flex w-full flex-1 flex-col lg:max-w-2xl'}>
      <PersonalAccountSettingsContainer
        userId={user.id}
        features={features}
        paths={paths}
        providers={providers}
      />
    </div>
  );
}

export default TeamProfileSettingsPage;
