'use server';

import { redirect } from 'next/navigation';

import { authActionClient } from '@kit/next/safe-action';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import featureFlagsConfig from '~/config/feature-flags.config';

// billing imports
import {
  TeamBillingPortalSchema,
  TeamCheckoutSchema,
} from '../schema/team-billing.schema';
import { createTeamBillingService } from './team-billing.service';

/**
 * @name enabled
 * @description This feature flag is used to enable or disable team account billing.
 */
const enabled = featureFlagsConfig.enableTeamAccountBilling;

/**
 * @name createTeamAccountCheckoutSession
 * @description Creates a checkout session for a team account.
 */
export const createTeamAccountCheckoutSession = authActionClient
  .schema(TeamCheckoutSchema)
  .action(async ({ parsedInput: data }) => {
    if (!enabled) {
      throw new Error('Team account billing is not enabled');
    }

    const client = getSupabaseServerClient();
    const service = createTeamBillingService(client);

    return service.createCheckout(data);
  });

/**
 * @name createBillingPortalSession
 * @description Creates a Billing Session Portal and redirects the user to the
 * provider's hosted instance
 */
export const createBillingPortalSession = authActionClient
  .schema(TeamBillingPortalSchema)
  .action(async ({ parsedInput: params }) => {
    if (!enabled) {
      throw new Error('Team account billing is not enabled');
    }

    const client = getSupabaseServerClient();
    const service = createTeamBillingService(client);

    // get url to billing portal
    const url = await service.createBillingPortalSession(params);

    redirect(url);
  });
