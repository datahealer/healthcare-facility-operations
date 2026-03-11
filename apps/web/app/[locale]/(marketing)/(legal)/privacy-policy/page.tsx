import { getTranslations } from 'next-intl/server';

import { SitePageHeader } from '~/(marketing)/_components/site-page-header';

export async function generateMetadata() {
  const t = await getTranslations('marketing');

  return {
    title: t('privacyPolicy'),
  };
}

async function PrivacyPolicyPage() {
  const t = await getTranslations('marketing');

  return (
    <div>
      <SitePageHeader
        title={t('privacyPolicy')}
        subtitle={t('privacyPolicyDescription')}
      />

      <div className={'container mx-auto py-8'}>
        <div>Your terms of service content here</div>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;
