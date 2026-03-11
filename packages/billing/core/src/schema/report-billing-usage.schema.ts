import * as z from 'zod';

export const ReportBillingUsageSchema = z.object({
  id: z.string(),
  eventName: z.string().optional(),
  usage: z.object({
    quantity: z.number(),
    action: z.enum(['increment', 'set']).optional(),
  }),
});
