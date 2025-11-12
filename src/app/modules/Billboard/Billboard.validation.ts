import { z } from 'zod';

const createBillboardZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
  }),
});

const updateBillboardZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
  }),
});

export const BillboardValidation = {
  createBillboardZodSchema,
  updateBillboardZodSchema,
};
