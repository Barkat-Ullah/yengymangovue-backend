import { z } from "zod";

const createSecurityZodSchema = z.object({
  body: z.object({
  
    name: z.string({ required_error: "Name is required" }),
  }),
});

const updateSecurityZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const SecurityValidation = {
  createSecurityZodSchema,
  updateSecurityZodSchema,
};
