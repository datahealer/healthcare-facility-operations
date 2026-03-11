'use client';

import { useAction } from 'next-safe-action/hooks';

import { BillingPortalCard } from '@kit/billing-gateway/components';

import { createPersonalAccountBillingPortalSession } from '../_lib/server/server-actions';

export function PersonalBillingPortalForm() {
  const { execute } = useAction(createPersonalAccountBillingPortalSession);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        execute();
      }}
    >
      <BillingPortalCard />
    </form>
  );
}
