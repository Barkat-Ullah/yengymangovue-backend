import { z } from "zod";

const updateEmailSettings = z.object({
    body: z.object({
        scheduleEntry: z.boolean().optional(),
        reschedule: z.boolean().optional(),
        message: z.boolean().optional(),
        connectionRequest: z.boolean().optional(),
        businessCardRequest: z.boolean().optional(),
    })
})

export const notificationValidation = {
    updateEmailSettings
}