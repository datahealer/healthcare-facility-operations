import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import featuresFlagConfig from '~/config/feature-flags.config';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { SettingsSubNavigation } from './_components/settings-sub-navigation';

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ account: string }>;
}

async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const { account } = await params;

  return (
    <PageBody>
      <div>
        <TeamAccountLayoutPageHeader
          account={account}
          title={<Trans i18nKey={'teams.settings.pageTitle'} />}
          description={<AppBreadcrumbs />}
        />

        {featuresFlagConfig.enableTeamsOnly && (
          <div className="mb-8">
            <SettingsSubNavigation account={account} />
          </div>
        )}
      </div>

      {children}
    </PageBody>
  );
}

export default SettingsLayout;
