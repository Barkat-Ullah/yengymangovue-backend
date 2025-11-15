import { z } from 'zod';

const SubscriptionTypeEnum = z.enum(['FREELY', 'MONTHLY', 'YEARLY']);

const createSubscriptionZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    price: z
      .number({ required_error: 'Price is required' })
      .nonnegative('Price cannot be negative'),
    discountPrice: z
      .number()
      .min(0, 'Discount price cannot be negative')
      .optional(),
    stripePriceId: z.string().optional(),
    stripeProductId: z.string().optional(),
    duration: SubscriptionTypeEnum,
    isActive: z.boolean().optional(),
    isDiscounted: z.boolean().optional(),
  }),
});

const updateSubscriptionZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    price: z.number().positive('Price must be a positive number').optional(),
    discountPrice: z.number().min(0).optional(),
    stripePriceId: z.string().optional(),
    stripeProductId: z.string().optional(),
    duration: SubscriptionTypeEnum.optional(),
    isActive: z.boolean().optional(),
    isDiscounted: z.boolean().optional(),
  }),
});

export const SubscriptionValidation = {
  createSubscriptionZodSchema,
  updateSubscriptionZodSchema,
};
