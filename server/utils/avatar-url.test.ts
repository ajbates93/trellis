import { describe, it, expect } from "vitest";
import { convertAvatarUrl } from "./avatar-url";

describe("convertAvatarUrl", () => {
  it("converts a signed S3 URL to a proxy URL", () => {
    const signedUrl =
      "https://b1.eu-central-1.storage.railway.app/stocked-cart-ge-n6dzlrdis/avatars/9321621e-abcd-1234-5678-def012345678/d882e7bf-1234-5678-abcd-ef0123456789.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=cred&X-Amz-Date=20250101T000000Z&X-Amz-Expires=604800&X-Amz-Signature=abc123&X-Amz-SignedHeaders=host&x-id=GetObject";

    expect(convertAvatarUrl(signedUrl)).toBe(
      "/api/avatars/avatars/9321621e-abcd-1234-5678-def012345678/d882e7bf-1234-5678-abcd-ef0123456789.png"
    );
  });

  it("returns the same URL if already migrated", () => {
    const proxyUrl = "/api/avatars/avatars/user-id/image.png";
    expect(convertAvatarUrl(proxyUrl)).toBe(proxyUrl);
  });

  it("returns null for a URL without an avatars/ key", () => {
    expect(convertAvatarUrl("https://example.com/some-other-path.png")).toBeNull();
  });

  it("handles URLs with different image extensions", () => {
    const jpegUrl =
      "https://b1.eu-central-1.storage.railway.app/bucket/avatars/user1/photo.jpeg?X-Amz-Signature=xyz";

    expect(convertAvatarUrl(jpegUrl)).toBe(
      "/api/avatars/avatars/user1/photo.jpeg"
    );
  });

  it("handles URLs with different bucket names", () => {
    const url =
      "https://b1.eu-central-1.storage.railway.app/different-bucket-name/avatars/abc123/img.png?X-Amz-Expires=604800";

    expect(convertAvatarUrl(url)).toBe(
      "/api/avatars/avatars/abc123/img.png"
    );
  });

  it("strips query parameters from the key", () => {
    const url =
      "https://endpoint.com/bucket/avatars/uid/file.png?param1=a&param2=b";

    const result = convertAvatarUrl(url);
    expect(result).toBe("/api/avatars/avatars/uid/file.png");
    expect(result).not.toContain("?");
  });
});
