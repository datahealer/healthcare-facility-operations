'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { AlertDialogCancel } from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { RoleSchema } from '../../schema/update-member-role.schema';
import { updateMemberRoleAction } from '../../server/actions/team-members-server-actions';
import { MembershipRoleSelector } from './membership-role-selector';
import { RolesDataProvider } from './roles-data-provider';

type Role = string;

export function UpdateMemberRoleDialog({
  open,
  onOpenChange,
  userId,
  teamAccountId,
  userRole,
  userRoleHierarchy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  teamAccountId: string;
  userRole: Role;
  userRoleHierarchy: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey={'teams.updateMemberRoleModalHeading'} />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey={'teams.updateMemberRoleModalDescription'} />
          </DialogDescription>
        </DialogHeader>

        <RolesDataProvider maxRoleHierarchy={userRoleHierarchy}>
          {(data) => (
            <UpdateMemberForm
              userId={userId}
              teamAccountId={teamAccountId}
              userRole={userRole}
              roles={data}
              onSuccess={() => onOpenChange(false)}
            />
          )}
        </RolesDataProvider>
      </DialogContent>
    </Dialog>
  );
}

function UpdateMemberForm({
  userId,
  userRole,
  teamAccountId,
  roles,
  onSuccess,
}: React.PropsWithChildren<{
  userId: string;
  userRole: Role;
  teamAccountId: string;
  roles: Role[];
  onSuccess: () => unknown;
}>) {
  const t = useTranslations('teams');

  const { execute, isPending, hasErrored } = useAction(updateMemberRoleAction, {
    onSuccess: () => onSuccess(),
  });

  const form = useForm({
    resolver: zodResolver(
      RoleSchema.refine(
        (data) => {
          return data.role !== userRole;
        },
        {
          message: t(`roleMustBeDifferent`),
          path: ['role'],
        },
      ),
    ),
    reValidateMode: 'onChange',
    mode: 'onChange',
    defaultValues: {
      role: userRole,
    },
  });

  return (
    <Form {...form}>
      <form
        data-test={'update-member-role-form'}
        onSubmit={form.handleSubmit(({ role }) => {
          execute({
            accountId: teamAccountId,
            userId,
            role,
          });
        })}
        className={'flex w-full flex-col space-y-6'}
      >
        <If condition={hasErrored}>
          <UpdateRoleErrorAlert />
        </If>

        <FormField
          name={'role'}
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>{t('roleLabel')}</FormLabel>

                <FormControl>
                  <MembershipRoleSelector
                    triggerClassName={'w-full'}
                    roles={roles}
                    currentUserRole={userRole}
                    value={field.value}
                    onChange={(newRole) => {
                      if (newRole) {
                        form.setValue('role', newRole);
                      }
                    }}
                  />
                </FormControl>

                <FormDescription>{t('updateRoleDescription')}</FormDescription>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="flex justify-end gap-x-2">
          <AlertDialogCancel>
            <Trans i18nKey={'common.cancel'} />
          </AlertDialogCancel>

          <Button
            type="submit"
            data-test={'confirm-update-member-role'}
            disabled={isPending}
          >
            <Trans i18nKey={'teams.updateRoleSubmitLabel'} />
          </Button>
        </div>
      </form>
    </Form>
  );
}

function UpdateRoleErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'teams.updateRoleErrorHeading'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'teams.updateRoleErrorMessage'} />
      </AlertDescription>
    </Alert>
  );
}
