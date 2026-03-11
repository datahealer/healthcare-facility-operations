'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AbstractIntlMessages } from 'next-intl';

import { I18nClientProvider } from '@kit/i18n/provider';
import { Toaster } from '@kit/ui/sonner';

export function RootProviders(
  props: React.PropsWithChildren<{ messages: AbstractIntlMessages }>,
) {
  return (
    <I18nClientProvider locale="en" messages={props.messages}>
      <ReactQueryProvider>{props.children}</ReactQueryProvider>
    </I18nClientProvider>
  );
}

function ReactQueryProvider(props: React.PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}

      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
