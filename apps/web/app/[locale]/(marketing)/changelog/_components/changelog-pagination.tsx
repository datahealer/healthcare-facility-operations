import Link from 'next/link';

import { ArrowLeft, ArrowRight } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Trans } from '@kit/ui/trans';

interface ChangelogPaginationProps {
  currentPage: number;
  canGoToNextPage: boolean;
  canGoToPreviousPage: boolean;
}

export function ChangelogPagination({
  currentPage,
  canGoToNextPage,
  canGoToPreviousPage,
}: ChangelogPaginationProps) {
  const nextPage = currentPage + 1;
  const previousPage = currentPage - 1;

  return (
    <div className="flex justify-end gap-2">
      {canGoToPreviousPage && (
        <Button
          render={<Link href={`/changelog?page=${previousPage}`} />}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-3 w-3" />

          <span>
            <Trans i18nKey="marketing.changelogPaginationPrevious" />
          </span>
        </Button>
      )}

      {canGoToNextPage && (
        <Button
          render={<Link href={`/changelog?page=${nextPage}`} />}
          variant="outline"
          size="sm"
        >
          <span>
            <Trans i18nKey="marketing.changelogPaginationNext" />
          </span>
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
