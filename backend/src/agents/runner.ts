import { ValidationError } from './validators';

/**
 * Runs an agent attempt and, if its output fails a behavioural-rule check,
 * retries exactly once with the validation message fed back to the model so it
 * can correct itself. Non-validation errors (timeouts, transport) propagate.
 *
 * `fn` receives a corrective string to append to its user prompt ('' first time).
 */
export async function withCorrectiveRetry<T>(
  fn: (corrective: string) => Promise<T>,
): Promise<T> {
  try {
    return await fn('');
  } catch (err) {
    if (err instanceof ValidationError) {
      const corrective =
        `\n\nIMPORTANT: your previous answer was rejected — ${err.message} ` +
        `Correct it and call the function again, fully obeying every rule.`;
      return await fn(corrective);
    }
    throw err;
  }
}
