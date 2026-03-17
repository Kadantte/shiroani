import { Catch, ExceptionFilter, ArgumentsHost, ForbiddenException } from '@nestjs/common';

/**
 * Exception filter to handle ForbiddenException from guards.
 * Guards already reply to the user when they deny access (e.g., cooldowns,
 * missing permissions), so we silently swallow the exception here to prevent
 * NestJS from logging it as an unhandled error.
 */
@Catch(ForbiddenException)
export class ForbiddenExceptionFilter implements ExceptionFilter {
  catch(_exception: ForbiddenException, _host: ArgumentsHost) {
    // Guard failures are already handled by the guard itself
    // We just suppress the exception here
    return;
  }
}
