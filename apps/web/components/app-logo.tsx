import Link from 'next/link';

import { cn } from '@kit/ui/utils';

function LogoImage({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7 lg:h-8 lg:w-8"
      >
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M16 6C15.4477 6 15 6.44772 15 7V14H8C7.44772 14 7 14.4477 7 15V17C7 17.5523 7.44772 18 8 18H15V25C15 25.5523 15.4477 26 16 26H17C17.5523 26 18 25.5523 18 25V18H25C25.5523 18 26 17.5523 26 17V15C26 14.4477 25.5523 14 25 14H18V7C18 6.44772 17.5523 6 17 6H16Z"
          fill="white"
        />
      </svg>
      <span className="text-foreground text-lg font-bold tracking-tight lg:text-xl">
        HealthOps
      </span>
    </div>
  );
}

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  if (href === null) {
    return <LogoImage className={className} />;
  }

  return (
    <Link aria-label={label ?? 'Home Page'} href={href ?? '/'} prefetch={true}>
      <LogoImage className={className} />
    </Link>
  );
}
