'use server';

import { revalidatePath } from 'next/cache';

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:url';
import { z } from 'zod';

const Schema = z.object({
  locale: z.string().min(1),
  namespace: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
});

/**
 * Update a translation value in the specified locale and namespace.
 * @param props
 */
export async function updateTranslationAction(props: z.infer<typeof Schema>) {
  // Validate the input
  const { locale, namespace, key, value } = Schema.parse(props);

  const root = resolve(process.cwd(), '..');
  const filePath = `${root}apps/web/public/locales/${locale}/${namespace}.json`;

  try {
    // Read the current translations file
    const translationsFile = readFileSync(filePath, 'utf8');
    const translations = JSON.parse(translationsFile) as Record<string, any>;

    // Update the nested key value
    const keys = key.split('.') as string[];
    let current = translations;

    // Navigate through nested objects until the second-to-last key
    for (let i = 0; i < keys.length - 1; i++) {
      const currentKey = keys[i] as string;

      if (!current[currentKey]) {
        current[currentKey] = {};
      }

      current = current[currentKey];
    }

    // Set the value at the final key
    const finalKey = keys[keys.length - 1] as string;
    current[finalKey] = value;

    // Write the updated translations back to the file
    writeFileSync(filePath, JSON.stringify(translations, null, 2), 'utf8');

    revalidatePath(`/translations`);

    return { success: true };
  } catch (error) {
    console.error('Failed to update translation:', error);
    throw new Error('Failed to update translation');
  }
}
