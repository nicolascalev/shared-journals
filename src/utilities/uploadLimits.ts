/** Vercel Functions request body limit (Hobby & Pro): 4.5 MB */
export const VERCEL_BODY_LIMIT_BYTES = Math.floor(4.5 * 1024 * 1024)

/** Next.js serverActions.bodySizeLimit — under Vercel, leave multipart headroom */
export const SERVER_ACTION_BODY_LIMIT = '4mb'

/**
 * Target size for compressed entry images.
 * Keep under the 4mb Server Action body limit to leave room for multipart form fields.
 */
export const MAX_IMAGE_UPLOAD_BYTES = 3 * 1024 * 1024

export const MAX_IMAGE_DIMENSION = 1920
