import { JWTUserData } from '@kit/supabase/types';
import { Header } from '@kit/ui/marketing';

import { AppLogo } from '~/components/app-logo';

import { SiteHeaderAccountSection } from './site-header-account-section';
import { SiteNavigation } from './site-navigation';

export function SiteHeader(props: { user?: JWTUserData | null }) {
  return (
    <Header
      logo={<AppLogo className="mx-auto sm:mx-0" href="/" />}
      navigation={<SiteNavigation />}
      actions={<SiteHeaderAccountSection user={props.user ?? null} />}
    />
  );
}
