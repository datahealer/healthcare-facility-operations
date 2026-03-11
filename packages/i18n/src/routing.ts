import { defineRouting } from 'next-intl/routing';

import { defaultLocale } from './default-locale';
import { locales } from './locales';

// Define the routing configuration for next-intl
export const routing = defineRouting({
  // All supported locales
  locales,

  // Default locale (no prefix in URL)
  defaultLocale,

  // Default locale has no prefix, other locales do
  // Example: /about (en), /es/about (es), /fr/about (fr)
  localePrefix: 'as-needed',

  // Enable automatic locale detection based on browser headers and cookies
  localeDetection: true,
});

// Export locale types for TypeScript
export type Locale = (typeof routing.locales)[number];
