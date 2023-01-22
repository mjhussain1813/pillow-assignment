import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
const { redisClient, connectRedis } = require('./redis')

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  connectRedis()
  await app.listen(3000);
}
bootstrap();
