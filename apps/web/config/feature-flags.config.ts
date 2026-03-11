import * as z from 'zod';

type LanguagePriority = 'user' | 'application';

const FeatureFlagsSchema = z.object({
  enableThemeToggle: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_THEME_TOGGLE',
  }),
  enableAccountDeletion: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_DELETION',
  }),
  enableTeamDeletion: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_DELETION',
  }),
  enableTeamAccounts: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS',
  }),
  enableTeamCreation: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_CREATION',
  }),
  enablePersonalAccountBilling: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING',
  }),
  enableTeamAccountBilling: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_BILLING',
  }),
  languagePriority: z
    .enum(['user', 'application'], {
      error: 'Provide the variable NEXT_PUBLIC_LANGUAGE_PRIORITY',
    })
    .default('application'),
  enableNotifications: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_NOTIFICATIONS',
  }),
  realtimeNotifications: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_REALTIME_NOTIFICATIONS',
  }),
  enableVersionUpdater: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_VERSION_UPDATER',
  }),
  enableTeamsOnly: z.boolean({
    error: 'Provide the variable NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_ONLY',
  }),
});

const featuresFlagConfig = FeatureFlagsSchema.parse({
  enableThemeToggle: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_THEME_TOGGLE,
    true,
  ),
  enableAccountDeletion: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_DELETION,
    false,
  ),
  enableTeamDeletion: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_DELETION,
    false,
  ),
  enableTeamAccounts: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS,
    true,
  ),
  enableTeamCreation: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_CREATION,
    true,
  ),
  enablePersonalAccountBilling: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING,
    false,
  ),
  enableTeamAccountBilling: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_BILLING,
    false,
  ),
  languagePriority: process.env
    .NEXT_PUBLIC_LANGUAGE_PRIORITY as LanguagePriority,
  enableNotifications: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS,
    true,
  ),
  realtimeNotifications: getBoolean(
    process.env.NEXT_PUBLIC_REALTIME_NOTIFICATIONS,
    false,
  ),
  enableVersionUpdater: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_VERSION_UPDATER,
    false,
  ),
  enableTeamsOnly: getBoolean(
    process.env.NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_ONLY,
    false,
  ),
} satisfies z.output<typeof FeatureFlagsSchema>);

export default featuresFlagConfig;

function getBoolean(value: unknown, defaultValue: boolean) {
  if (typeof value === 'string') {
    return value === 'true';
  }

  return defaultValue;
}
