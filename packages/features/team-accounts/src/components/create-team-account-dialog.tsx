'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Trans } from '@kit/ui/trans';

import { CreateTeamAccountForm } from './create-team-account-form';

export function CreateTeamAccountDialog(
  props: React.PropsWithChildren<{
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
  }>,
) {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={props.setIsOpen}
      disablePointerDismissal
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey={'teams.createTeamModalHeading'} />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey={'teams.createTeamModalDescription'} />
          </DialogDescription>
        </DialogHeader>

        <CreateTeamAccountForm onCancel={() => props.setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
