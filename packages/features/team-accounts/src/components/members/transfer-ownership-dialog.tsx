'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useForm, useWatch } from 'react-hook-form';

import { VerifyOtpForm } from '@kit/otp/components';
import { useUser } from '@kit/supabase/hooks/use-user';
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
import { Form } from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { TransferOwnershipConfirmationSchema } from '../../schema/transfer-ownership-confirmation.schema';
import { transferOwnershipAction } from '../../server/actions/team-members-server-actions';

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  targetDisplayName,
  accountId,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  userId: string;
  targetDisplayName: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="teams.transferOwnership" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="teams.transferOwnershipDescription" />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <TransferOrganizationOwnershipForm
          accountId={accountId}
          userId={userId}
          targetDisplayName={targetDisplayName}
          onSuccess={() => onOpenChange(false)}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TransferOrganizationOwnershipForm({
  accountId,
  userId,
  targetDisplayName,
  onSuccess,
}: {
  userId: string;
  accountId: string;
  targetDisplayName: string;
  onSuccess: () => unknown;
}) {
  const { data: user } = useUser();

  const { execute, isPending, hasErrored } = useAction(
    transferOwnershipAction,
    {
      onSuccess: () => onSuccess(),
    },
  );

  const form = useForm({
    resolver: zodResolver(TransferOwnershipConfirmationSchema),
    defaultValues: {
      accountId,
      userId,
      otp: '',
    },
  });

  const { otp } = useWatch({ control: form.control });

  // If no OTP has been entered yet, show the OTP verification form
  if (!otp) {
    return (
      <div className="flex flex-col space-y-6">
        <VerifyOtpForm
          purpose={`transfer-team-ownership-${accountId}`}
          email={user?.email || ''}
          onSuccess={(otpValue) => {
            form.setValue('otp', otpValue, { shouldValidate: true });
          }}
          CancelButton={
            <AlertDialogCancel>
              <Trans i18nKey={'common.cancel'} />
            </AlertDialogCancel>
          }
          data-test="verify-otp-form"
        />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        className={'flex flex-col space-y-4 text-sm'}
        onSubmit={form.handleSubmit((data) => {
          execute(data);
        })}
      >
        <If condition={hasErrored}>
          <TransferOwnershipErrorAlert />
        </If>

        <div className="border-destructive rounded-md border p-4">
          <p className="text-destructive text-sm">
            <Trans
              i18nKey={'teams.transferOwnershipDisclaimer'}
              values={{
                member: targetDisplayName,
              }}
              components={{ b: <b /> }}
            />
          </p>
        </div>

        <input type="hidden" name="otp" value={otp} />

        <div>
          <p className={'text-muted-foreground'}>
            <Trans i18nKey={'common.modalConfirmationQuestion'} />
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans i18nKey={'common.cancel'} />
          </AlertDialogCancel>

          <Button
            type={'submit'}
            data-test={'confirm-transfer-ownership-button'}
            variant={'destructive'}
            disabled={isPending}
          >
            <If
              condition={isPending}
              fallback={<Trans i18nKey={'teams.transferOwnership'} />}
            >
              <Trans i18nKey={'teams.transferringOwnership'} />
            </If>
          </Button>
        </AlertDialogFooter>
      </form>
    </Form>
  );
}

function TransferOwnershipErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'teams.transferTeamErrorHeading'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'teams.transferTeamErrorMessage'} />
      </AlertDescription>
    </Alert>
  );
}
