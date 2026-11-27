/** A photo earns ranking priority only when it is managed by our member-photo
 * storage. Provider avatars can be generated initials and are not evidence of
 * a member-supplied portrait. */
const NON_MEMBER_PHOTO_MARKERS = [
  '/default-member-', '/mystical-forest-spirit', '/purple-haze-chat',
  '/serene-woman', '/contemplative-portrait', '/placeholder',
  'placeholder-logo', 'generated-avatar', 'googleusercontent.com',
  'ui-avatars.com', 'avatar.vercel.sh', 'dicebear.com', 'initials'
] as const

export function hasEligibleMemberPhoto(value: unknown, uploadedByMember = false) {
  const image = String(value || '').trim().toLowerCase()
  const isManagedBlob = /^https:\/\/([a-z0-9-]+\.)*blob\.vercel-storage\.com\//.test(image)
  return Boolean(image) && (uploadedByMember || isManagedBlob) &&
    !NON_MEMBER_PHOTO_MARKERS.some(marker => image.includes(marker))
}

/** `column` is always a source-controlled SQL expression, never user input. */
export function eligibleMemberPhotoSql(column: string, uploadedByMemberSql = 'FALSE') {
  const normalized = `LOWER(COALESCE(${column}, ''))`
  return `(
    NULLIF(TRIM(${column}), '') IS NOT NULL
    AND (${uploadedByMemberSql} OR ${normalized} ~ '^https://([a-z0-9-]+\\.)*blob\\.vercel-storage\\.com/')
    AND ${NON_MEMBER_PHOTO_MARKERS.map(marker => `${normalized} NOT LIKE '%${marker}%'`).join('\n    AND ')}
  )`
}

export function memberPhotoRank(photo: unknown, adminStarred = false, uploadedByMember = false) {
  if (!hasEligibleMemberPhoto(photo, uploadedByMember)) return 0
  return adminStarred ? 2 : 1
}
