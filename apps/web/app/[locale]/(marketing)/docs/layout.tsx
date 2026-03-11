import { getLocale } from 'next-intl/server';

import { SidebarProvider } from '@kit/ui/sidebar';

// local imports
import { DocsNavigation } from './_components/docs-navigation';
import { getDocs } from './_lib/server/docs.loader';
import { buildDocumentationTree } from './_lib/utils';

async function DocsLayout({ children }: React.PropsWithChildren) {
  const locale = await getLocale();
  const docs = await getDocs(locale);
  const tree = buildDocumentationTree(docs);

  return (
    <div className={'container h-[calc(100vh-56px)] overflow-y-hidden'}>
      <SidebarProvider
        className="lg:gap-x-6"
        style={{ '--sidebar-width': '17em' } as React.CSSProperties}
      >
        <HideFooterStyles />

        <DocsNavigation pages={tree} />

        {children}
      </SidebarProvider>
    </div>
  );
}

function HideFooterStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .site-footer {
            display: none;
          }
        `,
      }}
    />
  );
}

export default DocsLayout;
