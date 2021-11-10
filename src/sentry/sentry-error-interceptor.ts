import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Handlers } from '@sentry/node';
import { tap } from 'rxjs/operators';
import { SentryService } from '../sentry/sentry.service';

@Injectable()
export class SentryErrorInterceptor implements NestInterceptor {
  constructor(private readonly sentryService: SentryService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      tap({
        error: (exception) => {
          const { withScope, captureException } =
            this.sentryService.getSentry() || {};

          if (!withScope || !captureException) return;

          withScope((scope) => {
            const contextType = context.getType();

            if (contextType === 'http') {
              const data = Handlers.parseRequest(
                {} as any,
                context.switchToHttp().getRequest(),
                {},
              );

              scope.setExtra('http_req', data.request);

              if (data.extra) scope.setExtras(data.extra);
              if (data.user) scope.setUser(data.user);
            }

            if (contextType === 'rpc') {
              scope.setExtra('context_rpc', context.switchToRpc().getContext());
              scope.setExtra('data_rpc', context.switchToRpc().getData());
            }

            captureException(exception);
          });
        },
      }),
    );
  }
}
