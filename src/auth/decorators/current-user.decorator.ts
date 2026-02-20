import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: 'userId' | 'email' | undefined, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as { userId: string; email: string };
    if (data === 'userId') return user?.userId;
    if (data === 'email') return user?.email;
    return user?.userId;
  },
);
