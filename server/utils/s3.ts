import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Get credentials from environment (try both naming conventions)
const accessKeyId = process.env.RAILWAY_ACCESS_KEY_ID || process.env.RAILWAY_ACCESS_KEY || "";
const secretAccessKey = process.env.RAILWAY_SECRET_ACCESS_KEY || "";
const region = process.env.RAILWAY_REGION || "eu-central-1";
const endpoint = process.env.RAILWAY_ENDPOINT_URL || "https://b1.eu-central-1.storage.railway.app";
const bucketName = process.env.RAILWAY_BUCKET_NAME || "stocked-cart-g5rjsroojp0r";

// Log environment variables (mask sensitive data)
console.log("S3 Configuration:");
console.log("  Region:", region);
console.log("  Endpoint:", endpoint);
console.log("  Bucket:", bucketName);
console.log("  Access Key ID:", accessKeyId ? `${accessKeyId.substring(0, 5)}...` : "NOT SET");
console.log("  Secret Access Key:", secretAccessKey ? "SET" : "NOT SET");

if (!accessKeyId || !secretAccessKey) {
  console.error("ERROR: Missing S3 credentials. Please set RAILWAY_ACCESS_KEY and RAILWAY_SECRET_ACCESS_KEY");
}

// Initialize S3 client with Railway bucket credentials
const s3Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

/**
 * Upload avatar image to Railway S3 bucket
 * @param base64Image - Base64 encoded image data (e.g., "data:image/png;base64,...")
 * @param userId - User ID for organizing uploads
 * @returns S3 URL of the uploaded image
 */
export async function uploadAvatarToS3(base64Image: string, userId: string): Promise<string> {
  try {
    console.log(`Uploading avatar for user: ${userId}`);

    // Extract base64 data (remove data:image/...;base64, prefix)
    const base64Data = base64Image.replace(/^data:image\/[^;]+;base64,/, "");

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Validate file size (500 KB max)
    const maxSize = 500 * 1024;
    if (buffer.length > maxSize) {
      throw new Error(`File size exceeds maximum of ${maxSize / 1024}KB`);
    }

    console.log(`File size: ${buffer.length} bytes`);

    // Generate unique filename
    const filename = `avatars/${userId}/${randomUUID()}.png`;

    // Determine MIME type from base64 header
    let mimeType = "image/png";
    if (base64Image.includes("jpeg")) {
      mimeType = "image/jpeg";
    } else if (base64Image.includes("webp")) {
      mimeType = "image/webp";
    } else if (base64Image.includes("gif")) {
      mimeType = "image/gif";
    }

    console.log(`Uploading to S3: ${filename} (${mimeType})`);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    console.log(`Successfully uploaded to S3`);

    // Generate a signed URL valid for 7 days
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: filename,
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 7 * 24 * 60 * 60 }); // 7 days

    console.log(`Signed URL generated (expires in 7 days)`);
    console.log(`Signed URL: ${signedUrl}`);
    return signedUrl;
  } catch (error) {
    console.error("Error uploading avatar to S3:", error);
    throw new Error("Failed to upload avatar");
  }
}
