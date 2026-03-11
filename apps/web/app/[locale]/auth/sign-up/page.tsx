import Link from 'next/link';

import { getTranslations } from 'next-intl/server';

import { SignUpMethodsContainer } from '@kit/auth/sign-up';
import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';

export const generateMetadata = async () => {
  const t = await getTranslations('auth');

  return {
    title: t('signUp'),
  };
};

const paths = {
  callback: pathsConfig.auth.callback,
  appHome: pathsConfig.app.home,
};

async function SignUpPage() {
  return (
    <>
      <div className={'flex flex-col items-center gap-1'}>
        <Heading level={4} className={'tracking-tight'}>
          <Trans i18nKey={'auth.signUpHeading'} />
        </Heading>

        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'auth.signUpSubheading'} />
        </p>
      </div>

      <SignUpMethodsContainer
        providers={authConfig.providers}
        displayTermsCheckbox={authConfig.displayTermsCheckbox}
        paths={paths}
        captchaSiteKey={authConfig.captchaTokenSiteKey}
      />

      <div className={'flex justify-center'}>
        <Button
          render={
            <Link href={pathsConfig.auth.signIn} prefetch={true}>
              <Trans i18nKey={'auth.alreadyHaveAnAccount'} />
            </Link>
          }
          variant={'link'}
          size={'sm'}
          nativeButton={false}
        />
      </div>
    </>
  );
}

export default SignUpPage;
