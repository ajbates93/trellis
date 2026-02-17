/**
 * Convert a signed S3 avatar URL to a proxy URL path.
 *
 * @param url - The current avatar URL (signed S3 URL or already-migrated proxy path)
 * @returns The proxy URL path, or null if the URL can't be converted
 */
export function convertAvatarUrl(url: string): string | null {
  // Already migrated
  if (url.startsWith("/api/avatars/")) {
    return url;
  }

  // Extract the S3 key from the signed URL
  // URL format: https://endpoint/bucket/avatars/userId/uuid.png?X-Amz-Signature=...
  const match = url.match(/(avatars\/[^?]+)/);
  if (!match) {
    return null;
  }

  return `/api/avatars/${match[1]}`;
}
