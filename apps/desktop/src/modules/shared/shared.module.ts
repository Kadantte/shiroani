import { Global, Module } from '@nestjs/common';

/**
 * SharedModule provides cross-cutting concerns available to all modules.
 * Marked as @Global() so imports are not needed in each domain module.
 */
@Global()
@Module({
  providers: [],
  exports: [],
})
export class SharedModule {}
