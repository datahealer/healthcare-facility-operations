import Link from 'next/link';

import { getTranslations } from 'next-intl/server';

import { SignInMethodsContainer } from '@kit/auth/sign-in';
import { getSafeRedirectPath } from '@kit/shared/utils';
import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';

interface SignInPageProps {
  searchParams: Promise<{
    next?: string;
  }>;
}

export const generateMetadata = async () => {
  const t = await getTranslations('auth');

  return {
    title: t('signIn'),
  };
};

async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;

  const paths = {
    callback: pathsConfig.auth.callback,
    returnPath: getSafeRedirectPath(next, pathsConfig.app.home),
    joinTeam: pathsConfig.app.joinTeam,
  };

  return (
    <>
      <div className={'flex flex-col items-center gap-1'}>
        <Heading level={4} className={'tracking-tight'}>
          <Trans i18nKey={'auth.signInHeading'} />
        </Heading>

        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'auth.signInSubheading'} />
        </p>
      </div>

      <SignInMethodsContainer
        paths={paths}
        providers={authConfig.providers}
        captchaSiteKey={authConfig.captchaTokenSiteKey}
      />

      <div className={'flex justify-center'}>
        <Button
          nativeButton={false}
          variant={'link'}
          size={'sm'}
          render={
            <Link href={pathsConfig.auth.signUp} prefetch={true}>
              <Trans i18nKey={'auth.doNotHaveAccountYet'} />
            </Link>
          }
        />
      </div>
    </>
  );
}

export default SignInPage;
