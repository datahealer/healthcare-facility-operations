'use server';

import { redirect } from 'next/navigation';

import { authActionClient } from '@kit/next/safe-action';
import { getLogger } from '@kit/shared/logger';

import { CreateTeamSchema } from '../../schema/create-team.schema';
import { createAccountCreationPolicyEvaluator } from '../policies';
import { createCreateTeamAccountService } from '../services/create-team-account.service';

export const createTeamAccountAction = authActionClient
  .schema(CreateTeamSchema)
  .action(async ({ parsedInput: { name, slug }, ctx: { user } }) => {
    const logger = await getLogger();
    const service = createCreateTeamAccountService();

    const ctx = {
      name: 'team-accounts.create',
      userId: user.id,
      accountName: name,
    };

    logger.info(ctx, `Creating team account...`);

    // Check policies before creating
    const evaluator = createAccountCreationPolicyEvaluator();

    if (await evaluator.hasPoliciesForStage('submission')) {
      const policyContext = {
        timestamp: new Date().toISOString(),
        userId: user.id,
        accountName: name,
      };

      const result = await evaluator.canCreateAccount(
        policyContext,
        'submission',
      );

      if (!result.allowed) {
        logger.warn(
          { ...ctx, reasons: result.reasons },
          `Policy denied team account creation`,
        );

        return {
          error: true,
          message: result.reasons[0] ?? 'Policy denied account creation',
        };
      }
    }

    const { data, error } = await service.createNewOrganizationAccount({
      name,
      userId: user.id,
      slug,
    });

    if (error === 'duplicate_slug') {
      return {
        error: true,
        message: 'teams.duplicateSlugError',
      };
    }

    logger.info(ctx, `Team account created`);

    const accountHomePath = '/home/' + data.slug;

    redirect(accountHomePath);
  });
