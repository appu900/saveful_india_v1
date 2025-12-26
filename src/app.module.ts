import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infra/database/prisma.module';
import { RedisModule } from './infra/cache/redis.module';
import { RecipeModule } from './modules/recipe/recipe.module';
import { S3ImageUploadModule } from './modules/s3-image-uoload/s3-image-uoload.module';
import { IngrediantsModule } from './modules/ingrediants/ingrediants.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    AdminModule,
    PrismaModule,
    RedisModule,
    RecipeModule,
    S3ImageUploadModule,
    IngrediantsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
