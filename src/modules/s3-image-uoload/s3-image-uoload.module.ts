import { Global, Module } from '@nestjs/common';
import { S3ImageUploadController } from './s3-image-uoload.controller';
import { S3ImageUploadService } from './s3-image-uoload.service';



@Global()
@Module({
  controllers: [S3ImageUploadController],
  providers: [S3ImageUploadService],
  exports:[S3ImageUploadService]
})
export class S3ImageUploadModule {}
