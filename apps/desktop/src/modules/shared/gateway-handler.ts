import type { Logger } from '@shiroani/shared';
import { extractErrorMessage } from '@shiroani/shared';

/**
 * Shared utility for gateway request handlers that follow the common pattern:
 *   1. Log the action
 *   2. Execute the handler logic
 *   3. Return a default result with error on failure
 *
 * Eliminates boilerplate per handler across gateways.
 *
 * The handler returns the success result. On caught exceptions,
 * defaultResult is returned with the error message merged in.
 *
 * Type parameter TResponse must include an optional error field to ensure
 * the error paths produce well-typed results.
 */
export async function handleGatewayRequest<TResponse extends { error?: string }>(options: {
  logger: Logger;
  action: string;
  /** Default result merged with error on caught exception */
  defaultResult: NoInfer<Omit<TResponse, 'error'>>;
  handler: () => Promise<NoInfer<TResponse>>;
}): Promise<TResponse> {
  const { logger, action, defaultResult, handler } = options;
  logger.debug(`${action}`);
  try {
    return await handler();
  } catch (error) {
    const message = extractErrorMessage(error, 'Unknown error');
    logger.error(`Error ${action}:`, error);
    return { ...defaultResult, error: message } as TResponse;
  }
}
