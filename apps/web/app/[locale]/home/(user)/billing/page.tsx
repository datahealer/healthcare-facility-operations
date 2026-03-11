import { getTranslations } from 'next-intl/server';

import { resolveProductPlan } from '@kit/billing-gateway';
import {
  CurrentLifetimeOrderCard,
  CurrentSubscriptionCard,
} from '@kit/billing-gateway/components';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { If } from '@kit/ui/if';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import billingConfig from '~/config/billing.config';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

// local imports
import { HomeLayoutPageHeader } from '../_components/home-page-header';
import { PersonalAccountCheckoutForm } from './_components/personal-account-checkout-form';
import { PersonalBillingPortalForm } from './_components/personal-billing-portal-form';
import { loadPersonalAccountBillingPageData } from './_lib/server/personal-account-billing-page.loader';

export const generateMetadata = async () => {
  const t = await getTranslations('account');
  const title = t('billingTab');

  return {
    title,
  };
};

async function PersonalAccountBillingPage() {
  const user = await requireUserInServerComponent();

  const [subscription, order, customerId] =
    await loadPersonalAccountBillingPageData(user.id);

  const subscriptionVariantId = subscription?.items[0]?.variant_id;
  const orderVariantId = order?.items[0]?.variant_id;

  const subscriptionProductPlan =
    subscription && subscriptionVariantId
      ? await resolveProductPlan(
          billingConfig,
          subscriptionVariantId,
          subscription.currency,
        )
      : undefined;

  const orderProductPlan =
    order && orderVariantId
      ? await resolveProductPlan(billingConfig, orderVariantId, order.currency)
      : undefined;

  const hasBillingData = subscription || order;

  return (
    <PageBody>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'common.routes.billing'} />}
        description={<AppBreadcrumbs />}
      />

      <div className={'flex max-w-2xl flex-col space-y-4'}>
        <If
          condition={hasBillingData}
          fallback={
            <>
              <PersonalAccountCheckoutForm customerId={customerId} />
            </>
          }
        >
          <div className={'flex w-full flex-col space-y-6'}>
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
          </div>
        </If>

        <If condition={customerId}>{() => <PersonalBillingPortalForm />}</If>
      </div>
    </PageBody>
  );
}

export default PersonalAccountBillingPage;
