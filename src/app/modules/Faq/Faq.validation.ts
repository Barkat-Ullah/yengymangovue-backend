import { z } from 'zod';

const createFaqZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    description: z.string({ required_error: 'Description is required' }),
  }),
});

const updateFaqZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const FaqValidation = {
  createFaqZodSchema,
  updateFaqZodSchema,
};
