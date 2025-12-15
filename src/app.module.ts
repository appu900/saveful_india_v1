import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infra/database/prisma.module';
import { SearchModule } from './modules/search/search.module';
import { RedisModule } from './infra/cache/redis.module';
import { RecipeModule } from './modules/recipe/recipe.module';
import { MealsModule } from './modules/meals/meals.module';
import { S3ImageUploadModule } from './modules/s3-image-uoload/s3-image-uoload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    RedisModule,
    SearchModule,
    RecipeModule,
    MealsModule,
    S3ImageUploadModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
