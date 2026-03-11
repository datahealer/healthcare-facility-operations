'use client';

import { CreateTeamAccountForm } from '@kit/team-accounts/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

export function CreateFirstTeamForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans i18nKey={'teams.createFirstTeamHeading'} />
        </CardTitle>

        <CardDescription>
          <Trans i18nKey={'teams.createFirstTeamDescription'} />
        </CardDescription>
      </CardHeader>

      <CardContent>
        <CreateTeamAccountForm submitLabel={'teams.getStarted'} />
      </CardContent>
    </Card>
  );
}
