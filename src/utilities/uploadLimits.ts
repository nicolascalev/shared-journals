/** Vercel Functions request body limit (Hobby & Pro): 4.5 MB */
export const VERCEL_BODY_LIMIT_BYTES = Math.floor(4.5 * 1024 * 1024)

/** Next.js serverActions.bodySizeLimit — under Vercel, leave multipart headroom */
export const SERVER_ACTION_BODY_LIMIT = '4mb'

/** Target size for compressed entry images (fits under body limit with form fields) */
export const MAX_IMAGE_UPLOAD_BYTES = Math.floor(1.5 * 1024 * 1024)

export const MAX_IMAGE_DIMENSION = 1920
