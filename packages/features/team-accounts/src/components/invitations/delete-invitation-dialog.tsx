'use client';

import { useAction } from 'next-safe-action/hooks';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { deleteInvitationAction } from '../../server/actions/team-invitations-server-actions';

export function DeleteInvitationDialog({
  isOpen,
  setIsOpen,
  invitationId,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  invitationId: number;
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="teams.deleteInvitation" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="teams.deleteInvitationDialogDescription" />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <DeleteInvitationForm
          setIsOpen={setIsOpen}
          invitationId={invitationId}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteInvitationForm({
  invitationId,
  setIsOpen,
}: {
  invitationId: number;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const { execute, isPending, hasErrored } = useAction(deleteInvitationAction, {
    onSuccess: () => setIsOpen(false),
  });

  return (
    <form
      data-test={'delete-invitation-form'}
      onSubmit={(e) => {
        e.preventDefault();
        execute({ invitationId });
      }}
    >
      <div className={'flex flex-col space-y-6'}>
        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'common.modalConfirmationQuestion'} />
        </p>

        <If condition={hasErrored}>
          <RemoveInvitationErrorAlert />
        </If>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans i18nKey={'common.cancel'} />
          </AlertDialogCancel>

          <Button type={'submit'} variant={'destructive'} disabled={isPending}>
            <Trans i18nKey={'teams.deleteInvitation'} />
          </Button>
        </AlertDialogFooter>
      </div>
    </form>
  );
}

function RemoveInvitationErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'teams.deleteInvitationErrorTitle'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'teams.deleteInvitationErrorMessage'} />
      </AlertDescription>
    </Alert>
  );
}
