import { getTranslations } from 'next-intl/server';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

// local imports
import { HomeLayoutPageHeader } from './_components/home-page-header';

export const generateMetadata = async () => {
  const t = await getTranslations('account');
  const title = t('homePage');

  return {
    title,
  };
};

function UserHomePage() {
  return (
    <PageBody>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'common.routes.home'} />}
        description={<Trans i18nKey={'common.homeTabDescription'} />}
      />
    </PageBody>
  );
}

export default UserHomePage;
