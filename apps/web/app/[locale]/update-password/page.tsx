import { redirect } from 'next/navigation';

import { getTranslations } from 'next-intl/server';

import { UpdatePasswordForm } from '@kit/auth/password-reset';
import { AuthLayoutShell } from '@kit/auth/shared';
import { getSafeRedirectPath } from '@kit/shared/utils';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { AppLogo } from '~/components/app-logo';
import pathsConfig from '~/config/paths.config';

export const generateMetadata = async () => {
  const t = await getTranslations('auth');

  return {
    title: t('updatePassword'),
  };
};

const Logo = () => <AppLogo href={''} />;

interface UpdatePasswordPageProps {
  searchParams: Promise<{
    callback?: string;
  }>;
}

async function UpdatePasswordPage(props: UpdatePasswordPageProps) {
  const client = getSupabaseServerClient();

  const result = await requireUser(client, {
    next: pathsConfig.auth.passwordUpdate,
  });

  if (result.error) {
    return redirect(result.redirectTo);
  }

  const { callback } = await props.searchParams;
  const redirectTo = getSafeRedirectPath(callback, pathsConfig.app.home);

  return (
    <AuthLayoutShell Logo={Logo}>
      <UpdatePasswordForm redirectTo={redirectTo} />
    </AuthLayoutShell>
  );
}

export default UpdatePasswordPage;
