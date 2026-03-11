import { redirect } from 'next/navigation';

import { getTranslations } from 'next-intl/server';

import { MultiFactorChallengeContainer } from '@kit/auth/mfa';
import { getSafeRedirectPath } from '@kit/shared/utils';
import { checkRequiresMultiFactorAuthentication } from '@kit/supabase/check-requires-mfa';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

interface Props {
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

async function VerifyPage(props: Props) {
  const client = getSupabaseServerClient();

  const { data } = await client.auth.getClaims();

  if (!data?.claims) {
    redirect(pathsConfig.auth.signIn);
  }

  const needsMfa = await checkRequiresMultiFactorAuthentication(client);

  if (!needsMfa) {
    redirect(pathsConfig.auth.signIn);
  }

  const nextPath = (await props.searchParams).next;
  const redirectPath = getSafeRedirectPath(nextPath, pathsConfig.app.home);

  return (
    <MultiFactorChallengeContainer
      userId={data.claims.sub}
      paths={{
        redirectPath,
      }}
    />
  );
}

export default VerifyPage;
