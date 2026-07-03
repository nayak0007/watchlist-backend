import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Validation middleware factory.
 * Validates the request body against a Zod schema.
 *
 * Usage:
 *   router.post('/endpoint', validate(mySchema), handler);
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      next(error); // Pass to errorHandler (ZodError handling)
    }
  };
}

/**
 * Validation middleware for query parameters.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed;
      next();
    } catch (error) {
      next(error);
    }
  };
}
