import { getTranslations } from 'next-intl/server';

import { ErrorPageContent } from '~/components/error-page-content';

export const generateMetadata = async () => {
  const t = await getTranslations('common');
  const title = t('notFound');

  return {
    title,
  };
};

const NotFoundPage = async () => {
  return (
    <div className={'flex h-screen flex-1 flex-col'}>
      <ErrorPageContent
        statusCode={'common.pageNotFoundHeading'}
        heading={'common.pageNotFound'}
        subtitle={'common.pageNotFoundSubHeading'}
      />
    </div>
  );
};

export default NotFoundPage;
