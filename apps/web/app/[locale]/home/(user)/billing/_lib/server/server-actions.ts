'use server';

import { redirect } from 'next/navigation';

import { authActionClient } from '@kit/next/safe-action';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import featureFlagsConfig from '~/config/feature-flags.config';

import { PersonalAccountCheckoutSchema } from '../schema/personal-account-checkout.schema';
import { createUserBillingService } from './user-billing.service';

/**
 * @name enabled
 * @description This feature flag is used to enable or disable personal account billing.
 */
const enabled = featureFlagsConfig.enablePersonalAccountBilling;

/**
 * @name createPersonalAccountCheckoutSession
 * @description Creates a checkout session for a personal account.
 */
export const createPersonalAccountCheckoutSession = authActionClient
  .schema(PersonalAccountCheckoutSchema)
  .action(async ({ parsedInput: data }) => {
    if (!enabled) {
      throw new Error('Personal account billing is not enabled');
    }

    const client = getSupabaseServerClient();
    const service = createUserBillingService(client);

    return await service.createCheckoutSession(data);
  });

/**
 * @name createPersonalAccountBillingPortalSession
 * @description Creates a billing Portal session for a personal account
 */
export const createPersonalAccountBillingPortalSession =
  authActionClient.action(async () => {
    if (!enabled) {
      throw new Error('Personal account billing is not enabled');
    }

    const client = getSupabaseServerClient();
    const service = createUserBillingService(client);

    // get url to billing portal
    const url = await service.createBillingPortalSession();

    redirect(url);
  });
