'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building, Link } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useForm, useWatch } from 'react-hook-form';

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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@kit/ui/input-group';
import { toast } from '@kit/ui/sonner';
import { Trans } from '@kit/ui/trans';

import { containsNonLatinCharacters } from '../../schema/create-team.schema';
import { TeamNameFormSchema } from '../../schema/update-team-name.schema';
import { updateTeamAccountName } from '../../server/actions/team-details-server-actions';

export const UpdateTeamAccountNameForm = (props: {
  account: {
    name: string;
    slug: string;
  };

  path: string;
}) => {
  const t = useTranslations('teams');

  const form = useForm({
    resolver: zodResolver(TeamNameFormSchema),
    defaultValues: {
      name: props.account.name,
      newSlug: '',
    },
  });

  const { execute, isPending } = useAction(updateTeamAccountName, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(t('updateTeamSuccessMessage'));
      } else if (data?.error) {
        toast.error(t(data.error));
      } else {
        toast.error(t('updateTeamErrorMessage'));
      }
    },
    onError: () => {
      toast.error(t('updateTeamErrorMessage'));
    },
  });

  const nameValue = useWatch({ control: form.control, name: 'name' });
  const showSlugField = containsNonLatinCharacters(nameValue || '');

  return (
    <div className={'space-y-8'}>
      <Form {...form}>
        <form
          data-test={'update-team-account-name-form'}
          className={'flex flex-col space-y-4'}
          onSubmit={form.handleSubmit((data) => {
            execute({
              slug: props.account.slug,
              name: data.name,
              newSlug: data.newSlug || undefined,
              path: props.path,
            });
          })}
        >
          <FormField
            name={'name'}
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey={'teams.teamNameLabel'} />
                  </FormLabel>

                  <FormControl>
                    <InputGroup className="dark:bg-background">
                      <InputGroupAddon align="inline-start">
                        <Building className="h-4 w-4" />
                      </InputGroupAddon>

                      <InputGroupInput
                        data-test={'team-name-input'}
                        required
                        placeholder={t('teamNameInputLabel')}
                        {...field}
                      />
                    </InputGroup>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <If condition={showSlugField}>
            <FormField
              name={'newSlug'}
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey={'teams.teamSlugLabel'} />
                    </FormLabel>

                    <FormControl>
                      <InputGroup className="dark:bg-background">
                        <InputGroupAddon align="inline-start">
                          <Link className="h-4 w-4" />
                        </InputGroupAddon>

                        <InputGroupInput
                          data-test={'team-slug-input'}
                          required
                          placeholder={'my-team'}
                          {...field}
                        />
                      </InputGroup>
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

          <div>
            <Button
              type="submit"
              className={'w-full md:w-auto'}
              data-test={'update-team-submit-button'}
              disabled={isPending}
            >
              <Trans i18nKey={'teams.updateTeamSubmitLabel'} />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
