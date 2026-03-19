import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  if (context.getType() === 'http') {
    const request = context.switchToHttp().getRequest();
    return request.user;
  }

  if (context.getType() === 'ws') {
    const client = context.switchToWs().getClient();
    return client.data.user;
  }

  return null;
});
