import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromFile } from 'file-type';
import { HttpError } from '../utils/httpError.js';

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_IMAGE_QUALITY = 80;
const DEFAULT_THUMB_QUALITY = 70;
const DEFAULT_MAX_FILES = 6;

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface StoredImage {
  url: string;
  thumb: string;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const resolveDir = (value: string | undefined, fallback: string): string => {
  const base = value?.trim() || fallback;
  return path.isAbsolute(base) ? base : path.resolve(process.cwd(), base);
};

const uploadsDir = resolveDir(process.env.UPLOADS_DIR, 'uploads');
const tempDir = resolveDir(process.env.UPLOADS_DIR_TMP || process.env.UPLOADS_TEMP_DIR, '/tmp/uploads');
const maxFileSize = parseNumber(process.env.IMAGE_MAX_SIZE, DEFAULT_MAX_SIZE_BYTES);
const imageQuality = clamp(parseNumber(process.env.IMAGE_QUALITY, DEFAULT_IMAGE_QUALITY), 1, 100);
const thumbQuality = clamp(parseNumber(process.env.IMAGE_THUMB_QUALITY, DEFAULT_THUMB_QUALITY), 1, 100);
const maxFiles = parseNumber(process.env.IMAGE_MAX_FILES, DEFAULT_MAX_FILES);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      fs.mkdirSync(tempDir, { recursive: true });
      cb(null, tempDir);
    } catch (error) {
      cb(error as Error, tempDir);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.upload';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploader = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new HttpError(415, 'Unsupported image type'));
      return;
    }
    cb(null, true);
  },
});

/** Multer middleware with consistent error normalization. */
export const uploadImages: RequestHandler = (req, res, next) => {
  uploader.array('images', maxFiles)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new HttpError(413, 'Image exceeds maximum size'));
        return;
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        next(new HttpError(400, 'Too many images'));
        return;
      }
    }

    if (err) {
      next(err);
      return;
    }

    next();
  });
};

/** Processes uploaded images into WebP originals + thumbnails and returns relative URLs. */
export const processAndStoreFiles = async (files: Express.Multer.File[]): Promise<StoredImage[]> => {
  if (!files || files.length === 0) {
    return [];
  }

  const productDir = path.join(uploadsDir, 'products');
  await fsPromises.mkdir(productDir, { recursive: true });

  const stored: StoredImage[] = [];

  for (const file of files) {
    const baseName = uuidv4();
    const outputPath = path.join(productDir, `${baseName}.webp`);
    const thumbPath = path.join(productDir, `${baseName}_thumb.webp`);

    try {
      const detectedType = await fileTypeFromFile(file.path);
      if (!detectedType || !allowedMimeTypes.has(detectedType.mime)) {
        throw new HttpError(400, 'Invalid image content');
      }

      await sharp(file.path)
        .rotate()
        .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: imageQuality })
        .toFile(outputPath);

      await sharp(file.path)
        .rotate()
        .resize(400, 300, { fit: 'cover' })
        .webp({ quality: thumbQuality })
        .toFile(thumbPath);

      stored.push({
        url: `/uploads/products/${baseName}.webp`,
        thumb: `/uploads/products/${baseName}_thumb.webp`,
      });
    } finally {
      await fsPromises.unlink(file.path).catch(() => undefined);
    }
  }

  return stored;
};
