import { ExecutionContext, Injectable, Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import {
  ThrottlerException,
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

@Injectable()
export class NewThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    console.log('Request');
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
      limit: 5,
    }),
  ],
})
export class AppModule {}
