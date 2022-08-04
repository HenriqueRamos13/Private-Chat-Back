import {
  ExecutionContext,
  HttpException,
  Injectable,
  Module,
} from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Injectable()
export class NewThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Too many requests';

  protected getTracker(req: Record<string, any>): string {
    return req.ips.length ? req.ips[0] : req.ip;
  }

  throwThrottlingException(): void {
    throw new HttpException({ error: this.errorMessage }, 429);
  }

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const ip = client.conn.remoteAddress;
    const key = this.generateKey(context, ip);
    const ttls = await this.storageService.getRecord(key);

    if (ttls.length >= limit) {
      throw new ThrottlerException();
    }

    await this.storageService.addRecord(key, ttl);
    return true;
  }
}

@Module({
  imports: [
    ChatModule,
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 200,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: NewThrottlerGuard,
    },
  ],
})
export class AppModule {}
