'use client';

import { useRouter } from 'next/navigation';

import { AccountSelector } from '@kit/accounts/account-selector';
import { useSidebar } from '@kit/ui/sidebar';

import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

const features = {
  enableTeamCreation: featureFlagsConfig.enableTeamCreation,
};

export function TeamAccountAccountsSelector(params: {
  selectedAccount: string;
  userId: string;

  accounts: Array<{
    label: string | null;
    value: string | null;
    image: string | null;
  }>;
}) {
  const router = useRouter();
  const ctx = useSidebar();

  return (
    <AccountSelector
      selectedAccount={params.selectedAccount}
      accounts={params.accounts}
      userId={params.userId}
      collapsed={!ctx?.open}
      features={features}
      showPersonalAccount={!featureFlagsConfig.enableTeamsOnly}
      onAccountChange={(value) => {
        if (!value && featureFlagsConfig.enableTeamsOnly) {
          return;
        }

        const path = value
          ? pathsConfig.app.accountHome.replace('[account]', value)
          : pathsConfig.app.home;

        router.replace(path);
      }}
    />
  );
}
