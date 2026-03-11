import { Sidebar, SidebarContent, SidebarHeader } from '@kit/ui/sidebar';
import { SidebarNavigation } from '@kit/ui/sidebar-navigation';

import { WorkspaceDropdown } from '~/components/workspace-dropdown';
import { personalAccountNavigationConfig } from '~/config/personal-account-navigation.config';
import { UserNotifications } from '~/home/(user)/_components/user-notifications';

// home imports
import type { UserWorkspace } from '../_lib/server/load-user-workspace';

interface HomeSidebarProps {
  workspace: UserWorkspace;
}

export function HomeSidebar(props: HomeSidebarProps) {
  const { workspace, user, accounts } = props.workspace;
  const collapsible = personalAccountNavigationConfig.sidebarCollapsedStyle;

  return (
    <Sidebar variant="floating" collapsible={collapsible}>
      <SidebarHeader className={'h-16 justify-center'}>
        <div className={'flex items-center justify-between gap-x-3'}>
          <WorkspaceDropdown
            user={user}
            accounts={accounts}
            workspace={workspace}
          />

          <div className={'group-data-[collapsible=icon]:hidden'}>
            <UserNotifications userId={user.id} />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavigation config={personalAccountNavigationConfig} />
      </SidebarContent>
    </Sidebar>
  );
}
