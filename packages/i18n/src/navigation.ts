import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Creates navigation utilities for next-intl.
 * These utilities are locale-aware and automatically handle routing with locales.
 */
export const { Link, redirect, usePathname, useRouter, permanentRedirect } =
  createNavigation(routing);
