import { cache } from 'react';

import type { Metadata } from 'next';

import { getLocale, getTranslations } from 'next-intl/server';

import { createCmsClient } from '@kit/cms';
import { getLogger } from '@kit/shared/logger';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { SitePageHeader } from '../_components/site-page-header';
import { ChangelogEntry } from './_components/changelog-entry';
import { ChangelogPagination } from './_components/changelog-pagination';

interface ChangelogPageProps {
  searchParams: Promise<{ page?: string }>;
}

const CHANGELOG_ENTRIES_PER_PAGE = 50;

export const generateMetadata = async (
  props: ChangelogPageProps,
): Promise<Metadata> => {
  const t = await getTranslations('marketing');
  const resolvedLanguage = await getLocale();
  const searchParams = await props.searchParams;
  const limit = CHANGELOG_ENTRIES_PER_PAGE;

  const page = searchParams.page ? parseInt(searchParams.page) : 0;
  const offset = page * limit;

  const { total } = await getContentItems(resolvedLanguage, limit, offset);

  return {
    title: t('changelog'),
    description: t('changelogSubtitle'),
    pagination: {
      previous: page > 0 ? `/changelog?page=${page - 1}` : undefined,
      next: offset + limit < total ? `/changelog?page=${page + 1}` : undefined,
    },
  };
};

const getContentItems = cache(
  async (language: string | undefined, limit: number, offset: number) => {
    const client = await createCmsClient();
    const logger = await getLogger();

    try {
      return await client.getContentItems({
        collection: 'changelog',
        limit,
        offset,
        content: false,
        language,
        sortBy: 'publishedAt',
        sortDirection: 'desc',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to load changelog entries');

      return { total: 0, items: [] };
    }
  },
);

async function ChangelogPage(props: ChangelogPageProps) {
  const t = await getTranslations('marketing');
  const language = await getLocale();
  const searchParams = await props.searchParams;

  const limit = CHANGELOG_ENTRIES_PER_PAGE;
  const page = searchParams.page ? parseInt(searchParams.page) : 0;
  const offset = page * limit;

  const { total, items: entries } = await getContentItems(
    language,
    limit,
    offset,
  );

  return (
    <>
      <SitePageHeader
        title={t('changelog')}
        subtitle={t('changelogSubtitle')}
      />

      <div className="container flex max-w-4xl flex-col space-y-12 py-12">
        <If
          condition={entries.length > 0}
          fallback={<Trans i18nKey="marketing.noChangelogEntries" />}
        >
          <div className="space-y-0">
            {entries.map((entry, index) => {
              return (
                <ChangelogEntry
                  key={entry.id}
                  entry={entry}
                  highlight={index === 0}
                />
              );
            })}
          </div>

          <ChangelogPagination
            currentPage={page}
            canGoToNextPage={offset + limit < total}
            canGoToPreviousPage={page > 0}
          />
        </If>
      </div>
    </>
  );
}

export default ChangelogPage;
