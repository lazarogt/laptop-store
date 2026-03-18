import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

const DEFAULT_IMAGE_QUALITY = 80;
const DEFAULT_THUMB_QUALITY = 70;
const DOWNLOAD_TIMEOUT_MS = 30_000;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveDir = (value, fallback) => {
  const base = value?.trim() || fallback;
  return path.isAbsolute(base) ? base : path.resolve(process.cwd(), base);
};

const uploadsDir = resolveDir(process.env.UPLOADS_DIR, 'uploads');
const imageQuality = clamp(parseInteger(process.env.IMAGE_QUALITY, DEFAULT_IMAGE_QUALITY), 1, 100);
const thumbQuality = clamp(parseInteger(process.env.IMAGE_THUMB_QUALITY, DEFAULT_THUMB_QUALITY), 1, 100);
const missingLogPath = path.resolve('reports/logs/missing-images.log');

const parseImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [value];
    }
  }
  return [];
};

const normalizeImageEntry = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'string') return { url: entry, thumb: null };
  if (typeof entry === 'object') {
    const url = typeof entry.url === 'string' ? entry.url : '';
    if (!url) return null;
    const thumb = typeof entry.thumb === 'string' ? entry.thumb : null;
    return { url, thumb };
  }
  return null;
};

const isRemoteUrl = (value) => /^https?:\/\//i.test(value);

const downloadImage = async (url) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: DOWNLOAD_TIMEOUT_MS,
    maxContentLength: 20 * 1024 * 1024,
  });
  return Buffer.from(response.data);
};

const ensureDirs = async () => {
  await fs.mkdir(path.join(uploadsDir, 'products'), { recursive: true });
  await fs.mkdir(path.dirname(missingLogPath), { recursive: true });
};

const processBuffer = async (buffer) => {
  const baseName = uuidv4();
  const productDir = path.join(uploadsDir, 'products');
  const outputPath = path.join(productDir, `${baseName}.webp`);
  const thumbPath = path.join(productDir, `${baseName}_thumb.webp`);

  await sharp(buffer)
    .rotate()
    .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: imageQuality })
    .toFile(outputPath);

  await sharp(buffer)
    .rotate()
    .resize(400, 300, { fit: 'cover' })
    .webp({ quality: thumbQuality })
    .toFile(thumbPath);

  return {
    url: `/uploads/products/${baseName}.webp`,
    thumb: `/uploads/products/${baseName}_thumb.webp`,
  };
};

const createPool = () => {
  const databaseUrl = process.env.DATABASE_URL;
  let parsedUrl = null;
  if (databaseUrl) {
    try {
      parsedUrl = new URL(databaseUrl);
    } catch {
      parsedUrl = null;
    }
  }

  const config = {
    host: process.env.DB_HOST ?? parsedUrl?.hostname,
    port: parseInteger(process.env.DB_PORT ?? parsedUrl?.port, 5432),
    user: process.env.DB_USER ?? parsedUrl?.username,
    password: process.env.DB_PASSWORD ?? parsedUrl?.password,
    database: process.env.DB_NAME ?? parsedUrl?.pathname.replace(/^\//, ''),
    max: parseInteger(process.env.DB_MAX, 5),
    connectionTimeoutMillis: 5_000,
  };

  if (!config.host || !config.user || !config.database) {
    throw new Error('Database configuration is incomplete. Define DB_HOST, DB_USER and DB_NAME (or DATABASE_URL).');
  }

  return new Pool(config);
};

const logMissing = async (url, reason) => {
  const line = `${new Date().toISOString()}\t${url}\t${reason}\n`;
  await fs.appendFile(missingLogPath, line, 'utf8');
};

const run = async () => {
  await ensureDirs();
  const pool = createPool();

  try {
    const result = await pool.query('SELECT id, images FROM products ORDER BY id;');
    let updatedCount = 0;

    for (const row of result.rows) {
      const images = parseImages(row.images);
      if (images.length === 0) continue;

      const newImages = [];
      let changed = false;

      for (const imageEntry of images) {
        const normalized = normalizeImageEntry(imageEntry);
        if (!normalized) continue;

        if (isRemoteUrl(normalized.url)) {
          try {
            const buffer = await downloadImage(normalized.url);
            const stored = await processBuffer(buffer);
            newImages.push(stored);
            changed = true;
          } catch (error) {
            const reason = error instanceof Error ? error.message : 'download_failed';
            await logMissing(normalized.url, reason);
            newImages.push(normalized);
          }
        } else {
          newImages.push(normalized);
        }
      }

      if (changed) {
        await pool.query('UPDATE products SET images = $2::jsonb WHERE id = $1;', [row.id, JSON.stringify(newImages)]);
        updatedCount += 1;
      }
    }

    console.log(`[migrate-images] Updated ${updatedCount} product(s).`);
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error('[migrate-images] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
