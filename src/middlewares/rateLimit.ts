import rateLimit from "express-rate-limit";

const jsonRateLimitMessage = {
  error: {
    message: "Too many requests, please try again later."
  }
} as const;

export const staffLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitMessage
});

export const publicMutationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitMessage
});

export const publicUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitMessage
});

export const petCareNewsletterRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonRateLimitMessage
});
