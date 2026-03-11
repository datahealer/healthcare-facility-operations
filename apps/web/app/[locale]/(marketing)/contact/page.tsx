import { getTranslations } from 'next-intl/server';

import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

import { SitePageHeader } from '~/(marketing)/_components/site-page-header';
import { ContactForm } from '~/(marketing)/contact/_components/contact-form';

export async function generateMetadata() {
  const t = await getTranslations('marketing');

  return {
    title: t('contact'),
  };
}

async function ContactPage() {
  const t = await getTranslations('marketing');

  return (
    <div>
      <SitePageHeader title={t(`contact`)} subtitle={t(`contactDescription`)} />

      <div className={'container mx-auto'}>
        <div
          className={'flex flex-1 flex-col items-center justify-center py-8'}
        >
          <div
            className={
              'flex w-full max-w-lg flex-col space-y-4 rounded-lg border p-8'
            }
          >
            <div>
              <Heading level={3}>
                <Trans i18nKey={'marketing.contactHeading'} />
              </Heading>

              <p className={'text-muted-foreground'}>
                <Trans i18nKey={'marketing.contactSubheading'} />
              </p>
            </div>

            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
