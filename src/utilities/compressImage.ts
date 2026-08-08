'use client'

import { MAX_IMAGE_DIMENSION, MAX_IMAGE_UPLOAD_BYTES } from '@/utilities/uploadLimits'

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image. Try a JPG or PNG.'))
    }
    img.src = url
  })
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Could not compress image.'))
        else resolve(blob)
      },
      type,
      quality,
    )
  })
}

/**
 * Resize + compress an image on the client so the Server Action body
 * stays under Vercel's ~4.5 MB function limit.
 *
 * Canvas re-encoding always drops EXIF/metadata. Files already under the
 * size budget are left untouched so the server can preserve metadata.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  // Under budget → keep original bytes (and EXIF/GPS/etc.) for server processing
  if (file.size <= MAX_IMAGE_UPLOAD_BYTES) {
    return file
  }

  const img = await loadImage(file)
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  const type = 'image/webp'
  const ext = 'webp'
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'upload'

  let quality = 0.82
  let blob = await canvasToBlob(canvas, type, quality)

  while (blob.size > MAX_IMAGE_UPLOAD_BYTES && quality > 0.4) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, type, quality)
  }

  // Still too large — shrink dimensions further
  let shrink = 0.85
  while (blob.size > MAX_IMAGE_UPLOAD_BYTES && shrink > 0.35) {
    const w = Math.max(1, Math.round(width * shrink))
    const h = Math.max(1, Math.round(height * shrink))
    canvas.width = w
    canvas.height = h
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    blob = await canvasToBlob(canvas, type, Math.max(quality, 0.5))
    shrink -= 0.1
  }

  if (blob.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error('Image is still too large after compression. Try a smaller photo.')
  }

  return new File([blob], `${baseName}.${ext}`, { type, lastModified: Date.now() })
}

export async function prepareEntryImage(formData: FormData, fieldName = 'image'): Promise<void> {
  const image = formData.get(fieldName)
  if (!(image instanceof File) || image.size === 0) return

  const compressed = await compressImageForUpload(image)
  formData.set(fieldName, compressed)
}

/** Compress every non-empty File under `fieldName` (supports multi-file inputs). */
export async function prepareImages(formData: FormData, fieldName = 'images'): Promise<void> {
  const values = formData.getAll(fieldName)
  const files = values.filter((v): v is File => v instanceof File && v.size > 0)
  if (!files.length) return

  formData.delete(fieldName)
  for (const file of files) {
    const compressed = await compressImageForUpload(file)
    formData.append(fieldName, compressed)
  }
}

/** Compress a list of image Files for sequential upload. */
export async function compressImageFiles(files: File[]): Promise<File[]> {
  const result: File[] = []
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue
    result.push(await compressImageForUpload(file))
  }
  return result
}
