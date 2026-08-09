import * as Joi from 'joi';

/**
 * Validated at boot (ConfigModule). A missing/invalid var fails startup fast
 * instead of surfacing as a confusing runtime error later.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.number().positive().default(900),
  REFRESH_TTL: Joi.number().positive().default(604800),

  // Comma-separated list of allowed origins (empty = no cross-origin).
  CORS_ORIGINS: Joi.string().allow('').default(''),

  // Rate limiting (per IP): THROTTLE_LIMIT requests per THROTTLE_TTL seconds.
  THROTTLE_TTL: Joi.number().positive().default(60),
  THROTTLE_LIMIT: Joi.number().positive().default(100),
});
