import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

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

  /**
   * Upload image to S3 with optimization
   */
  async uploadMealImage(file: Express.Multer.File): Promise<string> {
    // Validate file
    this.validateImage(file);

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `meals/${uuidv4()}.${fileExtension}`;

    try {
      // Optimize image before upload
      const optimizedBuffer = await this.optimizeImage(file.buffer);

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: optimizedBuffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Make publicly accessible
        CacheControl: 'max-age=31536000', // Cache for 1 year
      });

      await this.s3Client.send(command);

      // Return public URL
      const imageUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
      return imageUrl;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new BadRequestException('Failed to upload image to S3');
    }
  }

  /**
   * Delete image from S3
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const key = this.extractKeyFromUrl(imageUrl);

      if (!key) return;

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      // Don't throw error on delete failure
    }
  }

  /**
   * Optimize image before upload
   */
  private async optimizeImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer();
  }

  /**
   * Validate uploaded image
   */
  private validateImage(file: Express.Multer.File): void {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Image size must be less than 5MB');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }
  }

  /**
   * Extract S3 key from URL
   */
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
