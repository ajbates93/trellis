import { z } from 'zod';
import type { H3Event } from 'h3';

/**
 * Validates request body against a Zod schema
 * Throws a 400 error with detailed validation error messages if validation fails
 *
 * @param event - H3 event
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated data
 *
 * @example
 * const body = await validateBody(event, CreateFeedbackRequestSchema);
 */
export async function validateBody<T extends z.ZodType>(
  event: H3Event,
  schema: T
): Promise<z.infer<T>> {
  const body = await readBody(event);

  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: 'Validation failed',
        data: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    throw error;
  }
}

/**
 * Validates response data against a Zod schema
 * Logs error details to console and throws a 500 error if validation fails
 *
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Validated data
 *
 * @example
 * const response = { success: true, feedback: newFeedback };
 * return validateResponse(response, CreateFeedbackResponseSchema);
 */
export function validateResponse<T extends z.ZodType>(
  data: unknown,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Log each error individually for better visibility
      console.error('❌ Response validation failed!');
      console.error('Number of errors:', error.errors.length);
      error.errors.forEach((err, index) => {
        console.error(`\nError ${index + 1}:`, {
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          expected: 'expected' in err ? err.expected : undefined,
          received: 'received' in err ? err.received : undefined,
        });
      });
      console.error('\nData being validated:', JSON.stringify(data, null, 2));
      throw createError({
        statusCode: 500,
        message: 'Internal server error: Invalid response shape',
      });
    }
    throw error;
  }
}

/**
 * Safely validates data using safeParse (returns result object instead of throwing)
 * Useful for optional validation or complex conditional logic
 *
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Object with success boolean and either data or error
 *
 * @example
 * const result = safeValidate(data, SomeSchema);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.log(result.error.errors);
 * }
 */
export function safeValidate<T extends z.ZodType>(
  data: unknown,
  schema: T
): z.SafeParseReturnType<z.infer<T>, z.infer<T>> {
  return schema.safeParse(data);
}

/**
 * Type guard to check if a value is a Zod validation error
 */
export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}
