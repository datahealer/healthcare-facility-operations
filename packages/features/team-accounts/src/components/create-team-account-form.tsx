'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useForm, useWatch } from 'react-hook-form';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
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
import { Trans } from '@kit/ui/trans';

import {
  CreateTeamSchema,
  NON_LATIN_REGEX,
} from '../schema/create-team.schema';
import { createTeamAccountAction } from '../server/actions/create-team-account-server-actions';

export function CreateTeamAccountForm(props: {
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [error, setError] = useState<{ message?: string } | undefined>();

  const { execute, isPending } = useAction(createTeamAccountAction, {
    onExecute: () => {
      setError(undefined);
    },
    onSuccess: ({ data }) => {
      if (data?.error) {
        setError({ message: data.message });
      }
    },
    onError: () => {
      setError({});
    },
  });

  const form = useForm({
    defaultValues: {
      name: '',
      slug: '',
    },
    resolver: zodResolver(CreateTeamSchema),
  });

  const nameValue = useWatch({ control: form.control, name: 'name' });

  const showSlugField = NON_LATIN_REGEX.test(nameValue ?? '');

  return (
    <Form {...form}>
      <form
        data-test={'create-team-form'}
        onSubmit={form.handleSubmit((data) => execute(data))}
      >
        <div className={'flex flex-col space-y-4'}>
          <If condition={error}>
            <CreateTeamAccountErrorAlert message={error?.message} />
          </If>

          <FormField
            name={'name'}
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey={'teams.teamNameLabel'} />
                  </FormLabel>

                  <FormControl>
                    <Input
                      data-test={'team-name-input'}
                      required
                      minLength={2}
                      maxLength={50}
                      placeholder={''}
                      {...field}
                    />
                  </FormControl>

                  <FormDescription>
                    <Trans i18nKey={'teams.teamNameDescription'} />
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <If condition={showSlugField}>
            <FormField
              name={'slug'}
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'teams.teamSlugLabel'} />
                    </FormLabel>

                    <FormControl>
                      <Input
                        data-test={'team-slug-input'}
                        required
                        minLength={2}
                        maxLength={50}
                        placeholder={'my-team'}
                        {...field}
                      />
                    </FormControl>

                    <FormDescription>
                      <Trans i18nKey={'teams.teamSlugDescription'} />
                    </FormDescription>

                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </If>

          <div className={'flex justify-end space-x-2'}>
            <If condition={!!props.onCancel}>
              <Button
                variant={'outline'}
                type={'button'}
                disabled={isPending}
                onClick={props.onCancel}
              >
                <Trans i18nKey={'common.cancel'} />
              </Button>
            </If>

            <Button
              type="submit"
              data-test={'confirm-create-team-button'}
              disabled={isPending}
            >
              {isPending ? (
                <Trans i18nKey={'teams.creatingTeam'} />
              ) : (
                <Trans
                  i18nKey={props.submitLabel ?? 'teams.createTeamSubmitLabel'}
                />
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

function CreateTeamAccountErrorAlert(props: { message?: string }) {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans i18nKey={'teams.createTeamErrorHeading'} />
      </AlertTitle>

      <AlertDescription>
        {props.message ? (
          <Trans i18nKey={props.message} defaults={props.message} />
        ) : (
          <Trans i18nKey={'teams.createTeamErrorMessage'} />
        )}
      </AlertDescription>
    </Alert>
  );
}
