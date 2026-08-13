import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "NOT_FOUND",
  "RATE_LIMITED",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
