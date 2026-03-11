import { use } from 'react';

import { getTranslations } from 'next-intl/server';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { DashboardDemo } from './_components/dashboard-demo';
import { TeamAccountLayoutPageHeader } from './_components/team-account-layout-page-header';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const t = await getTranslations('teams');
  const title = t('home.pageTitle');

  return {
    title,
  };
};

function TeamAccountHomePage({ params }: TeamAccountHomePageProps) {
  const account = use(params).account;

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common.routes.dashboard'} />}
        description={<AppBreadcrumbs />}
      />

      <DashboardDemo />
    </PageBody>
  );
}

export default TeamAccountHomePage;
