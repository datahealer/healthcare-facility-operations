import * as z from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';
import { SidebarNavigation } from '@kit/ui/sidebar-navigation';

export function TeamAccountLayoutSidebarNavigation({
  config,
}: React.PropsWithChildren<{
  config: z.output<typeof NavigationConfigSchema>;
}>) {
  return <SidebarNavigation config={config} />;
}
