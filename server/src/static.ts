import fs from 'node:fs';
import path from 'node:path';
import express, { type Express, type RequestHandler } from 'express';
import logger from './logger.js';

const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

const shouldAttemptCompressedAsset = (requestPath: string): boolean =>
  requestPath !== '/' && /\.[a-z0-9]+$/i.test(requestPath) && !requestPath.endsWith('.html');

const setStaticCacheHeaders = (response: express.Response, filePath: string): void => {
  if (filePath.endsWith('.html')) {
    response.setHeader('Cache-Control', 'no-cache');
    return;
  }

  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
};

const createCompressedAssetMiddleware = (distPath: string): RequestHandler => {
  return (req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || !shouldAttemptCompressedAsset(req.path)) {
      next();
      return;
    }

    const safePath = path.normalize(req.path).replace(/^(\.\.[/\\])+/, '');
    const assetPath = path.join(distPath, safePath);

    if (!assetPath.startsWith(distPath)) {
      next();
      return;
    }

    const acceptedEncodings = req.header('accept-encoding') ?? '';
    const variants: Array<{ encoding: string; filePath: string }> = [];

    if (acceptedEncodings.includes('br')) {
      variants.push({ encoding: 'br', filePath: `${assetPath}.br` });
    }
    if (acceptedEncodings.includes('gzip')) {
      variants.push({ encoding: 'gzip', filePath: `${assetPath}.gz` });
    }

    for (const variant of variants) {
      if (!fs.existsSync(variant.filePath)) {
        continue;
      }

      res.setHeader('Content-Encoding', variant.encoding);
      res.setHeader('Vary', 'Accept-Encoding');
      res.type(path.extname(assetPath));
      setStaticCacheHeaders(res, assetPath);
      res.sendFile(variant.filePath);
      return;
    }

    next();
  };
};

/** Serves built frontend assets and SPA fallback in production. */
export const registerStaticAssets = (app: Express): void => {
  const distPath = path.resolve('dist/public');

  if (!fs.existsSync(distPath)) {
    logger.warn({ scope: 'static', distPath }, 'Frontend build directory not found; skipping static asset registration');
    return;
  }

  app.use(createCompressedAssetMiddleware(distPath));
  app.use(
    express.static(distPath, {
      index: false,
      maxAge: ONE_YEAR_MS,
      setHeaders: setStaticCacheHeaders,
    }),
  );

  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
};
