import { JWTUserData } from '@kit/supabase/types';
import { Sidebar, SidebarContent, SidebarHeader } from '@kit/ui/sidebar';

import type { AccountModel } from '~/components/workspace-dropdown';
import { WorkspaceDropdown } from '~/components/workspace-dropdown';
import { getTeamAccountSidebarConfig } from '~/config/team-account-navigation.config';
import { TeamAccountNotifications } from '~/home/[account]/_components/team-account-notifications';

import { TeamAccountLayoutSidebarNavigation } from './team-account-layout-sidebar-navigation';

export function TeamAccountLayoutSidebar(props: {
  account: string;
  accountId: string;
  accounts: AccountModel[];
  user: JWTUserData;
}) {
  const { account, accounts, user } = props;

  const config = getTeamAccountSidebarConfig(account);
  const collapsible = config.sidebarCollapsedStyle;

  return (
    <Sidebar variant="floating" collapsible={collapsible}>
      <SidebarHeader className={'h-16 justify-center'}>
        <div className={'flex items-center justify-between gap-x-1'}>
          <WorkspaceDropdown
            user={user}
            accounts={accounts}
            selectedAccount={account}
          />

          <div className={'group-data-[collapsible=icon]:hidden'}>
            <TeamAccountNotifications
              userId={user.id}
              accountId={props.accountId}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="h-[calc(100%-160px)] overflow-y-auto">
        <TeamAccountLayoutSidebarNavigation config={config} />
      </SidebarContent>
    </Sidebar>
  );
}
