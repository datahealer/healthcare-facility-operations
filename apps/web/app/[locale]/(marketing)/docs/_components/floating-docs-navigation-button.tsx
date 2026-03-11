'use client';

import { Menu } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { useSidebar } from '@kit/ui/sidebar';

export function FloatingDocumentationNavigationButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      size="custom"
      variant="custom"
      className={
        'bg-primary fixed right-5 bottom-5 z-10 h-16! w-16! rounded-full! lg:hidden'
      }
      onClick={toggleSidebar}
    >
      <Menu className={'text-primary-foreground size-6'} />
    </Button>
  );
}
