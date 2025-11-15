import { z } from 'zod';
import { EventStatus } from '@prisma/client';

const createEventZodSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .min(1, 'Title cannot be empty'),
    description: z.string().optional(),
    date: z.string({ required_error: 'Date is required' }).refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Invalid date format'),
    time: z.string().optional(),
    location: z.string().optional(),
  }),
});

const updateEventZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title cannot be empty').optional(),
    description: z.string().optional(),
    date: z
      .string()
      .refine(val => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, 'Invalid date format')
      .optional(),
    time: z.string().optional(),
    location: z.string().optional(),
    status: z
      .enum([
        EventStatus.PENDING,
        EventStatus.APPROVED,
        EventStatus.CANCELLED,
        EventStatus.PAST,
      ])
      .optional(),
  }),
});

export const EventValidation = {
  createEventZodSchema,
  updateEventZodSchema,
};
