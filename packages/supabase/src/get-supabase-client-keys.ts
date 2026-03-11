import * as z from 'zod';

/**
 * Returns and validates the Supabase client keys from the environment.
 */
export function getSupabaseClientKeys() {
  return z
    .object({
      url: z.string({
        error: `Please provide the variable NEXT_PUBLIC_SUPABASE_URL`,
      }),
      publicKey: z.string({
        error: `Please provide the variable NEXT_PUBLIC_SUPABASE_PUBLIC_KEY`,
      }),
    })
    .parse({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      publicKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY,
    });
}
