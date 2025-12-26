import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3ImageUploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private config: ConfigService) {
    this.region = this.config.get('AWS_REGION', 'us-east-1');
    this.bucketName = this.config.get('AWS_S3_BUCKET', 'your-bucket-name');

    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be defined',
      );
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /* ===================== UPLOAD MEAL IMAGE ===================== */

  async uploadMealImage(file: Express.Multer.File): Promise<string> {
    this.validateImage(file);

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `meals/${uuidv4()}.${fileExtension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer, // ⬅️ raw upload
        ContentType: file.mimetype,
        // ACL: 'public-read',
        CacheControl: 'max-age=31536000',
      });

      await this.s3Client.send(command);

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new BadRequestException('Failed to upload image to S3');
    }
  }

  /* ===================== UPLOAD INGREDIENT IMAGE ===================== */

  async uploadIngredientImage(file: Express.Multer.File): Promise<string> {
    this.validateImage(file);

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `ingredients/${uuidv4()}.${fileExtension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer, // ⬅️ raw upload
        ContentType: file.mimetype,
        // ACL: 'public-read',
        CacheControl: 'max-age=31536000',
      });

      await this.s3Client.send(command);

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new BadRequestException('Failed to upload image to S3');
    }
  }


    async uploadHackImage(file: Express.Multer.File): Promise<string> {
    this.validateImage(file);

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `Hacks/${uuidv4()}.${fileExtension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer, // ⬅️ raw upload
        ContentType: file.mimetype,
        // ACL: 'public-read',
        CacheControl: 'max-age=31536000',
      });

      await this.s3Client.send(command);

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new BadRequestException('Failed to upload image to S3');
    }
  }

  /* ===================== DELETE IMAGE ===================== */

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(imageUrl);
      if (!key) return;

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
    }
  }

  /* ===================== VALIDATION ===================== */

  private validateImage(file: Express.Multer.File): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Image size must be less than 5MB');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }
  }

  /* ===================== HELPERS ===================== */

  private extractKeyFromUrl(url: string): string | null {
    try {
      const regex = new RegExp(
        `https://${this.bucketName}.s3.${this.region}.amazonaws.com/(.+)`,
      );
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
