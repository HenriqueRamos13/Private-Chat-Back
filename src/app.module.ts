import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ChatModule,
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 200,
    }),
  ],
})
export class AppModule {}
