import { z } from "zod";

const createFaqZodSchema = z.object({
  body: z.object({
  
    name: z.string({ required_error: "Name is required" }),
  }),
});

const updateFaqZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const FaqValidation = {
  createFaqZodSchema,
  updateFaqZodSchema,
};
