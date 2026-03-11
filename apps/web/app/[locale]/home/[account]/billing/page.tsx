import { TriangleAlert } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { resolveProductPlan } from '@kit/billing-gateway';
import {
  CurrentLifetimeOrderCard,
  CurrentSubscriptionCard,
} from '@kit/billing-gateway/components';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { If } from '@kit/ui/if';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import billingConfig from '~/config/billing.config';

// local imports
import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { loadTeamAccountBillingPage } from '../_lib/server/team-account-billing-page.loader';
import { loadTeamWorkspace } from '../_lib/server/team-account-workspace.loader';
import { TeamAccountCheckoutForm } from './_components/team-account-checkout-form';
import { TeamBillingPortalForm } from './_components/team-billing-portal-form';

interface TeamAccountBillingPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const t = await getTranslations('teams');
  const title = t('billing.pageTitle');

  return {
    title,
  };
};

async function TeamAccountBillingPage({ params }: TeamAccountBillingPageProps) {
  const account = (await params).account;
  const workspace = await loadTeamWorkspace(account);
  const accountId = workspace.account.id;

  const [subscription, order, customerId] =
    await loadTeamAccountBillingPage(accountId);

  const variantId = subscription?.items[0]?.variant_id;
  const orderVariantId = order?.items[0]?.variant_id;

  const subscriptionProductPlan = variantId
    ? await resolveProductPlan(billingConfig, variantId, subscription.currency)
    : undefined;

  const orderProductPlan = orderVariantId
    ? await resolveProductPlan(billingConfig, orderVariantId, order.currency)
    : undefined;

  const hasBillingData = subscription || order;

  const canManageBilling =
    workspace.account.permissions.includes('billing.manage');

  const shouldShowBillingPortal = canManageBilling && customerId;

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common.routes.billing'} />}
        description={<AppBreadcrumbs />}
      />

      <div className={cn(`flex max-w-2xl flex-col space-y-4`)}>
        <If condition={!hasBillingData}>
          <If
            condition={canManageBilling}
            fallback={<CannotManageBillingAlert />}
          >
            <TeamAccountCheckoutForm
              customerId={customerId}
              accountId={accountId}
            />
          </If>
        </If>

        <If condition={subscription}>
          {(subscription) => {
            return (
              <CurrentSubscriptionCard
                subscription={subscription}
                product={subscriptionProductPlan!.product}
                plan={subscriptionProductPlan!.plan}
              />
            );
          }}
        </If>

        <If condition={order}>
          {(order) => {
            return (
              <CurrentLifetimeOrderCard
                order={order}
                product={orderProductPlan!.product}
                plan={orderProductPlan!.plan}
              />
            );
          }}
        </If>

        {shouldShowBillingPortal ? (
          <TeamBillingPortalForm accountId={accountId} slug={account} />
        ) : null}
      </div>
    </PageBody>
  );
}

export default TeamAccountBillingPage;

function CannotManageBillingAlert() {
  return (
    <Alert variant={'warning'}>
      <TriangleAlert className={'h-4'} />

      <AlertTitle>
        <Trans i18nKey={'billing.cannotManageBillingAlertTitle'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'billing.cannotManageBillingAlertDescription'} />
      </AlertDescription>
    </Alert>
  );
}
