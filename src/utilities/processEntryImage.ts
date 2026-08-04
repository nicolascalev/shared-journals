import sharp from 'sharp'

import { MAX_IMAGE_DIMENSION, MAX_IMAGE_UPLOAD_BYTES } from '@/utilities/uploadLimits'

export type ProcessedImage = {
  data: Buffer
  mimetype: string
  name: string
  size: number
}

/**
 * Server-side safety net: orient, resize, and recompress before storing to S3.
 * Client compression should already keep the request under Vercel's limit.
 */
export async function processEntryImage(
  input: Buffer,
  originalName?: string,
): Promise<ProcessedImage> {
  const baseName = (originalName || 'upload').replace(/\.[^.]+$/, '') || 'upload'

  let quality = 80
  let maxDim = MAX_IMAGE_DIMENSION
  let data = await sharp(input)
    .rotate()
    .resize({
      width: maxDim,
      height: maxDim,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer()

  while (data.length > MAX_IMAGE_UPLOAD_BYTES && (quality > 40 || maxDim > 800)) {
    if (quality > 40) quality -= 10
    else maxDim = Math.floor(maxDim * 0.85)

    data = await sharp(input)
      .rotate()
      .resize({
        width: maxDim,
        height: maxDim,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 })
      .toBuffer()
  }

  if (data.length > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error('Image is too large to upload. Try a smaller photo.')
  }

  return {
    data,
    mimetype: 'image/webp',
    name: `${baseName}.webp`,
    size: data.length,
  }
}
