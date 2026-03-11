import { getTranslations } from 'next-intl/server';

import { PricingTable } from '@kit/billing-gateway/marketing';

import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import billingConfig from '~/config/billing.config';
import pathsConfig from '~/config/paths.config';

export const generateMetadata = async () => {
  const t = await getTranslations('marketing');

  return {
    title: t('pricing'),
  };
};

const paths = {
  signUp: pathsConfig.auth.signUp,
  return: pathsConfig.app.home,
};

async function PricingPage() {
  const t = await getTranslations('marketing');

  return (
    <div className={'flex flex-col space-y-8'}>
      <SitePageHeader title={t('pricing')} subtitle={t('pricingSubtitle')} />

      <div className={'container mx-auto pb-8 xl:pb-16'}>
        <PricingTable paths={paths} config={billingConfig} />
      </div>
    </div>
  );
}

export default PricingPage;
