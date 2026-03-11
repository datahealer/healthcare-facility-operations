'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
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
import { Input } from '@kit/ui/input';
import { toast } from '@kit/ui/sonner';

import { resetPasswordAction } from '../lib/server/admin-server-actions';

const FormSchema = z.object({
  userId: z.string().uuid(),
  confirmation: z.custom<string>((value) => value === 'CONFIRM'),
});

export function AdminResetPasswordDialog(
  props: React.PropsWithChildren<{
    userId: string;
  }>,
) {
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userId: props.userId,
      confirmation: '',
    },
  });

  const { execute, isPending, hasErrored, hasSucceeded } = useAction(
    resetPasswordAction,
    {
      onSuccess: () => {
        form.reset({ userId: props.userId, confirmation: '' });
        toast.success('Password reset email successfully sent');
      },
      onError: () => {
        toast.error('We hit an error. Please read the logs.');
      },
    },
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger render={props.children as React.ReactElement} />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send a Reset Password Email</AlertDialogTitle>

          <AlertDialogDescription>
            Do you want to send a reset password email to this user?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="relative">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => execute(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="confirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmation</FormLabel>

                    <FormDescription>
                      Type CONFIRM to execute this request.
                    </FormDescription>

                    <FormControl>
                      <Input
                        placeholder="CONFIRM"
                        {...field}
                        autoComplete="off"
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <If condition={hasErrored}>
                <Alert variant="destructive">
                  <AlertTitle>
                    We encountered an error while sending the email
                  </AlertTitle>

                  <AlertDescription>
                    Please check the server logs for more details.
                  </AlertDescription>
                </Alert>
              </If>

              <If condition={hasSucceeded}>
                <Alert>
                  <AlertTitle>
                    Password reset email sent successfully
                  </AlertTitle>

                  <AlertDescription>
                    The password reset email has been sent to the user.
                  </AlertDescription>
                </Alert>
              </If>

              <input type="hidden" name="userId" value={props.userId} />

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Cancel
                </AlertDialogCancel>

                <Button
                  type="submit"
                  disabled={isPending}
                  variant="destructive"
                >
                  {isPending ? 'Sending...' : 'Send Reset Email'}
                </Button>
              </AlertDialogFooter>
            </form>
          </Form>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
